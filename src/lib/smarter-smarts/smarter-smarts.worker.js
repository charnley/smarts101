/**
 * Smarter SMARTS search worker
 * Loads molecule library into C++ WASM, runs batched SMARTS searches,
 * returns unique atom-environment matches progressively.
 */

import { createSearcher } from './index.js';
import csvText from '$lib/smarter-smarts/data/100k-smallest-chembl.csv?raw';

const BATCH_SIZE = 10000;

/**
 * Parse CHEMBL_ID,SMILES CSV (no quoting, no header).
 * @param {string} text
 * @returns {{smiles: string, name: string}[]}
 */
function parseCSV(text) {
    const molecules = [];
    const lines = text.trim().split('\n');
    for (const line of lines) {
        const comma = line.indexOf(',');
        if (comma === -1) continue;
        const name = line.slice(0, comma);
        const smiles = line.slice(comma + 1);
        if (smiles) {
            molecules.push({ smiles, name });
        }
    }
    return molecules;
}

/** @type {any} */
let searcher = null;
/** @type {{smiles: string, name: string}[]} */
let moleculeNames = [];
let total = 0;
/** @type {string|null} */
let currentSmarts = null;
let aborted = false;

async function init() {
    try {
        const allMolecules = parseCSV(csvText);

        moleculeNames = allMolecules;
        const smilesList = allMolecules.map((m) => m.smiles);

        const { searcher: s } = await createSearcher(smilesList);
        searcher = s;
        total = smilesList.length;

        self.postMessage({ type: 'ready', totalMolecules: total });
    } catch (err) {
        self.postMessage({
            type: 'error',
            message: err instanceof Error ? err.message : String(err),
        });
    }
}

async function doSearch(smarts, startIdx) {
    if (!searcher) return;

    if (startIdx === 0) {
        aborted = false;
        const resp = JSON.parse(searcher.initSearch(smarts));
        if (!resp.ok) {
            self.postMessage({ type: 'error', message: resp.error || 'Invalid SMARTS' });
            return;
        }
        currentSmarts = smarts;
    }

    const batchResults = [];
    let idx = startIdx;

    while (idx < total) {
        if (aborted) return;

        const raw = searcher.searchBatch(idx, BATCH_SIZE);
        const resp = JSON.parse(raw);

        if (!resp.ok) {
            self.postMessage({ type: 'error', message: resp.error || 'Search error' });
            return;
        }

        for (const match of resp.matches) {
            const molInfo = moleculeNames[match.molecule_idx];
            batchResults.push({
                smiles: match.smiles,
                name: molInfo ? molInfo.name : match.smiles,
            });
        }

        const done = resp.done;
        idx = done ? total : idx + resp.processed;

        if (batchResults.length > 0 || done) {
            self.postMessage({
                type: 'batch',
                results: batchResults,
                percent: Math.round(resp.progress * 100),
                totalSearched: Math.min(idx, total),
                totalMolecules: total,
                finished: done,
                nextIdx: done ? total : idx,
            });
            return;
        }

        if (done) {
            self.postMessage({
                type: 'batch',
                results: [],
                percent: 100,
                totalSearched: total,
                totalMolecules: total,
                finished: true,
                nextIdx: total,
            });
            return;
        }
    }
}

self.onmessage = async (e) => {
    const { smarts, startIdx = 0, initData } = e.data;

    if (initData) {
        try {
            moleculeNames = initData;
            const smilesList = initData.map((/** @type {{smiles: string}} */ m) => m.smiles);
            const { searcher: s } = await createSearcher(smilesList);
            searcher = s;
            total = smilesList.length;
            self.postMessage({ type: 'ready', totalMolecules: total });
        } catch (err) {
            self.postMessage({
                type: 'error',
                message: err instanceof Error ? err.message : String(err),
            });
        }
        return;
    }

    if (smarts) {
        await doSearch(smarts, startIdx);
    }
};

init();
