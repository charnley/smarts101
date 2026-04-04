/**
 * RDKit substructure search worker
 * Dedicated worker for RDKit-based substructure matching
 */

import { getRDKit } from '$lib/rdkit/utils.js';

/** @type {any} */
let RDKit = null;

/**
 * Initialize RDKit
 * @returns {Promise<boolean>}
 */
const initializeRDKit = async () => {
	if (!RDKit) {
		try {
			RDKit = await getRDKit();
			return true;
		} catch (error) {
			console.error('[RDKit Worker] Failed to initialize RDKit:', error);
			return false;
		}
	}
	return true;
};

/**
 * RDKit-based substructure search
 *
 * Note: JSMol.get_substruct_matches() in the RDKit.js WASM bindings has
 * useChirality parameter, but needs be newest >=2026.03.
 *
 * @param {string} smarts - SMARTS pattern
 * @param {string[]} smilesList - Array of SMILES strings
 * @param {boolean} includeAtomBondIndices - Whether to include atom/bond match data
 * @returns {{matches: boolean[], indices: number[], allAtomBondMatches?: any[], atomBondMatches?: Array<{atoms: number[], bonds: number[]}>}}
 */
const performRDKitSearch = (smarts, smilesList, includeAtomBondIndices = false) => {
	if (!RDKit) {
		throw new Error('RDKit not initialized');
	}

	const _queriesCache = new Map();
	const _moleculesCache = new Map();

	const getSmartsQueryMolecule = (/** @type {string} */ smartsQuery) => {
		if (_queriesCache.has(smartsQuery)) {
			return _queriesCache.get(smartsQuery);
		}

		const queryMol = RDKit.get_qmol(smartsQuery);
		if (!queryMol) {
			throw new Error(`Invalid SMARTS query: "${smartsQuery}"`);
		}

		_queriesCache.set(smartsQuery, queryMol);
		return queryMol;
	};

	const getMoleculeFromSmiles = (/** @type {string} */ smiles) => {
		if (_moleculesCache.has(smiles)) {
			return _moleculesCache.get(smiles);
		}

		const mol = RDKit.get_mol(smiles);
		if (!mol || mol.is_valid() === false) {
			_moleculesCache.set(smiles, null);
			return null;
		}
		_moleculesCache.set(smiles, mol);
		return mol;
	};

	const queryMol = getSmartsQueryMolecule(smarts);
	const matches = new Array(smilesList.length).fill(false);
	const atomBondMatches = includeAtomBondIndices ? new Array(smilesList.length) : null;
	const allAtomBondMatches = includeAtomBondIndices ? new Array(smilesList.length) : [];

	for (let i = 0; i < smilesList.length; i++) {
		if (includeAtomBondIndices && atomBondMatches) {
			atomBondMatches[i] = { atoms: [], bonds: [] };
		}
		const smi = smilesList[i];
		if (typeof smi !== 'string' || !smi.trim()) continue;
		try {
			const targetMol = getMoleculeFromSmiles(smi);
			if (!targetMol) continue;

			const jsonResult = targetMol.get_substruct_matches(queryMol, JSON.stringify({ useChirality: true })) ?? '[]';
			const matchResults = JSON.parse(jsonResult);
			matches[i] = matchResults.length > 0;

			if (includeAtomBondIndices && atomBondMatches && matchResults.length > 0) {
				const atoms = [];
				const bonds = [];
				for (const match of matchResults) {
					atoms.push(...(match.atoms || []));
					bonds.push(...(match.bonds || []));
				}
				atomBondMatches[i] = {
					atoms: Array.from(new Set(atoms)),
					bonds: Array.from(new Set(bonds)),
				};
				allAtomBondMatches[i] = matchResults;
			}
		} catch {
			// skip invalid molecules
		}
	}

	const indices = matches.map((ok, i) => (ok ? i : -1)).filter((i) => i >= 0);
	/** @type {{ matches: any[], indices: number[], atomBondMatches?: any[], allAtomBondMatches?: any[] }} */
	const result = { matches, indices };

	if (includeAtomBondIndices && atomBondMatches) {
		result.atomBondMatches = atomBondMatches;
		result.allAtomBondMatches = allAtomBondMatches;
	}

	return result;
};

