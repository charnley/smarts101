/**
 * @fileoverview RDKit Web Worker for offloading heavy molecular rendering computations
 * This worker handles all RDKit operations in a separate thread to keep the UI responsive
 */

// @ts-nocheck
import initRDKitModule from '@rdkit/rdkit';
import wasmUrl from '@rdkit/rdkit/dist/RDKit_minimal.wasm?url';
import { getProperties } from '$lib/features/chemistry/molecular-properties.js';
import { MONOMER_COLORS, RDKIT_DEFAULT_OPTIONS } from '../constants.js';

import { parseHTML } from 'linkedom';

// Linkedom provides DOMParser + document for SVG parsing in the worker
// Linkedom provides DOMParser + document for SVG parsing in the worker
const { document, DOMParser } = parseHTML('<!DOCTYPE html><html><body></body></html>');

globalThis.DOMParser = DOMParser;
globalThis.document = document;

const TRACE_PREFIX = '[RDKit Worker]';

/** @type {any} */
let rdkit = null;
let isInitialized = false;

console.debug(`${TRACE_PREFIX} Worker script loaded`);

/**
 * Initialize RDKit module
 */
async function initRDKit() {
	console.debug(`${TRACE_PREFIX} initRDKit() called, isInitialized=${isInitialized}`);
	if (isInitialized) {
		console.debug(`${TRACE_PREFIX} Already initialized, skipping`);
		return;
	}
	try {
		console.debug(`${TRACE_PREFIX} Initializing RDKit module...`);
		console.debug(`${TRACE_PREFIX} WASM URL: ${wasmUrl}`);
		rdkit = await initRDKitModule({ locateFile: () => wasmUrl });
		isInitialized = true;
		console.debug(`${TRACE_PREFIX} RDKit initialized successfully`);
		self.postMessage({ type: 'initialized', success: true });
	} catch (error) {
		console.error(`${TRACE_PREFIX} Failed to initialize RDKit:`, error);
		self.postMessage({
			type: 'error',
			error: `Failed to initialize RDKit: ${error.message}`
		});
	}
}

/**
 * Get molecule from various input formats
 * @param {string} input - SMILES, molblock, or other supported format
 * @returns {any} RDKit molecule object
 */
function getMolecule(input) {
	console.debug(`${TRACE_PREFIX} getMolecule() called, input length: ${input?.length || 0}`);
	if (!rdkit) {
		console.error(`${TRACE_PREFIX} RDKit not initialized!`);
		throw new Error('RDKit not initialized');
	}

	try {
		// Try as molblock first
		// rdkit.prefer_coordgen(false);
		const mol = rdkit.get_mol(input);
		console.debug(`${TRACE_PREFIX} Molecule parsed successfully`, { input, mol });
		return mol;
	} catch (error) {
		console.error(`${TRACE_PREFIX} Failed to parse molecule:`, { error, input });
		throw new Error(`Failed to parse molecule: ${error.message}`);
	}
}

/**
 * Extract structure definition from SMILES, molblock, reaction SMARTS, or monomer definition
 * @param {Object} params - Structure definition
 * @param {string} params.definition - Structure definition
 * @returns {Object} Structure details
 */
function extractStructureDefinition({ definition }) {
	console.debug(`${TRACE_PREFIX} extractStructureDefinition() called`, { definition });
	try {
		const mol = getMolecule(definition);

		console.debug(`${TRACE_PREFIX} Molecule obtained`, { definition, mol });
		// // Ensure 2D coordinates
		// if (!mol.has_coords()) {
		// 	mol.set_new_coords(true);
		// }

		const cleanMolblock = mol.get_v3Kmolblock();
		const smiles = mol.get_smiles();

		const properties = getProperties(smiles);

		console.debug(`${TRACE_PREFIX} Extracted properties`, { properties, cleanMolblock, smiles });

		// For now, return basic structure - sites and annotations would be parsed differently
		// based on specific format (reaction SMARTS, monomer definitions, etc.)
		const result = {
			cleanMolblock,
			molblock: cleanMolblock,
			smiles,
			...properties,
			sites: {}, // Would be populated from reaction SMARTS parsing
			annotations: new Map(), // Would be populated from monomer definition parsing
			atoms: [],
			bonds: []
		};

		mol.delete();
		console.debug(`${TRACE_PREFIX} Structure extracted successfully`, result);
		return result;
	} catch (error) {
		console.error(`${TRACE_PREFIX} Failed to extract structure:`, error);
		throw new Error(`Failed to extract structure: ${error.message}`);
	}
}

