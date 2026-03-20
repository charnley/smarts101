const STORAGE_KEY = 'smarts101-settings';

/**
 * @typedef {Object} Settings
 * @property {1|2|3} columnsPerRow    - Number of molecule cards per row in the grid
 * @property {boolean} explicitHydrogens - Keep explicit H atoms when rendering SDF input
 * @property {boolean} preferCoorDGen    - Use CoordGen layout engine in RDKit
 */

/** @type {Settings} */
const DEFAULTS = {
	columnsPerRow: 3,
	explicitHydrogens: false,
	preferCoorDGen: false,
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
