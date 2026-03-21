/**
 * @fileoverview Step 1 — Generate the base molecule SVG.
 *
 * Calls the RDKit worker to produce an SVG string and injects it into the
 * container's `.structure-shell` element.
 */

import { rdkitWorker } from './worker-manager.js';

/**
 * @typedef {Object} GenerateSVGOptions
 * @property {string} definition - Molecule input (SMILES, molblock, …)
 * @property {Element} container - DOM container that holds `.structure-shell`
 * @property {number} width - Fallback width when container has no layout
 * @property {number} height - Fallback height when container has no layout
 * @property {Object} [userDrawingOptions] - Extra options forwarded to the worker
 * @property {boolean} [showBondIndices] - Whether to render bond index notes
 * @property {boolean} [needsHighlights] - Whether highlights metadata is needed
 */

/**
 * @typedef {Object} GenerateSVGResult
 * @property {SVGSVGElement} svgRoot - The injected `<svg>` element
 * @property {string} svgViewBox - ViewBox string ("minX minY w h")
 * @property {Object.<number, number[][]>} bondAtomsMap - Bond index → atom-hook arrays
 * @property {Object.<number, number[]>} atomBondsMap - Atom index → bond indices
 */

/**
 * Generate the base molecule SVG and inject it into the container.
 *
 * @param {GenerateSVGOptions} options
 * @returns {Promise<GenerateSVGResult>}
 */
export async function generateMoleculeSVG({
	definition,
	container,
	width,
	height,
	userDrawingOptions = {},
	showBondIndices = false,
	needsHighlights = false,
}) {
	if (!container?.querySelector) {
		throw new Error('Container element is required');
	}

	const dimensions = container.getBoundingClientRect();

	const outcome = await rdkitWorker.generateSVG({
		...userDrawingOptions,
		moleculeInput: definition,
		width: dimensions.width || width,
		height: dimensions.height || height,
		showBondIndices: showBondIndices ?? false,
		needsHighlights,
	});

	if (!outcome?.svg) {
		throw new Error('No SVG output from RDKit');
	}

	// @ts-ignore
	container.querySelector('.structure-shell').innerHTML = outcome.svg;

	const svgRoot = /** @type {SVGSVGElement} */ (container.querySelector('.structure-shell svg'));
	const svgViewBox =
		svgRoot?.getAttribute('viewBox') || outcome.viewBox || `0 0 ${width} ${height}`;
	const bondAtomsMap = outcome.bondAtomsMap || {};
	const atomBondsMap = outcome.atomBondsMap || {};

	// @ts-ignore
	return { svgRoot, svgViewBox, bondAtomsMap, atomBondsMap };
}
