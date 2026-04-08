import initRDKitModule from './RDKit_minimal.js';
import wasmUrl from './RDKit_minimal.wasm?url';

/**
 * Atom colour palettes for light and dark backgrounds.
 * Values are [r, g, b] in 0–1 range (RDKit convention).
 * Extend these objects to tune any element's colour.
 */
export const PALETTE_LIGHT = {
	0: [0.1, 0.1, 0.1], // default / unknown
	1: [5, 0, 0], // H
	6: [0, 0, 0], // C  — black
	7: [0, 0, 0.9], // N  — blue
	8: [0.9, 0, 0], // O  — red
	9: [0, 0.5, 0], // F  — green
	15: [0.5, 0, 0.5], // P  — purple
	16: [0.5, 0.25, 0], // S  — brown/orange
	17: [0, 0.5, 0], // Cl — green
	35: [0, 0.5, 0], // Br — green
	53: [0.25, 0, 0.5], // I  — violet
};

export const PALETTE_DARK = {
	0: [0.85, 0.85, 0.85], // default / unknown
	1: [0.85, 0.85, 0.85], // H
	6: [1.0, 1.0, 1.0], // C  — light grey
	7: [0.4, 0.6, 1], // N  — light blue
	8: [1, 0.4, 0.4], // O  — light red
	9: [0.2, 0.9, 0.4], // F  — bright green
	15: [0.85, 0.4, 0.85], // P  — light purple
	16: [0.9, 0.75, 0.1], // S  — yellow-orange
	17: [0.2, 0.9, 0.4], // Cl — bright green
	35: [0.2, 0.9, 0.4], // Br — bright green
	53: [0.7, 0.4, 0.9], // I  — light violet
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
			return r;
		});
	}
	return _initPromise;
}

// ── SMARTS validation ─────────────────────────────────────────────────────

/**
 * Parse a SMARTS string with RDKit and return any parse errors.
 * Uses set_log_capture to intercept RDKit's internal error log channel
 * (rdApp.error), which is the correct way to get structured parse errors
 * from the WASM build — stderr is not reliably available in the browser.
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
