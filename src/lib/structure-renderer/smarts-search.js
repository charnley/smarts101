/**
 * @fileoverview SMARTS-based substructure search for StructureRenderer.
 * Wraps the worker-backed substructure search and assembles per-match metadata.
 */

import { performSubstructureSearchAsync } from './worker-manager.js';

/**
 * @typedef {Object} SmartsDefinition
 * @property {string | string[]} smarts - One or more SMARTS query strings
 * @property {string | number[]} [color] - Color for the match (hex or RGBA array 0-1)
 * @property {string} [id] - Unique identifier for the pattern
 * @property {string} [name] - Display name for the pattern
 */

/**
 * @typedef {Object} HighlightMatch
 * @property {any} match - Raw atomBondMatch object from the search result
 * @property {string | number[]} color - Resolved color value
 * @property {string} id - Pattern identifier
 * @property {string} name - Pattern display name
 * @property {string[]} query - Resolved query strings
 * @property {any} matches - Per-match atom/bond data
 */

/**
 * @typedef {Object} DetectedMatch
 * @property {string} id
 * @property {string} name
 * @property {string[]} query
 * @property {string | number[]} color
 * @property {number[]} atoms
 * @property {number[]} bonds
 */

/**
 * @typedef {Object} SmartsSearchResult
 * @property {HighlightMatch[]} highlightMatches
 * @property {DetectedMatch[]} detectedMatches
 * @property {number[]} allAtomsMatches
 * @property {number[]} allBondsMatches
 */

/**
 * Run SMARTS substructure searches against a molecule definition.
 *
 * @param {SmartsDefinition[]} definitions
 * @param {string} definition - Molecule definition (SMILES, molblock, etc.)
 * @returns {Promise<SmartsSearchResult>}
 */
export async function runSmartsSearch(definitions, definition) {
	/** @type {number[]} */
	const allAtomsMatches = [];
	/** @type {number[]} */
	const allBondsMatches = [];
	/** @type {HighlightMatch[]} */
	const highlightMatches = [];

	for (let idx = 0; idx < definitions.length; idx++) {
		const smartsObj = definitions[idx];
		try {
			const smartsQuery = smartsObj.smarts;
			const smartsColor = smartsObj.color || [30 / 255, 144 / 255, 255 / 255, 1.0];
			const smartsId = smartsObj.id || `smarts-${idx}`;
			const smartsName = smartsObj.name || `Pattern ${idx + 1}`;
			const queries = Array.isArray(smartsQuery) ? smartsQuery : [smartsQuery];

			const searchResult = await performSubstructureSearchAsync(
				[...queries],
				definition,
				'rdkit',
				true
			);

			// @ts-ignore
			const { success, results } = searchResult;
			if (success) {
				for (const result of results) {
					const { atomBondMatches = [], allAtomBondMatches = [], matches = [false] } = result;
					let mIdx = -1;
					for (const match of atomBondMatches) {
						mIdx++;
						if (!(matches[mIdx] || false)) continue;
						const matchList = allAtomBondMatches[mIdx] || { atoms: [], bonds: [] };
						allAtomsMatches.push(...(match.atoms || []));
						allBondsMatches.push(...(match.bonds || []));
						highlightMatches.push({
							match,
							color: smartsColor,
							id: smartsId,
							name: smartsName,
							query: queries,
							matches: matchList
						});
					}
				}
			}
		} catch (e) {
			console.warn('[StructureRenderer] Error parsing SMARTS', e, smartsObj, idx);
		}
	}

	/** @type {DetectedMatch[]} */
	const detectedMatches = highlightMatches.flatMap((meta) => {
		const matchInstances = Array.isArray(meta.matches) ? meta.matches : [meta.matches];
		return matchInstances.map((instance, j) => ({
			id: `${meta.id}-${j}`,
			name: `${meta.name} ${j + 1}`,
			query: meta.query,
			color: meta.color,
			atoms: [...(instance.atoms || [])],
			bonds: [...(instance.bonds || [])]
		}));
	});

	return {
		highlightMatches,
		detectedMatches,
		allAtomsMatches,
		allBondsMatches
	};
}
