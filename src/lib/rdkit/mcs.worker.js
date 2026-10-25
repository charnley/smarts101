/**
 * Maximum common substructure worker.
 * Keeps the synchronous RDKit MCS search off the main thread.
 */

import { findMcsSmarts } from '$lib/rdkit/utils.js';

self.onmessage = async (e) => {
	const { requestId, structureDefinitions, options } = e.data;
	try {
		const result = await findMcsSmarts(structureDefinitions, options);
		self.postMessage({ type: 'result', requestId, result });
	} catch (err) {
		self.postMessage({
			type: 'error',
			requestId,
			message: err instanceof Error ? err.message : String(err),
		});
	}
};
