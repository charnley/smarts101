import initRDKitModule from '@rdkit/rdkit';
import wasmUrl from '@rdkit/rdkit/RDKit_minimal.wasm?url';

/**
 * Atom colour palettes for light and dark backgrounds.
 */

export const DEFAULT_DARK = [1.0, 1.0, 1.0];
export const DEFAULT_LIGHT = [0.0, 0.0, 0.0];

export const PALETTE_DARK = {
	0: DEFAULT_DARK,
	1: DEFAULT_DARK,
	6: DEFAULT_DARK,
	7: DEFAULT_DARK,
	8: DEFAULT_DARK,
	9: DEFAULT_DARK,
	15: DEFAULT_DARK,
	16: DEFAULT_DARK,
	17: DEFAULT_DARK,
	35: DEFAULT_DARK,
	53: DEFAULT_DARK,
};

export const PALETTE_LIGHT = {
	0: DEFAULT_LIGHT,
	1: DEFAULT_LIGHT,
	6: DEFAULT_LIGHT,
	7: DEFAULT_LIGHT,
	8: DEFAULT_LIGHT,
	9: DEFAULT_LIGHT,
	15: DEFAULT_LIGHT,
	16: DEFAULT_LIGHT,
	17: DEFAULT_LIGHT,
	35: DEFAULT_LIGHT,
	53: DEFAULT_LIGHT,
};

// ── Singleton ─────────────────────────────────────────────────────────────

/** @type {import('@rdkit/rdkit').RDKitModule | null} */
let _rdkit = null;
/** @type {Promise<import('@rdkit/rdkit').RDKitModule> | null} */
let _initPromise = null;

/**
 * Returns the shared RDKit module instance.
 * @returns {Promise<import('@rdkit/rdkit').RDKitModule>}
 */
export async function getRDKit() {
	if (_rdkit) return _rdkit;
	if (!_initPromise) {
		_initPromise = initRDKitModule(/** @type {any} */ ({ locateFile: () => wasmUrl })).then((r) => {
			_rdkit = r;
			console.log('[RDKit_minimal] version:', r.version());
			return r;
		});
	}
	return _initPromise;
}

// ── SMARTS validation ─────────────────────────────────────────────────────

/**
 * Parse a SMARTS string with RDKit and return any parse errors.
 * @param {string} smarts
 * @returns {Promise<{ valid: boolean, errors: string[] }>}
 */
export async function validateSmarts(smarts) {
	const rdkit = await getRDKit();
	const logHandle = rdkit.set_log_capture('rdApp.error');
	const mol = rdkit.get_qmol(smarts);
	const raw = logHandle?.get_buffer() ?? '';
	logHandle?.clear_buffer();
	logHandle?.delete();
	if (mol) mol.delete();

	// Strip timestamps
	const lines = raw
		.split('\n')
		.map((s) => s.replace(/^\[\d+:\d+:\d+\] /, ''))
		.filter(Boolean);
	const errors = lines.length ? [lines.join('\n')] : [];
	return { valid: mol !== null, errors };
}

// ── Maximum common substructure ───────────────────────────────────────────

/**
 * @typedef {{
 *   smarts: string,
 *   numAtoms: number,
 *   numBonds: number,
 *   canceled: boolean,
 *   ms: number,
 *   skipped: number,
 * }} McsResult
 */

/**
 * Find the maximum common substructure (MCS) of a list of molecules and return it as SMARTS.
 * Runs synchronously on the calling thread, bounded by `timeoutSeconds`: call it from a worker.
 * Entries that RDKit cannot parse are skipped and counted in `skipped`.
 * @param {string[]} structureDefinitions SMILES or molblocks
 * @param {{ timeoutSeconds?: number, explicitHydrogens?: boolean }} [options]
 * @returns {Promise<McsResult>}
 */
export async function findMcsSmarts(structureDefinitions, options = {}) {
	const { timeoutSeconds = 10, explicitHydrogens = false } = options;
	const rdkit = await getRDKit();

	/** @type {any[]} */
	const mols = [];
	let skipped = 0;
	const list = new rdkit.MolList();
	try {
		for (const def of structureDefinitions) {
			const mol = rdkit.get_mol(def);
			if (!mol || !mol.is_valid()) {
				mol?.delete();
				skipped++;
				continue;
			}
			if (def.includes('\n') && !explicitHydrogens) mol.remove_hs_in_place();
			mols.push(mol);
		}

		// MCS of fewer than two molecules is meaningless (and throws in RDKit)
		if (mols.length < 2)
			return { smarts: '', numAtoms: 0, numBonds: 0, canceled: false, ms: 0, skipped };

		for (const mol of mols) list.append(mol);
		const start = performance.now();
		const raw = rdkit.get_mcs_as_json(list, JSON.stringify({ Timeout: timeoutSeconds }));
		const ms = performance.now() - start;
		const { smarts = '', numAtoms = 0, numBonds = 0, canceled = false } = JSON.parse(raw);
		return { smarts, numAtoms, numBonds, canceled, ms, skipped };
	} finally {
		list.delete();
		for (const mol of mols) mol.delete();
	}
}
