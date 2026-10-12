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

const range = (n) => Array.from({ length: n }, (_, i) => i);

/**
 * Every atom and bond is highlighted transparently so the drawing is identical
 * with or without SMARTS highlights, and highlight shapes exist for outlining.
 */
async function generateStructureSVG({
	moleculeInput,
	width,
	height,
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

	const options = {
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
		clearBackground: false,
		singleColourWedgeBonds: true,
		addStereoAnnotation: true,
		addAtomIndices: showAtomIndices,
		...userDrawingOptions,
		atoms: range(mol.get_num_atoms()),
		bonds: range(mol.get_num_bonds()),
		highlightColour: [1, 1, 1, 0],
		standardColoursForHighlightedAtoms: true,
		// width: width,
		// height: height,
		width: parseInt(`${width}`),
		height: parseInt(`${height}`),
	};

	const svg = mol.get_svg_with_highlights(JSON.stringify(options));
	mol.delete();
	return { svg };
}

/** Generate an SVG for a SMARTS query molecule using get_qmol */
async function generateQuerySVG({ smartsInput, width, height, darkMode = false }) {
	if (!rdkit) throw new Error('RDKit not initialized');
	const mol = rdkit.get_qmol(smartsInput);
	if (!mol) throw new Error('Invalid SMARTS');

	const options = {
		...getDrawingOptions({ darkMode, centreMoleculesBeforeDrawing: true }),
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