/**
 * Main search function
 * @param {string|string[]} smarts - SMARTS pattern(s)
 * @param {string|string[]} smiles - SMILES string(s)
 * @param {boolean} includeAtomBondIndices - Whether to include atom/bond match data
 */
const performSubstructureSearch = async (smarts, smiles, includeAtomBondIndices = false) => {
	try {
		const smartsArray = Array.isArray(smarts) ? smarts : [smarts];
		const smilesArray = Array.isArray(smiles) ? smiles : [smiles];

		if (smartsArray.length === 0 || smartsArray.some((s) => !s || typeof s !== 'string')) {
			throw new Error('Invalid SMARTS input: must be non-empty string(s)');
		}
		if (smilesArray.length === 0 || smilesArray.some((s) => !s || typeof s !== 'string')) {
			throw new Error('Invalid SMILES input: must be non-empty string(s)');
		}

		const success = await initializeRDKit();
		if (!success) throw new Error('Failed to initialize RDKit');

		const results = [];

		for (let i = 0; i < smartsArray.length; i++) {
			const currentSmarts = smartsArray[i];

			try {
				const searchResult = performRDKitSearch(currentSmarts, smilesArray, includeAtomBondIndices);

				/** @type {{ queryIndex: number, smarts: string, engine: string, totalTargets: number, matchCount: number, matches: any[], matchedIndices: number[], matchedSmiles: string[], success: boolean, error: null|string, atomBondMatches?: any[], allAtomBondMatches?: any[] }} */
				const resultObject = {
					queryIndex: i,
					smarts: currentSmarts,
					engine: 'rdkit',
					totalTargets: smilesArray.length,
					matchCount: searchResult.indices.length,
					matches: searchResult.matches,
					matchedIndices: searchResult.indices,
					matchedSmiles: searchResult.indices.map((idx) => smilesArray[idx]),
					success: true,
					error: null,
				};

				if (includeAtomBondIndices && 'atomBondMatches' in searchResult) {
					resultObject.atomBondMatches = searchResult.atomBondMatches;
					resultObject.allAtomBondMatches = searchResult.allAtomBondMatches;
				}

				results.push(resultObject);
			} catch (/** @type {any} */ error) {
				results.push({
					queryIndex: i,
					smarts: currentSmarts,
					engine: 'rdkit',
					totalTargets: smilesArray.length,
					matchCount: 0,
					matches: new Array(smilesArray.length).fill(false),
					matchedIndices: [],
					matchedSmiles: [],
					success: false,
					error: error?.message || String(error),
				});
			}
		}

		return {
			success: true,
			engine: 'rdkit',
			results,
			summary: {
				totalQueries: smartsArray.length,
				totalTargets: smilesArray.length,
				successfulQueries: results.filter((r) => r.success).length,
				failedQueries: results.filter((r) => !r.success).length,
				totalMatches: results.reduce((sum, r) => sum + r.matchCount, 0),
			},
		};
	} catch (/** @type {any} */ error) {
		return {
			success: false,
			engine: 'rdkit',
			error: error?.message || String(error),
			results: [],
		};
	}
};

// Handle messages from the main thread
self.onmessage = async function (event) {
	const { id, smarts, smiles, includeAtomBondIndices = false } = event.data;

	try {
		if (!id) throw new Error('Message must include an id field');
		if (!smarts) throw new Error('Message must include smarts field');
		if (!smiles) throw new Error('Message must include smiles field');

		const result = await performSubstructureSearch(smarts, smiles, includeAtomBondIndices);

		self.postMessage({ id, type: 'success', data: result });
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		self.postMessage({
			id: event.data?.id || 'unknown',
			type: 'error',
			error: errorMessage,
			data: null,
		});
	}
};

// Handle worker errors
self.onerror = function (error) {
	const errorMessage =
		typeof error === 'string'
			? error
			: error instanceof ErrorEvent
				? error.message
				: 'Unknown worker error';
	self.postMessage({
		id: 'worker-error',
		type: 'error',
		error: `RDKit worker error: ${errorMessage}`,
		data: null,
	});
};
