/**
 * @fileoverview Reaction runner — applies a rxnSmarts (SMIRKS) to a list of
 * target SMILES and returns per-target product sets.
 */

import { performReactionAsync } from './worker-manager.js';

/**
 * @typedef {Object} ReactionResult
 * @property {string} smiles - Input target SMILES
 * @property {string[][]} products - Outer: reaction outcomes. Inner: product mol SMILES per outcome.
 */

/**
 * Run a rxnSmarts reaction against one or more target SMILES.
 *
 * @param {string} rxnSmarts - Reaction SMARTS (SMIRKS), e.g. "[OH:1]c>>[Br:1]c"
 * @param {string | string[]} targets - Target SMILES string(s)
 * @returns {Promise<ReactionResult[]>}
 */
export async function runReaction(rxnSmarts, targets) {
	const smilesList = (Array.isArray(targets) ? targets : [targets]).filter((s) => s?.trim());

	if (!rxnSmarts?.trim() || smilesList.length === 0) return [];

	const result = await performReactionAsync(rxnSmarts, smilesList);

	if (!result.success) {
		console.warn('[reaction-runner] Worker error:', result.error);
		return smilesList.map((smiles) => ({ smiles, products: [] }));
	}

	return result.results;
}
