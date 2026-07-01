export { default as SmarterSmartsWorker } from './smarter-smarts.worker.js?worker';

import initSmarterSmartsModule from './smarter-smarts.js';
import wasmUrl from './smarter-smarts.wasm?url';

let _module = null;
let _initPromise = null;

export async function getSmarterSmartsModule() {
	if (_module) return _module;
	if (!_initPromise) {
		_initPromise = initSmarterSmartsModule(/** @type {any} */ ({ locateFile: () => wasmUrl })).then(
			(m) => {
				_module = m;
				console.log('[smarter-smarts] rdkit version:', m.version());
				return m;
			},
		);
	}
	return _initPromise;
}

export async function getAtomsProperties(smiles) {
	const mod = await getSmarterSmartsModule();
	return JSON.parse(mod.getAtomsProperties(smiles));
}

/**
 * Create a SmartsSearcher instance and load molecule list.
 * @param {string[]} smilesList - array of SMILES strings
 * @returns {Promise<{searcher: any, mod: any}>}
 */
export async function createSearcher(smilesList) {
	const mod = await getSmarterSmartsModule();
	const searcher = new mod.SmartsSearcher();
	const resp = JSON.parse(searcher.load(JSON.stringify(smilesList)));
	if (!resp.ok) {
		throw new Error(resp.error || 'Failed to load molecules');
	}
	return { searcher, mod };
}
