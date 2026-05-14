/**
 * RDKit reaction worker
 * Runs SMIRKS (rxnSmarts) reactions against a list of target SMILES.
 */

import { getRDKit } from '$lib/rdkit/utils.js';

/** @type {any} */
let RDKit = null;

const initializeRDKit = async () => {
	if (!RDKit) {
		try {
			RDKit = await getRDKit();
			return true;
		} catch (error) {
			console.error('[Reaction Worker] Failed to initialize RDKit:', error);
			return false;
		}
	}
	return true;
};

/**
 * Run a reaction (rxnSmarts / SMIRKS) against a list of target SMILES.
 *
 * @param {string} rxnSmarts - Reaction SMARTS (SMIRKS), e.g. "[OH:1]c>>[Br:1]c"
 * @param {string[]} smilesList
 * @returns {{ success: boolean, results: Array<{ smiles: string, products: string[][] }>, error?: string }}
 */
const performReaction = async (rxnSmarts, smilesList) => {
	const ok = await initializeRDKit();
	if (!ok) return { success: false, results: [], error: 'Failed to initialize RDKit' };

	const rxn = RDKit.get_rxn(rxnSmarts);
	if (!rxn) {
		return { success: false, results: [], error: `Invalid rxnSmarts: "${rxnSmarts}"` };
	}

	/** @type {Array<{ smiles: string, products: string[][] }>} */
	const results = [];

	for (const smiles of smilesList) {
		if (!smiles || !smiles.trim()) continue;

		let reactants = null;
		let molListList = null;
		/** @type {any[]} */
		let mols = [];

		try {
			// Split dot-notation into separate reactant mols (one per reactant slot)
			const parts = smiles.split('.');
			mols = parts.map((s) => RDKit.get_mol(s)).filter((m) => m && m.is_valid());

			if (mols.length === 0) {
				results.push({ smiles, products: [] });
				continue;
			}

			reactants = new RDKit.MolList();
			for (const m of mols) reactants.append(m);

			molListList = rxn.run_reactants(reactants, 10);

			/** @type {string[][]} */
			const products = [];

			for (let i = 0; i < molListList.size(); i++) {
				const molList = molListList.get(i);
				if (!molList) continue;
				/** @type {string[]} */
				const set = [];
				for (let j = 0; j < molList.size(); j++) {
					const product = molList.at(j);
					if (product) {
						try {
							set.push(product.get_smiles());
						} finally {
							product.delete();
						}
					}
				}
				molList.delete();
				if (set.length > 0) products.push(set);
			}

			results.push({ smiles, products });
		} catch (e) {
			results.push({ smiles, products: [] });
		} finally {
			if (molListList) molListList.delete();
			if (reactants) reactants.delete();
			for (const m of mols) m.delete();
		}
	}

	rxn.delete();

	return { success: true, results };
};

self.onmessage = async function (event) {
	const { id, rxnSmarts, smilesList } = event.data;

	try {
		if (!id) throw new Error('Message must include an id field');
		if (!rxnSmarts) throw new Error('Message must include rxnSmarts field');
		if (!smilesList) throw new Error('Message must include smilesList field');

		const data = await performReaction(rxnSmarts, smilesList);
		self.postMessage({ id, type: 'success', data });
	} catch (error) {
		self.postMessage({
			id: event.data?.id || 'unknown',
			type: 'error',
			error: error instanceof Error ? error.message : String(error),
			data: null,
		});
	}
};

self.onerror = function (error) {
	const msg =
		typeof error === 'string'
			? error
			: error instanceof ErrorEvent
				? error.message
				: 'Unknown worker error';
	self.postMessage({
		id: 'worker-error',
		type: 'error',
		error: `Reaction worker error: ${msg}`,
		data: null,
	});
};
