/**
 * Monomer color definitions for rendering sequences
 * @type {Record<string, string>}
 */
export const MONOMER_COLORS = {
    A: '#51baff',
    G: '#ff5e4d',
    C: '#ffad41ff',
    U: '#ffff00',
    T: '#00e614',
    Q: '#ff00ff',
    linker: '#e0acacff',
    TAG: '#785620',
};

export const RDKIT_DEFAULT_OPTIONS = {
	centerMoleculeBeforeDraw: true,
	addBondIndices: true,
	bondLineWidth: 0.75,
	multipleBondOffset: 0.25,
	fixedScale: 0.08,
	baseFontSize: 0.8,
	minFontSize: -1,
	maxFontSize: -1,
	annotationFontScale: 0.75,
	highlightBondWidthMultiplier: 20,
	dummyIsotopeLabels: false,
	atomColourPalette: {
		0: [0.1, 0.1, 0.1],
		1: [0, 0, 0],
		6: [0, 0, 0],
		7: [0, 0, 1],
		8: [1, 0, 0],
		9: [0, 0.498, 0],
		15: [0.498, 0, 0.498],
		16: [0.498, 0.247, 0],
		17: [0, 0.498, 0],
		35: [0, 0.498, 0],
		53: [0.247, 0, 0.498]
	},
	backgroundColour: [1, 1, 1, 0],
	singleColourWedgeBonds: true,
	atomLabelDeuteriumTritium: true,
	addStereoAnnotation: true,
	useComplexQueryAtomSymbols: true
};    