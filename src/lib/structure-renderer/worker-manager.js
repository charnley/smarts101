/**
 * @fileoverview Worker manager — pools for RDKit rendering and SMARTS search.
 * Easily extendable: add more pools or message types by following the WorkerPool pattern.
 */

// @ts-nocheck
import RDKitWorker from './worker/rdkit.worker.js?worker';
import RDKitSearchWorker from './worker/substructuresearch-rdkit-worker.js?worker';

// ── Pool sizes (tune as needed) ─────────────────────────────────────────────
const RENDER_POOL_SIZE = 2;
const SEARCH_POOL_SIZE = 2;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Generic WorkerPool
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class WorkerPool {
	/**
	 * @param {string} name
	 * @param {Function} WorkerCtor
	 * @param {number} size
	 * @param {{ sendInit?: boolean, format?: 'type-payload'|'flat' }} [opts]
	 */
	constructor(name, WorkerCtor, size, opts = {}) {
		this.name = name;
		this.WorkerCtor = WorkerCtor;
		this.size = size;
		this.sendInit = opts.sendInit ?? false;
		this.format = opts.format ?? 'type-payload';
		/** @type {Worker[]} */
		this.workers = [];
		/** @type {Map<number, number>} msgId → workerIdx */
		this.msgToWorker = new Map();
		/** @type {Map<number, { resolve: Function, reject: Function, timeout: any }>} */
		this.pending = new Map();
		this.counter = 0;
		this.ready = false;
		/** @type {Promise<void>|null} */
		this.initPromise = null;
	}

	async init() {
		if (this.ready) return;
		if (this.initPromise) return this.initPromise;
		this.initPromise = (async () => {
			await Promise.all(Array.from({ length: this.size }, (_, i) => this._spawn(i)));
			this.ready = true;
		})();
		return this.initPromise;
	}

	_spawn(idx) {
		return new Promise((resolve, reject) => {
			const w = new this.WorkerCtor();
			w.onmessage = (e) => this._recv(e.data, idx);
			w.onerror = (err) => this._fail(idx, err);
			this.workers[idx] = w;
			if (this.sendInit) {
				this._post(idx, 'init', {}, resolve, reject);
			} else {
				resolve();
			}
		});
	}

	_post(idx, type, payload, initResolve, initReject) {
		return new Promise((resolve, reject) => {
			const id = ++this.counter;
			const timeout = setTimeout(() => {
				if (this.pending.has(id)) {
					this.pending.delete(id);
					this.msgToWorker.delete(id);
					(initReject ?? reject)(new Error(`[${this.name}] Timeout: ${type}`));
				}
			}, 30000);

			this.pending.set(id, {
				resolve: initResolve
					? () => {
							clearTimeout(timeout);
							initResolve();
						}
					: (v) => {
							clearTimeout(timeout);
							resolve(v);
						},
				reject: initReject
					? (e) => {
							clearTimeout(timeout);
							initReject(e);
						}
					: (e) => {
							clearTimeout(timeout);
							reject(e);
						},
				timeout
			});
			this.msgToWorker.set(id, idx);

			if (this.format === 'flat') {
				this.workers[idx].postMessage({ id, ...payload });
			} else {
				this.workers[idx].postMessage({ id, type, payload });
			}
		});
	}

	_leastBusy() {
		let min = Infinity,
			best = 0;
		for (let i = 0; i < this.workers.length; i++) {
			let busy = 0;
			for (const [, wi] of this.msgToWorker) if (wi === i) busy++;
			if (busy < min) {
				min = busy;
				best = i;
			}
		}
		return best;
	}

	_recv(data, _idx) {
		const { id, type } = data;
		if (type === 'initialized') return;
		const p = this.pending.get(id);
		if (!p) return;
		this.pending.delete(id);
		this.msgToWorker.delete(id);
		if (type === 'success') p.resolve(data.result ?? data.data);
		else p.reject(new Error(data.error || 'Worker error'));
	}

	_fail(idx, err) {
		for (const [mid, wi] of this.msgToWorker) {
			if (wi === idx) {
				const p = this.pending.get(mid);
				if (p) {
					p.reject(err);
					this.pending.delete(mid);
					this.msgToWorker.delete(mid);
				}
			}
		}
	}

	async send(type, payload) {
		await this.init();
		return this._post(this._leastBusy(), type, payload);
	}

	terminate() {
		for (const [, p] of this.pending) {
			clearTimeout(p.timeout);
			p.reject(new Error('Terminated'));
		}
		this.pending.clear();
		this.msgToWorker.clear();
		this.workers.forEach((w) => w?.terminate());
		this.workers = [];
		this.ready = false;
		this.initPromise = null;
	}
}

// ── Pool instances ───────────────────────────────────────────────────────────

const renderPool = new WorkerPool('RDKit-Render', RDKitWorker, RENDER_POOL_SIZE, {
	sendInit: true,
	format: 'type-payload'
});

const searchPool = new WorkerPool('RDKit-Search', RDKitSearchWorker, SEARCH_POOL_SIZE, {
	sendInit: false,
	format: 'flat'
});

// Eagerly warm up the render pool
renderPool.init().catch((e) => console.error('[WorkerManager] Render pool init failed:', e));

// ── Public API ───────────────────────────────────────────────────────────────

/** RDKit render worker facade */
export const rdkitWorker = {
	init: () => renderPool.init(),
	/** @param {Object} params */
	generateSVG: (params) => renderPool.send('generateSVG', params),
	/** @param {string} definition */
	extractStructureDefinition: (definition) => renderPool.send('extractStructure', { definition }),
	terminate: () => renderPool.terminate()
};

/**
 * Perform a SMARTS substructure search via the RDKit search pool.
 * Named to match the reference project's API consumed by softspot-search.js.
 * @param {string|string[]} smarts
 * @param {string|string[]} smiles
 * @param {'rdkit'} [_engine]  kept for API compat — only rdkit pool available
 * @param {boolean} [includeAtomBondIndices]
 * @returns {Promise<any>}
 */
export const performSubstructureSearchAsync = (
	smarts,
	smiles,
	_engine = 'rdkit',
	includeAtomBondIndices = false
) => searchPool.send('search', { smarts, smiles, includeAtomBondIndices });

/** Legacy alias used by playground/page.svelte */
export const performSubstructureSearch = performSubstructureSearchAsync;

/** Terminate all pools (call on page teardown if needed) */
export const terminateAll = () => {
	renderPool.terminate();
	searchPool.terminate();
};
