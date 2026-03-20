/**
 * @fileoverview RDKit Web Worker — generates molecule SVGs and extracts structure info.
 * Runs in a separate thread to keep the UI responsive.
 */

// @ts-nocheck
import initRDKitModule from '@rdkit/rdkit';
import wasmUrl from '@rdkit/rdkit/dist/RDKit_minimal.wasm?url';
import { parseHTML } from 'linkedom';
import { getProperties } from '../../../lib/features/chemistry/molecular-properties.js';

// linkedom gives us DOMParser + document for SVG parsing inside the worker
const { document, DOMParser } = parseHTML('<!DOCTYPE html><html><body></body></html>');
globalThis.DOMParser = DOMParser;
globalThis.document = document;

/** @type {any} */
let rdkit = null;
let isInitialized = false;

async function initRDKit() {
	if (isInitialized) return;
	rdkit = await initRDKitModule({ locateFile: () => wasmUrl });
	isInitialized = true;
	self.postMessage({ type: 'initialized', success: true });
}

function getMolecule(input) {
	if (!rdkit) throw new Error('RDKit not initialized');
	const mol = rdkit.get_mol(input);
	if (!mol) throw new Error('Failed to parse molecule');
	return mol;
}

/** Extract structure info (SMILES, formula, masses) */
function extractStructureDefinition({ definition }) {
	const mol = getMolecule(definition);
	const smiles = mol.get_smiles();
	const molblock = mol.get_v3Kmolblock();
	const properties = getProperties(smiles);
	mol.delete();
	return { smiles, molblock, cleanMolblock: molblock, ...properties };
}

/**
 * Atom colour palettes for light and dark backgrounds.
 * Values are [r, g, b] in 0–1 range (RDKit convention).
 * Extend these objects to tune any element's colour.
 */
const PALETTE_LIGHT = {
	0: [0.1, 0.1, 0.1], // default / unknown
	1: [5, 0, 0], // H
	6: [0, 0, 0], // C  — black
	7: [0, 0, 0.9], // N  — blue
	8: [0.9, 0, 0], // O  — red
	9: [0, 0.5, 0], // F  — green
	15: [0.5, 0, 0.5], // P  — purple
	16: [0.5, 0.25, 0], // S  — brown/orange
	17: [0, 0.5, 0], // Cl — green
	35: [0, 0.5, 0], // Br — green
	53: [0.25, 0, 0.5], // I  — violet
};

const PALETTE_DARK = {
	0: [0.85, 0.85, 0.85], // default / unknown
	1: [0.85, 0.85, 0.85], // H
	6: [1.0, 1.0, 1.0], // C  — light grey
	7: [0.4, 0.6, 1], // N  — light blue
	8: [1, 0.4, 0.4], // O  — light red
	9: [0.2, 0.9, 0.4], // F  — bright green
	15: [0.85, 0.4, 0.85], // P  — light purple
	16: [0.9, 0.75, 0.1], // S  — yellow-orange
	17: [0.2, 0.9, 0.4], // Cl — bright green
	35: [0.2, 0.9, 0.4], // Br — bright green
	53: [0.7, 0.4, 0.9], // I  — light violet
};

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
			case 'extractStructure':
				result = extractStructureDefinition(payload);
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
