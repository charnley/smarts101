/**
 * @fileoverview RDKit Web Worker — generates molecule SVGs and extracts structure info.
 * Runs in a separate thread to keep the UI responsive.
 */

// @ts-nocheck
import { getRDKit, PALETTE_DARK, PALETTE_LIGHT } from '$lib/rdkit/utils.js';
import { parseHTML } from 'linkedom';
// linkedom gives us DOMParser + document for SVG parsing inside the worker
const { document, DOMParser } = parseHTML('<!DOCTYPE html><html><body></body></html>');
globalThis.DOMParser = DOMParser;
globalThis.document = document;

/** @type {any} */
let rdkit = null;

async function initRDKit() {
	rdkit = await getRDKit();
	self.postMessage({ type: 'initialized', success: true });
}

function getMolecule(input) {
	if (!rdkit) throw new Error('RDKit not initialized');
	const mol = rdkit.get_mol(input);
	if (!mol) throw new Error('Failed to parse molecule');
	return mol;
}

/** Generate an SVG with atom/bond class annotations for highlight support */
async function generateStructureSVG({
	moleculeInput,
	width,
	height,
	needsHighlights = true,
	darkMode = false,
	showAtomIndices = false,
	preferCoorDGen = false,
	explicitHydrogens = false,
	userDrawingOptions = {},
}) {
	rdkit.prefer_coordgen(preferCoorDGen);

	const mol = getMolecule(moleculeInput);
	// Only strip explicit H atoms for molblock/SDF input — SMILES rarely has
	// explicit H and stripping on a SMILES-derived mol can drop atoms.
	const isMolblock = moleculeInput.includes('\n');
	if (isMolblock && !explicitHydrogens) mol.remove_hs_in_place();

	const baseOptions = {
		centreMoleculesBeforeDrawing: true,
		addBondIndices: false,
		bondLineWidth: 2.0,
		multipleBondOffset: 0.25,
		fixedScale: 0.08,
		baseFontSize: 0.8,
		minFontSize: -1,
		maxFontSize: -1,
		highlightBondWidthMultiplier: 20,
		dummyIsotopeLabels: false,
		atomColourPalette: darkMode ? PALETTE_DARK : PALETTE_LIGHT,
		// Always transparent — the CSS/card background shows through
		backgroundColour: [0, 0, 0, 0],
		singleColourWedgeBonds: true,
		addStereoAnnotation: true,
		addAtomIndices: showAtomIndices,
		...userDrawingOptions,
		width: parseInt(`${width}`),
		height: parseInt(`${height}`),
	};

	// First pass: get bond→atom mapping
	const rawSvg = mol.get_svg_with_highlights(JSON.stringify(baseOptions));
	const rawEl = new DOMParser().parseFromString(rawSvg, 'text/xml').documentElement;
	const paths = rawEl.querySelectorAll('path[class^="bond-"]');

	const bondAtomsMap = {};
	const atomBondsMap = {};
	paths.forEach((path) => {
		const classes = [...path.classList];
		const bondId = parseInt(classes.find((c) => c.startsWith('bond-'))?.replace('bond-', ''));
		const atoms = classes
			.filter((c) => c.startsWith('atom-'))
			.map((c) => parseInt(c.replace('atom-', '')));
		atoms.forEach((atom) => {
			if (!atomBondsMap[atom]) atomBondsMap[atom] = [];
			if (!atomBondsMap[atom].includes(bondId)) atomBondsMap[atom].push(bondId);
		});
		if (!bondAtomsMap[bondId]) bondAtomsMap[bondId] = [];
		bondAtomsMap[bondId].push(atoms);
	});

	let finalSvg, viewBox;
	if (needsHighlights) {
		const allAtoms = Object.keys(atomBondsMap).map(Number);
		const allBonds = Object.keys(bondAtomsMap).map(Number);
		const svg = mol.get_svg_with_highlights(
			JSON.stringify({
				...baseOptions,
				atoms: allAtoms,
				bonds: allBonds,
				highlightColour: [1, 1, 1, 0],
			}),
		);
		const el = new DOMParser().parseFromString(svg, 'text/xml').documentElement;
		viewBox = el.getAttribute('viewBox') || `0 0 ${width} ${height}`;
		finalSvg = el.toString?.() ?? el.outerHTML;
	} else {
		viewBox = rawEl.getAttribute('viewBox') || `0 0 ${width} ${height}`;
		finalSvg = rawEl.toString?.() ?? rawEl.outerHTML;
	}

	mol.delete();
	return { svg: finalSvg, bondAtomsMap, atomBondsMap, viewBox };
}

/** Generate an SVG for a SMARTS query molecule using get_qmol */
async function generateQuerySVG({ smartsInput, width, height, darkMode = false }) {
	if (!rdkit) throw new Error('RDKit not initialized');
	const mol = rdkit.get_qmol(smartsInput);
	if (!mol) throw new Error('Invalid SMARTS');

	const options = {
		centreMoleculesBeforeDrawing: true,
		bondLineWidth: 2.0,
		multipleBondOffset: 0.25,
		fixedScale: 0.08,
		baseFontSize: 0.8,
		minFontSize: -1,
		maxFontSize: -1,
		atomColourPalette: darkMode ? PALETTE_DARK : PALETTE_LIGHT,
		backgroundColour: [0, 0, 0, 0],
		width: parseInt(`${width}`),
		height: parseInt(`${height}`),
	};

	const svg = mol.get_svg_with_highlights(JSON.stringify(options));
	const el = new DOMParser().parseFromString(svg, 'text/xml').documentElement;
	const viewBox = el.getAttribute('viewBox') || `0 0 ${width} ${height}`;
	const finalSvg = el.toString?.() ?? el.outerHTML;
	mol.delete();
	return { svg: finalSvg, viewBox };
}

self.onmessage = async (event) => {
	const { id, type, payload } = event.data;
	try {
		let result;
		switch (type) {
			case 'init':
				await initRDKit();
				result = { initialized: true };
				break;
			case 'generateSVG':
				result = await generateStructureSVG(payload);
				break;
			case 'generateQuerySVG':
				result = await generateQuerySVG(payload);
				break;
			default:
				throw new Error(`Unknown message type: ${type}`);
		}
		self.postMessage({ id, type: 'success', result });
	} catch (err) {
		self.postMessage({ id, type: 'error', error: err.message });
	}
};

initRDKit();
