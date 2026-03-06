/**
 * @fileoverview Unified worker manager for coordinating all chemistry worker operations.
 * Manages three worker pools:
 *   - RDKit rendering workers   (rdkit.worker.js)         — SVG generation, structure extraction, cleaning
 *   - RDKit substructure workers (substructuresearch-rdkit-worker.js) — SMARTS search via RDKit
 *   - OCL substructure workers   (substructuresearch-ocl-worker.js)   — SMARTS search via OpenChemLib
 *
 * Every pool shares the same WorkerPool implementation: promise-based messaging,
 * load-balanced dispatch, automatic initialisation, and consistent error handling.
 */

// @ts-nocheck
import RDKitWorker from './rdkit.worker.js?worker';
import OCLSearchWorker from './substructuresearch-ocl-worker.js?worker';
import RDKitSearchWorker from './substructuresearch-rdkit-worker.js?worker';

const TRACE_PREFIX = '[Worker Manager]';

// ─── Pool sizes ──────────────────────────────────────────────────────────────
const RDKIT_RENDER_POOL_SIZE = 4;
const SUBSTRUCT_POOL_SIZE = 3;

// ─── Shared types ────────────────────────────────────────────────────────────
/**
 * @typedef {Object} WorkerTask
 * @property {number|string} id
 * @property {string} type
 * @property {any} payload
 * @property {Function} resolve
 * @property {Function} reject
 * @property {number} timeout
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Generic WorkerPool – reusable for any worker type
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class WorkerPool {
    /**
     * @param {string} name        – human-readable pool name (for logs)
     * @param {Function} WorkerCtor – Worker constructor (Vite ?worker import)
     * @param {number} poolSize
     * @param {Object} [options]
     * @param {boolean} [options.sendInitMessage=false] – whether to send an {type:'init'} message on creation
     * @param {'type-payload'|'flat'} [options.messageFormat='type-payload'] – message protocol used by the worker
     */
    constructor(name, WorkerCtor, poolSize, options = {}) {
        this.name = name;
        this.WorkerCtor = WorkerCtor;
        this.poolSize = poolSize;
        this.sendInitMessage = options.sendInitMessage ?? false;
        this.messageFormat = options.messageFormat ?? 'type-payload';

        /** @type {Worker[]} */
        this.workers = [];
        /** @type {Map<number|string, number>} messageId → workerIndex */
        this.messageToWorkerMap = new Map();
        /** @type {Map<number|string, WorkerTask>} */
        this.pendingMessages = new Map();
        this.messageIdCounter = 0;
        this.allInitialized = false;
        /** @type {Promise<void>|null} */
        this.initPromise = null;
    }

    // ── Initialisation ────────────────────────────────────────────────────

    /** @returns {Promise<void>} */
    async init() {
        if (this.allInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            console.debug(`${TRACE_PREFIX} [${this.name}] Creating pool with ${this.poolSize} workers…`);
            const promises = [];
            for (let i = 0; i < this.poolSize; i++) {
                promises.push(this._createWorker(i));
            }
            await Promise.all(promises);
            this.allInitialized = true;
            console.debug(`${TRACE_PREFIX} [${this.name}] Pool ready (${this.poolSize} workers)`);
        })();

        return this.initPromise;
    }

    /**
     * @param {number} idx
     * @returns {Promise<void>}
     * @private
     */
    _createWorker(idx) {
        return new Promise((resolve, reject) => {
            try {
                const worker = new this.WorkerCtor();

                worker.onmessage = (event) => {
                    this._handleMessage(event.data, idx);
                };
                worker.onerror = (error) => {
                    console.error(`${TRACE_PREFIX} [${this.name}] Worker ${idx} error:`, error);
                    this._handleWorkerError(idx, error);
                };

                this.workers[idx] = worker;

                if (this.sendInitMessage) {
                    this._postToWorker(idx, 'init', {}, resolve, reject);
                } else {
                    resolve();
                }
            } catch (error) {
                console.error(`${TRACE_PREFIX} [${this.name}] Error creating worker ${idx}:`, error);
                reject(error);
            }
        });
    }

    // ── Messaging ─────────────────────────────────────────────────────────

    /**
     * @param {number} idx
     * @param {string} type
     * @param {any} payload
     * @param {Function} [initResolve]
     * @param {Function} [initReject]
     * @returns {Promise<any>}
     * @private
     */
    _postToWorker(idx, type, payload, initResolve, initReject) {
        return new Promise((resolve, reject) => {
            const id = ++this.messageIdCounter;

            const createTimeout = (onTimeout) =>
                setTimeout(() => onTimeout(), 30000);

            if (type === 'init' && initResolve && initReject) {
                const timeoutId = createTimeout(() => {
                    initReject(new Error(`[${this.name}] Worker ${idx} init timeout`));
                });
                this.pendingMessages.set(id, {
                    id, type, payload,
                    resolve: () => { clearTimeout(timeoutId); initResolve(); },
                    reject: (e) => { clearTimeout(timeoutId); initReject(e); },
                    timeout: timeoutId,
                });
            } else {
                const timeoutId = createTimeout(() => {
                    if (this.pendingMessages.has(id)) {
                        this.pendingMessages.delete(id);
                        this.messageToWorkerMap.delete(id);
                        reject(new Error(`[${this.name}] Timeout for message type: ${type}`));
                    }
                });
                this.pendingMessages.set(id, {
                    id, type, payload, resolve, reject, timeout: timeoutId,
                });
            }

            this.messageToWorkerMap.set(id, idx);

            // Workers use different message shapes
            if (this.messageFormat === 'flat') {
                this.workers[idx].postMessage({ id, ...payload });
            } else {
                this.workers[idx].postMessage({ id, type, payload });
            }
        });
    }

    /** @returns {number} index of the least busy worker */
    _getLeastBusyWorker() {
        let minBusy = Infinity;
        let best = 0;
        for (let i = 0; i < this.workers.length; i++) {
            let busy = 0;
            for (const [, wIdx] of this.messageToWorkerMap) {
                if (wIdx === i) busy++;
            }
            if (busy < minBusy) { minBusy = busy; best = i; }
        }
        return best;
    }

    /**
     * @param {string} type
     * @param {any} payload
     * @returns {Promise<any>}
     * @private
     */
    _postMessage(type, payload) {
        return this._postToWorker(this._getLeastBusyWorker(), type, payload);
    }

    // ── Response handling ─────────────────────────────────────────────────

    /** @private */
    _handleWorkerError(idx, error) {
        const toReject = [];
        for (const [mid, wIdx] of this.messageToWorkerMap) {
            if (wIdx === idx) toReject.push(mid);
        }
        for (const mid of toReject) {
            const p = this.pendingMessages.get(mid);
            if (p) {
                clearTimeout(p.timeout);
                p.reject(error);
                this.pendingMessages.delete(mid);
                this.messageToWorkerMap.delete(mid);
            }
        }
    }

    /**
     * Handles responses from workers.
     * Supports both message formats:
     *  - type-payload: { id, type:'success'|'error', result, error }
     *  - flat:         { id, type:'success'|'error', data, error }
     * @private
     */
    _handleMessage(data, idx) {
        const { id, type } = data;

        // Ignore unsolicited "initialized" broadcasts
        if (type === 'initialized') return;

        const pending = this.pendingMessages.get(id);
        if (!pending) return;

        clearTimeout(pending.timeout);
        this.pendingMessages.delete(id);
        this.messageToWorkerMap.delete(id);

        if (type === 'success') {
            // type-payload workers use `result`, flat workers use `data`
            pending.resolve(data.result ?? data.data);
        } else if (type === 'error') {
            pending.reject(new Error(data.error || 'Worker error'));
        }
    }

    // ── Public API ────────────────────────────────────────────────────────

    /**
     * Send a message and get a promise-based response.
     * @param {string} type
     * @param {any} payload
     * @returns {Promise<any>}
     */
    async sendMessage(type, payload) {
        await this.init();
        return this._postMessage(type, payload);
    }

    /** Terminate every worker in this pool */
    terminate() {
        for (const [, p] of this.pendingMessages) {
            clearTimeout(p.timeout);
            p.reject(new Error(`[${this.name}] Pool terminated`));
        }
        this.pendingMessages.clear();
        this.messageToWorkerMap.clear();
        this.workers.forEach((w) => w?.terminate());
        this.workers = [];
        this.allInitialized = false;
        this.initPromise = null;
    }

    /** @returns {Object} */
    getStats() {
        const tasksByWorker = {};
        for (let i = 0; i < this.workers.length; i++) tasksByWorker[i] = 0;
        for (const [, wIdx] of this.messageToWorkerMap) tasksByWorker[wIdx]++;
        return {
            name: this.name,
            poolSize: this.poolSize,
            workersActive: this.workers.length,
            pendingTasks: this.pendingMessages.size,
            tasksByWorker,
        };
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Pool instances
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** RDKit rendering pool – SVG generation, structure extraction, molecule cleaning */
const rdkitRenderPool = new WorkerPool(
    'RDKit-Render', RDKitWorker, RDKIT_RENDER_POOL_SIZE,
    { sendInitMessage: true, messageFormat: 'type-payload' },
);

/** OCL substructure search pool */
const oclSearchPool = new WorkerPool(
    'OCL-Search', OCLSearchWorker, SUBSTRUCT_POOL_SIZE,
    { sendInitMessage: false, messageFormat: 'flat' },
);

/** RDKit substructure search pool */
const rdkitSearchPool = new WorkerPool(
    'RDKit-Search', RDKitSearchWorker, SUBSTRUCT_POOL_SIZE,
    { sendInitMessage: false, messageFormat: 'flat' },
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Public API – RDKit rendering (backwards-compatible with existing `rdkitWorker`)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const rdkitWorker = {
    /** @returns {Promise<void>} */
    init: () => rdkitRenderPool.init(),

    /**
     * @param {string} type
     * @param {any} payload
     * @returns {Promise<any>}
     */
    sendMessage: (type, payload) => rdkitRenderPool.sendMessage(type, payload),

    /**
     * Generate SVG for a molecule
     * @param {Object} params
     * @param {string} params.moleculeInput
     * @param {Object} [params.options]
     * @param {number} [params.width]
     * @param {number} [params.height]
     * @param {boolean} [params.showBondIndices]
     * @param {Map<string,any>} [params.annotations]
     * @param {Object} [params.reactiveBonds]
     * @param {{ definitions?: any[] }} [params.softspots]
     * @param {boolean} [params.needsHighlights] – if true, RDKit will include extra metadata for highlights (annotations, reactive bonds, softspots)
     * @param {Array<number>} [params.highlightAtoms]
     * @param {Array<number>} [params.highlightBonds]
     * @param {Array<number>} [params.highlightColor]
     * @returns {Promise<Object<string,any>}
     */
    generateSVG: (params) => rdkitRenderPool.sendMessage('generateSVG', params),

    /**
     * @param {string} moleculeInput
     * @param {string} queryInput
     * @returns {Promise<any>}
     */
    getSubstructMatch: (moleculeInput, queryInput) =>
        rdkitRenderPool.sendMessage('getSubstructMatch', { moleculeInput, queryInput }),

    /**
     * Extract structure definition including molecular properties (formula, masses, SMILES, molblock)
     * @param {string} definition - SMILES, molblock, or other supported format
     * @returns {Promise<{cleanMolblock: string, molblock: string, smiles: string, molecularFormula: string, masses: {monoisotopic: number, mostAbundantMonoisotopic: number, weightedMean: number}, elementalComposition: Object, isotopicDistribution: Object, sites: Object, annotations: Map, atoms: Array, bonds: Array}>}
     */
    extractStructureDefinition: (definition) =>
        rdkitRenderPool.sendMessage('extractStructure', { definition }),

    /**
     * @param {string} moleculeInput
     * @returns {Promise<{cleanMolblock: string, generated2D: boolean}>}
     */
    cleanMolecule: (moleculeInput) =>
        rdkitRenderPool.sendMessage('cleanMolecule', { moleculeInput }),

    terminate: () => rdkitRenderPool.terminate(),
    getStats: () => rdkitRenderPool.getStats(),
};

// Eagerly initialise the render pool
rdkitRenderPool.init().catch((error) => {
    console.error(`${TRACE_PREFIX} Failed to initialize RDKit render pool:`, error);
});

/**
 * Perform substructure search using the appropriate engine pool with load balancing.
 * @param {string|string[]} smarts  – SMARTS query string(s)
 * @param {string|string[]} smiles  – SMILES string(s) to search in
 * @param {'ocl'|'rdkit'} [engine='rdkit'] – Search engine to use
 * @param {boolean} [includeAtomBondIndices=false]
 * @returns {Promise<object>}
 */
export const performSubstructureSearchAsync = async (
    smarts, smiles, engine = 'rdkit', includeAtomBondIndices = false,
) => {
    const pool = engine === 'ocl' ? oclSearchPool : rdkitSearchPool;
    // The search workers use a flat message shape (no `type`/`payload` wrapper)
    return pool.sendMessage('search', { smarts, smiles, includeAtomBondIndices });
};

/**
 * Terminate substructure search workers.
 * @param {'ocl'|'rdkit'} [engine] – If omitted, terminates both pools
 */
export const terminateSubstructureSearchWorker = (engine) => {
    if (!engine || engine === 'ocl') oclSearchPool.terminate();
    if (!engine || engine === 'rdkit') rdkitSearchPool.terminate();
};

/**
 * Get substructure search pool statistics.
 * @returns {{ ocl: Object, rdkit: Object }}
 */
export const getWorkerPoolStats = () => ({
    ocl: oclSearchPool.getStats(),
    rdkit: rdkitSearchPool.getStats(),
});

/**
 * Terminate **all** worker pools (rendering + search).
 */
export const terminateAll = () => {
    rdkitRenderPool.terminate();
    oclSearchPool.terminate();
    rdkitSearchPool.terminate();
};