import initRDKitModule from '@rdkit/rdkit';
import wasmUrl from '@rdkit/rdkit/RDKit_minimal.wasm?url';

/**
 * Atom colour palettes for light and dark backgrounds.
 */

const DEFAULT_DARK = [1.0, 1.0, 1.0];
const DEFAULT_LIGHT = [0.0, 0.0, 0.0];

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
