/**
 * Smarter SMARTS search worker
 * Loads molecule library into C++ WASM, runs batched SMARTS searches,
 * returns unique atom-environment matches progressively.
 */

import { createSearcher } from './index.js';
import { SMARTER_SMARTS_BATCH_SIZE, MAX_GENERATED_RESULTS } from '$lib/constants.js';
import csvText from '$lib/smarter-smarts/data/100k-smallest-chembl.csv?raw';

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
/** Matches sent back so far for the current search (the worker owns the result cap). */
let sentCount = 0;

async function init() {
	try {
		const allMolecules = parseCSV(csvText);

		moleculeNames = allMolecules;
		const smilesList = allMolecules.map((m) => m.smiles);

		const { searcher: s } = await createSearcher(smilesList);
		searcher = s;
		total = smilesList.length;

		const pre = JSON.parse(searcher.preload());
		console.log('[worker] molecules preloaded:', JSON.stringify(pre));

		self.postMessage({ type: 'ready' });
	} catch (err) {
		self.postMessage({
			type: 'error',
			message: err instanceof Error ? err.message : String(err),
		});
	}
}

async function doSearch(smarts, startIdx, searchId) {
	if (!searcher) return;

	if (startIdx === 0) {
		const resp = JSON.parse(searcher.initSearch(smarts));
		if (!resp.ok) {
			self.postMessage({ type: 'error', searchId, message: resp.error || 'Invalid SMARTS' });
			return;
		}
		sentCount = 0;
	}

	const raw = searcher.searchBatch(startIdx, SMARTER_SMARTS_BATCH_SIZE);
	const resp = JSON.parse(raw);

	if (!resp.ok) {
		self.postMessage({ type: 'error', searchId, message: resp.error || 'Search error' });
		return;
	}

	const batchResults = [];
	for (const match of resp.matches) {
		const molInfo = moleculeNames[match.molecule_idx];
		batchResults.push({
			smiles: match.smiles,
			name: molInfo ? molInfo.name : match.smiles,
		});
	}

	const capped = batchResults.slice(0, MAX_GENERATED_RESULTS - sentCount);
	sentCount += capped.length;
	const hitMax = sentCount >= MAX_GENERATED_RESULTS;

	const done = resp.done;
	const nextIdx = done ? total : startIdx + resp.processed;

	self.postMessage({
		type: 'batch',
		searchId,
		results: capped,
		finished: done || hitMax,
		nextIdx: done ? total : nextIdx,
	});
}

self.onmessage = async (e) => {
	const { smarts, startIdx = 0, searchId } = e.data;

	if (smarts) {
		await doSearch(smarts, startIdx, searchId);
	}
};

init();
