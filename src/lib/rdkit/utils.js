// @ts-ignore — rdkit types don't expose a default-export call signature
// import _initRDKitModule from '@rdkit/rdkit';
// import wasmUrl from '@rdkit/rdkit/dist/RDKit_minimal.wasm?url';

import _initRDKitModule from './RDKit_minimal.js';
import wasmUrl from './RDKit_minimal.wasm?url';

/** @type {import('@rdkit/rdkit').RDKitLoader} */
const initRDKitModule = /** @type {any} */ (_initRDKitModule);

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