/**
 * Generate full SVG with bond/atom mapping
 * @param {Object} params
 * @param {string} params.moleculeInput - Structure definition
 * @param {number} params.width - SVG width
 * @param {number} params.height - SVG height
 * @param {Object} params.sites - Reaction sites
 * @param {Map} params.annotations - Monomer annotations
 * @param {Object} params.userDrawingOptions - User drawing options
 * @returns {Object} SVG and mappings
 */
async function generateStructureSVG({ moleculeInput, width, height, sites = {}, annotations, userDrawingOptions = {}, needsHighlights = true }) {
	console.debug(`${TRACE_PREFIX} generateStructureSVG() called`, {
		definitionLength: moleculeInput?.length || 0,
		width,
		height,
		sitesCount: Object.keys(sites).length,
		annotationsCount: annotations?.size || 0,
		needsHighlights,
		userDrawingOptions,
		...{ moleculeInput, width, height, sites, annotations, userDrawingOptions }
	});
	try {
		const mol = getMolecule(moleculeInput);
		// mol.set_new_coords(true); // Ensure 2D coordinates for consistent SVG generation
		// mol.set_new_coords();
		// mol.straighten_depiction();

		console.debug(`${TRACE_PREFIX} Molecule obtained for SVG generation`, { moleculeInput, mol, molblock: mol.get_v3Kmolblock() });
		const rawOptions = {
			...RDKIT_DEFAULT_OPTIONS,
			...userDrawingOptions,
			centreMoleculesBeforeDrawing: true,
			width: parseInt(`${width}`),
			height: parseInt(`${height}`),
			recompute2d: false,
			explicitMethyl: true,
		};

		// Get basic SVG first to extract bond-atom relationships
		const rawSvg = mol.get_svg_with_highlights(JSON.stringify(rawOptions));
		const rawSvgElement = new DOMParser().parseFromString(rawSvg, 'text/xml').documentElement;
		const paths = rawSvgElement.querySelectorAll('path[class^="bond-"]');

		// Build bond-atom mappings from the raw SVG
		const bondAtomsMap = {};
		const atomBondsMap = {};

		paths.forEach((path) => {
			const classes = [...path.classList];
			const bond = classes.find((c) => c.startsWith('bond-'))?.replace('bond-', '');
			const bondId = parseInt(bond);
			const atoms = classes
				.filter((c) => c.startsWith('atom-'))
				.map((c) => parseInt(c?.replace('atom-', '')));

			atoms.forEach((atom) => {
				if (!atomBondsMap[atom]) {
					atomBondsMap[atom] = [];
				}
				if (!atomBondsMap[atom].includes(bondId)) {
					atomBondsMap[atom].push(bondId);
				}
			});

			if (!bondAtomsMap[bondId]) {
				bondAtomsMap[bondId] = [];
			}
			bondAtomsMap[bondId].push(atoms);
		});

		let finalSvg;
		let viewBox;

		if (needsHighlights) {
			// Prepare options for highlighted SVG with all atoms and bonds
			const allAtoms = Array.from(Object.keys(atomBondsMap)).map(k => parseInt(k));
			const allBonds = Array.from(Object.keys(bondAtomsMap)).map(k => parseInt(k));

			const options = {
				...rawOptions,
				atoms: allAtoms,
				bonds: allBonds,
				highlightColour: [1, 1, 1, 0]
			};

			// Generate final SVG with all highlights (adds atom-X/bond-Y classes)
			const svg = mol.get_svg_with_highlights(JSON.stringify(options));
			const svgElement = new DOMParser().parseFromString(svg, 'text/xml').documentElement;
			viewBox = svgElement.getAttribute('viewBox') || `0 0 ${width} ${height}`;
			finalSvg = serializeSvgElement(svgElement);
		} else {
			// No highlights needed — use the raw SVG directly (faster)
			viewBox = rawSvgElement.getAttribute('viewBox') || `0 0 ${width} ${height}`;
			finalSvg = serializeSvgElement(rawSvgElement);
		}

		mol.delete();

		console.debug(`${TRACE_PREFIX} Structure SVG generated successfully`, {
			bondAtomsMap,
			atomBondsMap,
			viewBox,
			needsHighlights
		});
		return {
			svg: finalSvg,
			bondAtomsMap,
			atomBondsMap,
			viewBox
		};
	} catch (error) {
		console.error(`${TRACE_PREFIX} Failed to generate structure SVG:`, error);
		throw new Error(`Failed to generate structure SVG: ${error.message}`);
	}
}

/**
 * Serialize SVG element to string (worker-safe, no XMLSerializer)
 * @param {any} element - SVG element
 * @returns {string} SVG string
 */
