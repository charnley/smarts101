/**
 * @fileoverview Worker manager facade for StructureRenderer.
 * Re-exports the shared worker infrastructure from the structure-depicter features.
 */
export {
	rdkitWorker,
	performSubstructureSearchAsync,
	terminateSubstructureSearchWorker,
	getWorkerPoolStats,
	terminateAll,
} from './worker/worker-manager.js';
	