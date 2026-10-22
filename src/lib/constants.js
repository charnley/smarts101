/** Tunable numbers shared across the app. */

/* Wait after the last keystroke before parsing and validating the SMARTS in the editor. */
export const SMARTS_INPUT_DEBOUNCE_MS = 350;

/* Wait before re-running reaction mode after the SMARTS or the molecules change. */
export const REACTION_DEBOUNCE_MS = 400;

/* Wait before starting a Smarter SMARTS search, which is heavier than the highlight search. */
export const GENERATE_DEBOUNCE_MS = 2 * SMARTS_INPUT_DEBOUNCE_MS;

/* Number of molecules searched per round trip to the Smarter SMARTS worker. */
export const SMARTER_SMARTS_BATCH_SIZE = 20_000;

/* Maximum number of molecules the Generate tab returns for one SMARTS; enforced by the worker. */
export const MAX_GENERATED_RESULTS = 200;

/* Number of workers in the RDKit pool that draws molecules. */
export const RENDER_POOL_SIZE = 2;

/* Number of workers in the RDKit pool that runs SMARTS substructure searches. */
export const SEARCH_POOL_SIZE = 2;

/* Number of workers in the RDKit pool that runs reactions. */
export const REACTION_POOL_SIZE = 1;

/* Number of workers that compute the outlines drawn around SMARTS matches. */
export const OUTLINE_POOL_SIZE = 2;

/* A worker request with no reply after this long is rejected as timed out. */
export const WORKER_TIMEOUT_MS = 30_000;
