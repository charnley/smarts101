import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * @param {import('clsx').ClassValue[]} inputs
 * @returns {string}
 */
export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

// ── RDKit SMARTS validation ────────────────────────────────────────────────

// @ts-ignore — rdkit types don't expose a default-export call signature
import _initRDKitModule from '@rdkit/rdkit';
import wasmUrl from '@rdkit/rdkit/dist/RDKit_minimal.wasm?url';

/** @type {import('@rdkit/rdkit').RDKitLoader} */
const initRDKitModule = /** @type {any} */ (_initRDKitModule);

/** @type {string[]} */
const _logBuf = [];
let _capturing = false;
/** @type {import('@rdkit/rdkit').RDKitModule | null} */
let _rdkit = null;
/** @type {Promise<import('@rdkit/rdkit').RDKitModule> | null} */
let _initPromise = null;

async function getRDKit() {
	if (_rdkit) return _rdkit;
	if (!_initPromise) {
		_initPromise = initRDKitModule(
			/** @type {any} */ ({
				locateFile: () => wasmUrl,
				printErr: (/** @type {string} */ msg) => {
					if (_capturing) _logBuf.push(msg);
				},
			}),
		).then((r) => {
			/** @type {any} */ (r).enable_logging('error');
			_rdkit = r;
			return r;
		});
	}
	return _initPromise;
}

/**
 * Parse a SMARTS string with RDKit and return any parse errors.
 * @param {string} smarts
 * @returns {Promise<{ valid: boolean, errors: string[] }>}
 */
export async function validateSmarts(smarts) {
	const rdkit = await getRDKit();
	_logBuf.length = 0;
	_capturing = true;
	const mol = rdkit.get_qmol(smarts);
	_capturing = false;
	if (mol) mol.delete();
	const errors = [...new Set(_logBuf.map((m) => m.replace(/^\[\d+:\d+:\d+\] /, '')))];
	return { valid: mol !== null, errors };
}
