/**
 * @fileoverview Reaction runner — applies a rxnSmarts (SMIRKS) to a list of
 * target SMILES and returns carousel-ready Slide arrays.
 */

import { performReactionAsync } from './worker-manager.js';

/**
 * @typedef {{ reactants: string[], products: string[] }} Slide
 * @typedef {{ smarts: string, slides: Slide[] }} ReactionEntry
 */

/**
 * Map raw worker results to carousel-ready ReactionEntry format.
 *
 * @param {Array<{ smiles: string, products: string[][] }>} results
 * @returns {ReactionEntry[]}
 */
function mapReactionResults(results) {
	return results.map((r) => {
		const reactants = r.smiles.split('.').filter(Boolean);
		const slides =
			r.products.length > 0
				? r.products.map((/** @type {string[]} */ prods) => ({ reactants, products: prods }))
				: [{ reactants, products: [] }];
		return { smarts: r.smiles, slides };
	});
}

/**
 * Run a rxnSmarts reaction against one or more target SMILES.
 * Returns carousel-ready ReactionEntry[] — each with slides of {reactants, products}.
 *
 * @param {string} rxnSmarts - Reaction SMARTS (SMIRKS), e.g. "[OH:1]c>>[Br:1]c"
 * @param {string | string[]} targets - Target SMILES string(s)
 * @returns {Promise<ReactionEntry[]>}
 */
export async function runReaction(rxnSmarts, targets) {
	const smilesList = (Array.isArray(targets) ? targets : [targets]).filter((s) => s?.trim());

	if (!rxnSmarts?.trim() || smilesList.length === 0) return [];

	const result = await performReactionAsync(rxnSmarts, smilesList);

	if (!result.success) {
		console.warn('[reaction-runner] Worker error:', result.error);
		return smilesList.map((smiles) => ({
			smarts: smiles,
			slides: [{ reactants: [], products: [] }],
		}));
	}

	return mapReactionResults(result.results);
}
