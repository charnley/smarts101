/**
 * @fileoverview Step 2 — Match SMARTS patterns and render softspot outlines onto the SVG.
 *
 * Delegates substructure search to `runSmartsSearch`, then renders a surrounding
 * outline for each matched softspot.
 */

import { createSurroundingOutline } from './outlining.js';
import { runSmartsSearch } from './softspot-search.js';
import { softspotFillColor } from './color-utils.js';

/**
 * @typedef {Object} SoftspotsConfig
 * @property {any[]} [definitions] - Array of SMARTS pattern definitions
 * @property {boolean} [outline] - Whether to draw outlines (default: true)
 * @property {boolean} [fill] - Whether to fill the outlines (default: false)
 */

/**
 * @typedef {Object} ApplySoftspotsOptions
 * @property {SVGSVGElement} svgRoot - Root SVG element
 * @property {string} svgViewBox - ViewBox string for outline calculations
 * @property {SoftspotsConfig} softspots - Softspot configuration
 * @property {string} definition - Molecule definition for the substructure search
 */

/**
 * @typedef {Object} ApplySoftspotsResult
 * @property {Array<{id: string, name: string, query: string[], color: string|number[], atoms: number[], bonds: number[]}>} detectedSoftspots
 */

/**
 * Search SMARTS patterns, render outlines for every match, and return detected softspots.
 *
 * @param {ApplySoftspotsOptions} options
 * @returns {Promise<ApplySoftspotsResult>}
 */
export async function applySoftspots({
	svgRoot,
	svgViewBox,
	softspots,
	definition,
}) {
	if (!softspots?.definitions?.length)
		return { detectedSoftspots: [] };

	const shouldOutline = softspots.outline !== false;
	const shouldFill = softspots.fill === true;
	const smartsArray = Array.isArray(softspots.definitions)
		? softspots.definitions
		: [];

	const { smartsMetadata, detectedSoftspots } = await runSmartsSearch(
		smartsArray,
		definition
	);

	if (smartsMetadata.length > 0) {
		const processedAtoms = new Map();
		const processedBonds = new Map();

		for (const meta of smartsMetadata) {
			const {
				color,
				name: ssName,
				id: ssId,
				softspots: ssSpots,
			} = meta;
			const spotsArr = Array.isArray(ssSpots) ? ssSpots : [ssSpots];

			for (let i = 0; i < spotsArr.length; i++) {
				const spot = spotsArr[i];
				const fillColor = softspotFillColor(color, shouldFill);

				try {
					const outlineGroup = await createSurroundingOutline({
						softspot: spot,
						color,
						fill: fillColor !== 'none' ? fillColor : undefined,
						id: `${ssId}-${i}`,
						name: `${ssName} ${i + 1}`,
						svgRoot,
						viewBox: svgViewBox,
						processedAtoms,
						processedBonds,
						strokeWidth: shouldOutline ? 1.5 : 0,
						extraOffset: 2,
						outlineOptions: {
							outerOnly: true,
							mergeClusters: true,
						},
					});

					if (outlineGroup.children.length > 0) {
						svgRoot.prepend(outlineGroup);
					}
				} catch (error) {
					console.error(
						`[StructureRenderer] Error creating outline for softspot ${ssId}-${i}:`,
						error
					);
				}
			}
		}

		// Post-process: make RDKit highlight circles/ellipses invisible
		svgRoot
			.querySelectorAll('circle, ellipse')
			.forEach((/** @type {Element} */ el) => {
				// @ts-ignore
				el.style.fill = 'transparent';
				// @ts-ignore
				el.style.stroke = 'transparent';
				// @ts-ignore
				el.style.strokeWidth = el.style.strokeWidth || '2px';
			});
	}

	return { detectedSoftspots };
}
