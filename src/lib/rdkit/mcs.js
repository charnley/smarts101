import McsWorker from './mcs.worker.js?worker';

/** Seconds RDKit may search before it returns its best partial result. */
const MCS_TIMEOUT_SECONDS = 10;
/** Extra time before the worker is killed in case RDKit does not honour its timeout. */
const MCS_GRACE_MS = 5000;

/** @type {Worker | null} */
let worker = null;
let requestCounter = 0;

/**
 * @typedef {import('./utils.js').McsResult} McsResult
 */

/** Stop the worker (and any running search). It is recreated on the next request. */
export function terminateMcsWorker() {
	worker?.terminate();
	worker = null;
}

/**
 * Find the MCS SMARTS of the molecules in a web worker.
 * If the search hangs past its timeout the worker is terminated and the result is
 * `{ smarts: '', canceled: true }`.
 * @param {string[]} structureDefinitions SMILES or molblocks
 * @param {{ explicitHydrogens?: boolean }} [options]
 * @returns {Promise<McsResult>}
 */
export function findMcsSmartsInWorker(structureDefinitions, options = {}) {
	terminateMcsWorker();
	const w = new McsWorker();
	worker = w;
	const requestId = ++requestCounter;

	return new Promise((resolve, reject) => {
		/** @param {() => void} settle */
		const finish = (settle) => {
			clearTimeout(hardTimer);
			if (worker === w) terminateMcsWorker();
			else w.terminate();
			settle();
		};

		const hardTimer = setTimeout(
			() =>
				finish(() =>
					resolve({ smarts: '', numAtoms: 0, numBonds: 0, canceled: true, ms: 0, skipped: 0 }),
				),
			MCS_TIMEOUT_SECONDS * 1000 + MCS_GRACE_MS,
		);

		w.onmessage = (e) => {
			if (e.data.requestId !== requestId) return;
			if (e.data.type === 'error') finish(() => reject(new Error(e.data.message)));
			else finish(() => resolve(e.data.result));
		};
		w.onerror = (e) => finish(() => reject(new Error(e.message || 'Worker error')));

		w.postMessage({
			requestId,
			structureDefinitions,
			options: { ...options, timeoutSeconds: MCS_TIMEOUT_SECONDS },
		});
	});
}
