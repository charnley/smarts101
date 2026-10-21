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
 * One matched pattern on one molecule.
 * @typedef {Object} HighlightMatch
 * @property {string | number[]} color - Resolved color value
 * @property {string} id - Pattern identifier
 * @property {string} name - Pattern display name
 * @property {{ atoms: number[], bonds: number[] }[]} matches - Atom/bond indices of each match instance
 */

/**
 * Run SMARTS substructure searches against a molecule definition.
 *
 * @param {SmartsDefinition[]} definitions
 * @param {string} definition - Molecule definition (SMILES, molblock, etc.)
 * @returns {Promise<HighlightMatch[]>}
 */
export async function runSmartsSearch(definitions, definition) {
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

			const searchResult = await performSubstructureSearchAsync([...queries], definition, true);

			// @ts-ignore
			const { success, results } = searchResult;
			if (success) {
				for (const result of results) {
					const { atomBondMatches = [], allAtomBondMatches = [], matches = [false] } = result;
					for (let mIdx = 0; mIdx < atomBondMatches.length; mIdx++) {
						if (!(matches[mIdx] || false)) continue;
						const matchList = allAtomBondMatches[mIdx] || { atoms: [], bonds: [] };
						highlightMatches.push({
							color: smartsColor,
							id: smartsId,
							name: smartsName,
							matches: matchList,
						});
					}
				}
			}
		} catch (e) {
			console.warn('[StructureRenderer] Error parsing SMARTS', e, smartsObj, idx);
		}
	}

	return highlightMatches;
}
