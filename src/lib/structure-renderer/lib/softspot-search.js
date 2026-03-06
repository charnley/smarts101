/**
 * @fileoverview SMARTS-based softspot search for StructureRenderer.
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
 * @typedef {Object} SmartsMetaEntry
 * @property {any} match - Raw atomBondMatch object from the search result
 * @property {string | number[]} color - Resolved color value
 * @property {string} id - Pattern identifier
 * @property {string} name - Pattern display name
 * @property {string[]} query - Resolved query strings
 * @property {any} softspots - Match softspot data
 */

/**
 * @typedef {Object} DetectedSoftspot
 * @property {string} id
 * @property {string} name
 * @property {string[]} query
 * @property {string | number[]} color
 * @property {number[]} atoms
 * @property {number[]} bonds
 */

/**
 * @typedef {Object} SmartsSearchResult
 * @property {SmartsMetaEntry[]} smartsMetadata
 * @property {DetectedSoftspot[]} detectedSoftspots
 * @property {number[]} allAtomsMatches
 * @property {number[]} allBondsMatches
 */

/**
 * Run SMARTS substructure searches against a molecule definition.
 *
 * @param {SmartsDefinition[]} smartsArray
 * @param {string} definition - Molecule definition (SMILES, molblock, etc.)
 * @returns {Promise<SmartsSearchResult>}
 */
export async function runSmartsSearch(smartsArray, definition) {
	/** @type {number[]} */
	const allAtomsMatches = [];
	/** @type {number[]} */
	const allBondsMatches = [];
	/** @type {SmartsMetaEntry[]} */
	const smartsMetadata = [];

	for (let idx = 0; idx < smartsArray.length; idx++) {
		const smartsObj = smartsArray[idx];
		try {
			const smartsQuery = smartsObj.smarts;
			const smartsColor =
				smartsObj.color || [30 / 255, 144 / 255, 255 / 255, 1.0];
			const smartsId = smartsObj.id || `smarts-${idx}`;
			const smartsName = smartsObj.name || `Pattern ${idx + 1}`;
			const queries = Array.isArray(smartsQuery)
				? smartsQuery
				: [smartsQuery];

			const wbSearchResults = await performSubstructureSearchAsync(
				[...queries],
				definition,
				'rdkit',
				true
			);

			// @ts-ignore
			const { success, results } = wbSearchResults;
			if (success) {
				for (const result of results) {
					const {
						atomBondMatches = [],
						allSoftspotMatches = [],
						matches = [false],
					} = result;
					let mIdx = -1;
					for (const match of atomBondMatches) {
						mIdx++;
						if (!(matches[mIdx] || false)) continue;
						const softspotList =
							allSoftspotMatches[mIdx] || { atoms: [], bonds: [] };
						allAtomsMatches.push(...(match.atoms || []));
						allBondsMatches.push(...(match.bonds || []));
						smartsMetadata.push({
							match,
							color: smartsColor,
							id: smartsId,
							name: smartsName,
							query: queries,
							softspots: softspotList,
						});
					}
				}
			}
		} catch (e) {
			console.warn(
				'[StructureRenderer] Error parsing SMARTS',
				e,
				smartsObj,
				idx
			);
		}
	}

	/** @type {DetectedSoftspot[]} */
	const detectedSoftspots = smartsMetadata.flatMap((meta) => {
		const spotsArr = Array.isArray(meta.softspots)
			? meta.softspots
			: [meta.softspots];
		return spotsArr.map((spot, j) => ({
			id: `${meta.id}-${j}`,
			name: `${meta.name} ${j + 1}`,
			query: meta.query,
			color: meta.color,
			atoms: [...(spot.atoms || [])],
			bonds: [...(spot.bonds || [])],
		}));
	});

	return {
		smartsMetadata,
		detectedSoftspots,
		allAtomsMatches,
		allBondsMatches,
	};
}