function serializeSvgElement(element) {
	// Use toString() if available (linkedom)
	if (typeof element.toString === 'function') {
		return element.toString();
	}
	
	// Fallback to outerHTML
	if (element.outerHTML) {
		return element.outerHTML;
	}
	
	// Manual serialization as last resort
	const tag = element.tagName;
	const attrs = Array.from(element.attributes || [])
		.map(attr => `${attr.name}="${escapeXml(attr.value)}"`)
		.join(' ');
	
	if (element.children && element.children.length > 0) {
		const children = Array.from(element.children)
			.map(child => serializeSvgElement(child))
			.join('');
		return `<${tag} ${attrs}>${children}</${tag}>`;
	} else {
		const content = element.textContent || '';
		return content ? `<${tag} ${attrs}>${escapeXml(content)}</${tag}>` : `<${tag} ${attrs}/>`;
	}
}

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/**
 * Get substructure match
 * @param {string} moleculeInput - Molecule definition
 * @param {string} queryInput - Query molecule definition
 */
function getSubstructMatch(moleculeInput, queryInput) {
	console.debug(`${TRACE_PREFIX} getSubstructMatch() called`);
	try {
		const mol = getMolecule(moleculeInput);
		const query = getMolecule(queryInput);

		const match = mol.get_substruct_match(query);
		console.debug(`${TRACE_PREFIX} Substructure match result:`, match);

		mol.delete();
		query.delete();

		return match;
	} catch (error) {
		console.error(`${TRACE_PREFIX} Failed to get substructure match:`, error);
		throw new Error(`Failed to get substructure match: ${error.message}`);
	}
}

/**
 * Clean up molecule coordinates (2D generation)
 * @param {string} moleculeInput - Molecule definition
 */
function cleanMolecule(moleculeInput) {
	console.debug(`${TRACE_PREFIX} cleanMolecule() called`);
	try {
		const mol = getMolecule(moleculeInput);

		// Add 2D coordinates if needed
		const needs2D = !mol.has_2d_coords();
		if (needs2D) {
			mol.set_2d_coords();
		}

		const cleanMolblock = mol.get_molblock();
		console.debug(`${TRACE_PREFIX} Molecule cleaned, generated2D: ${needs2D}`, {
			cleanMolblock,
			generated2D: needs2D
		});
		mol.delete();

		return { cleanMolblock, generated2D: needs2D };
	} catch (error) {
		console.error(`${TRACE_PREFIX} Failed to clean molecule:`, error);
		throw new Error(`Failed to clean molecule: ${error.message}`);
	}
}

/**
 * Message handler
 */
self.onmessage = async (event) => {
	const { id, type, payload } = event.data;
	console.debug(`${TRACE_PREFIX} Message received:`, { id, type, payload });

	try {
		let result;

		switch (type) {
			case 'init':
				console.debug(`${TRACE_PREFIX} Processing 'init' message`);
				await initRDKit();
				result = { initialized: true };
				break;

			case 'extractStructure':
				console.debug(`${TRACE_PREFIX} Processing 'extractStructure' message`);
				result = extractStructureDefinition(payload);
				break;

			case 'generateStructureSVG':
				console.debug(`${TRACE_PREFIX} Processing 'generateStructureSVG' message`);
				result = await generateStructureSVG(payload);
				break;

			case 'generateSVG':
				console.debug(`${TRACE_PREFIX} Processing 'generateSVG' message`, payload);
				result = await generateStructureSVG(payload);
				break;

			case 'getSubstructMatch':
				console.debug(`${TRACE_PREFIX} Processing 'getSubstructMatch' message`);
				result = getSubstructMatch(payload.moleculeInput, payload.queryInput);
				break;

			case 'cleanMolecule':
				console.debug(`${TRACE_PREFIX} Processing 'cleanMolecule' message`);
				result = cleanMolecule(payload.moleculeInput);
				break;

			default:
				console.error(`${TRACE_PREFIX} Unknown message type: ${type}`);
				throw new Error(`Unknown message type: ${type}`);
		}

		console.debug(`${TRACE_PREFIX} Sending success response for id: ${id}`);
		self.postMessage({
			id,
			type: 'success',
			result
		});
	} catch (error) {
		console.error(`${TRACE_PREFIX} Error processing message id ${id}:`, error);
		self.postMessage({
			id,
			type: 'error',
			error: error.message
		});
	}
};

// Auto-initialize on worker creation
console.debug(`${TRACE_PREFIX} Auto-initializing worker...`);
initRDKit();
