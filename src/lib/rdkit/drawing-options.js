import { DEFAULT_DARK, DEFAULT_LIGHT, PALETTE_DARK, PALETTE_LIGHT } from './utils.js';

/**
 * Single place that defines how molecules look. Every RDKit drawing goes
 * through `getDrawingOptions`, so a future user setting only needs to pass
 * overrides here.
 */

/** Options shared by every drawing. */
export const BASE_DRAWING_OPTIONS = {
	bondLineWidth: 2.0,
	multipleBondOffset: 0.25,
	fixedScale: 0.08,
	baseFontSize: 0.8,
	minFontSize: -1,
	maxFontSize: -1,
	clearBackground: false,
};

/** Extra options for target molecules (structures that get SMARTS highlights). */
export const STRUCTURE_DRAWING_OPTIONS = {
	addBondIndices: false,
	highlightBondWidthMultiplier: 20,
	dummyIsotopeLabels: false,
	singleColourWedgeBonds: true,
	addStereoAnnotation: true,
};

/**
 * @param {{ isDarkMode?: boolean } & Record<string, any>} [params]
 *   `isDarkMode` selects the atom palette; everything else overrides the defaults.
 * @returns {Record<string, any>}
 */
export function getDrawingOptions({ isDarkMode = false, ...overrides } = {}) {
	// RDKit's default bondNoteColour is light blue; keep all labels in the
	// same foreground colour as the atoms.
	const noteColour = isDarkMode ? DEFAULT_DARK : DEFAULT_LIGHT;
	return {
		...BASE_DRAWING_OPTIONS,
		atomColourPalette: isDarkMode ? PALETTE_DARK : PALETTE_LIGHT,
		atomNoteColour: noteColour,
		bondNoteColour: noteColour,
		annotationColour: noteColour,
		...overrides,
	};
}
