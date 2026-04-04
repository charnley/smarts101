// @ts-ignore — rdkit types don't expose a default-export call signature
// import _initRDKitModule from '@rdkit/rdkit';
// import wasmUrl from '@rdkit/rdkit/dist/RDKit_minimal.wasm?url';

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


// ── Plain singleton (no logging) — for workers ────────────────────────────

/** @type {import('@rdkit/rdkit').RDKitModule | null} */
let _rdkit = null;
/** @type {Promise<import('@rdkit/rdkit').RDKitModule> | null} */
let _initPromise = null;

/**
 * Returns the shared RDKit module instance (no logging hooks).
 * Suitable for use in Web Workers.
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

// ── Logging singleton — for validateSmarts ────────────────────────────────

/** @type {string[]} */
const _logBuf = [];
let _capturing = false;
/** @type {import('@rdkit/rdkit').RDKitModule | null} */
let _rdkitLogging = null;
/** @type {Promise<import('@rdkit/rdkit').RDKitModule> | null} */
let _initLoggingPromise = null;

/**
 * Returns the shared RDKit module instance with error logging hooks enabled.
 * @returns {Promise<import('@rdkit/rdkit').RDKitModule>}
 */
async function getRDKitWithLogging() {
	if (_rdkitLogging) return _rdkitLogging;
	if (!_initLoggingPromise) {
		_initLoggingPromise = initRDKitModule(
			/** @type {any} */ ({
				locateFile: () => wasmUrl,
				printErr: (/** @type {string} */ msg) => {
					if (_capturing) _logBuf.push(msg);
				},
			}),
		).then((r) => {
			/** @type {any} */ (r).enable_logging('error');
			_rdkitLogging = r;
			return r;
		});
	}
	return _initLoggingPromise;
}

// ── SMARTS validation ─────────────────────────────────────────────────────

/**
 * Parse a SMARTS string with RDKit and return any parse errors.
 * @param {string} smarts
 * @returns {Promise<{ valid: boolean, errors: string[] }>}
 */
export async function validateSmarts(smarts) {
	const rdkit = await getRDKitWithLogging();
	_logBuf.length = 0;
	_capturing = true;
	const mol = rdkit.get_qmol(smarts);
	_capturing = false;
	if (mol) mol.delete();
	const errors = [...new Set(_logBuf.map((m) => m.replace(/^\[\d+:\d+:\d+\] /, '')))];
	return { valid: mol !== null, errors };
}
