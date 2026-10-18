/**
 * Smarter SMARTS search worker
 * Loads molecule library into C++ WASM, runs batched SMARTS searches,
 * returns unique atom-environment matches progressively.
 */

import { createSearcher } from './index.js';
import { SMARTER_SMARTS_BATCH_SIZE } from '$lib/constants.js';
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

async function doSearch(smarts, startIdx, currentCount = 0, maxResults = Infinity) {
	if (!searcher) return;

	if (startIdx === 0) {
		const resp = JSON.parse(searcher.initSearch(smarts));
		if (!resp.ok) {
			self.postMessage({ type: 'error', message: resp.error || 'Invalid SMARTS' });
			return;
		}
	}

	const raw = searcher.searchBatch(startIdx, SMARTER_SMARTS_BATCH_SIZE);
	const resp = JSON.parse(raw);

	if (!resp.ok) {
		self.postMessage({ type: 'error', message: resp.error || 'Search error' });
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

	const room = Math.max(0, maxResults - currentCount);
	const capped = batchResults.slice(0, room);
	const hitMax = capped.length < batchResults.length;

	const done = resp.done;
	const nextIdx = done ? total : startIdx + resp.processed;

	self.postMessage({
		type: 'batch',
		results: capped,
		finished: done || hitMax,
		nextIdx: done ? total : nextIdx,
	});
}

self.onmessage = async (e) => {
	const { smarts, startIdx = 0, currentCount = 0, maxResults = Infinity } = e.data;

	if (smarts) {
		await doSearch(smarts, startIdx, currentCount, maxResults);
	}
};

init();
