const STORAGE_KEY = 'smarts101-settings';

/**
 * @typedef {Object} Settings
 * @property {'auto'|1|2|3|4} columnsPerRow - Molecule cards per row; 'auto' adapts to the screen width
 * @property {boolean} explicitHydrogens - Keep explicit H atoms when rendering SDF input
 * @property {boolean} useCoordgen    - Use CoordGen layout engine in RDKit
 * @property {boolean} filterMatchesOnly - Only show molecules that match the active SMARTS pattern
 * @property {boolean} highlightRecursive - Highlight the inner pattern of recursive SMARTS under cursor
 */

/** @type {Settings} */
const DEFAULTS = {
	columnsPerRow: 'auto',
	explicitHydrogens: false,
	useCoordgen: false,
	filterMatchesOnly: false,
	highlightRecursive: true,
};

/**
 * Load persisted settings from localStorage.
 * Returns an empty object if nothing is stored or parsing fails.
 * @returns {Partial<Settings>}
 */
function loadFromStorage() {
	if (typeof localStorage === 'undefined') return {};
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
	} catch {
		return {};
	}
}

/**
 * Reactive settings object. Import this anywhere in the app to read or write settings.
 * Changes are automatically persisted to localStorage.
 *
 * @type {Settings}
 */
export const settings = $state({ ...DEFAULTS, ...loadFromStorage() });

// Persist every change back to localStorage.
$effect.root(() => {
	$effect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	});
});
