/** Tunable numbers shared across the app. */

/** Wait after the last keystroke before parsing/validating the SMARTS in the editor. */
export const SMARTS_INPUT_DEBOUNCE_MS = 350;

/** Wait before re-running reaction mode after the SMARTS or molecules change. */
export const REACTION_DEBOUNCE_MS = 400;

/** Wait before starting a Smarter SMARTS search; it is heavier than the highlight search. */
export const GENERATE_DEBOUNCE_MS = 2 * SMARTS_INPUT_DEBOUNCE_MS;

/** Molecules searched per round trip to the Smarter SMARTS worker. */
export const SMARTER_SMARTS_BATCH_SIZE = 20_000;

/** Workers in each RDKit pool (see `worker-manager.js`). */
export const RENDER_POOL_SIZE = 2;
export const SEARCH_POOL_SIZE = 2;
export const REACTION_POOL_SIZE = 1;

/** Workers computing SMARTS match outlines (see `outlining.js`). */
export const OUTLINE_POOL_SIZE = 2;

/** A worker request that gets no reply within this time is rejected. */
export const WORKER_TIMEOUT_MS = 30_000;
