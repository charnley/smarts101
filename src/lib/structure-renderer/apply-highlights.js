/**
 * @fileoverview Step 2 — Match SMARTS patterns and render highlight outlines onto the SVG.
 *
 * Delegates substructure search to `runSmartsSearch`, then renders a surrounding
 * outline for each match.
 */

import { createSurroundingOutline } from './outlining.js';
import { runSmartsSearch } from './smarts-search.js';
import { highlightFillColor } from './color-utils.js';

/**
 * @typedef {Object} HighlightConfig
 * @property {any[]} [definitions] - Array of SMARTS pattern definitions
 * @property {boolean} [outline] - Whether to draw outlines (default: true)
 * @property {boolean} [fill] - Whether to fill the outlines (default: false)
 */

/**
 * @typedef {Object} ApplyHighlightsOptions
 * @property {SVGSVGElement} svgRoot - Root SVG element
 * @property {string} svgViewBox - ViewBox string for outline calculations
 * @property {HighlightConfig} highlights - Highlight configuration
 * @property {string} definition - Molecule definition for the substructure search
 */

/**
 * @typedef {Object} ApplyHighlightsResult
 * @property {Array<{id: string, name: string, query: string[], color: string|number[], atoms: number[], bonds: number[]}>} detectedMatches
 */

const OUTLINE_WIDTH = 2.5;

/**
 * Search SMARTS patterns, render outlines for every match, and return detected matches.
 *
 * @param {ApplyHighlightsOptions} options
 * @returns {Promise<ApplyHighlightsResult>}
 */
export async function applyHighlights({ svgRoot, svgViewBox, highlights, definition }) {
	if (!highlights?.definitions?.length) return { detectedMatches: [] };

	const shouldOutline = highlights.outline !== false;
	const shouldFill = highlights.fill === true;
	const definitions = Array.isArray(highlights.definitions) ? highlights.definitions : [];

	const { highlightMatches, detectedMatches } = await runSmartsSearch(definitions, definition);

	if (highlightMatches.length > 0) {
		const atomOverlapCounts = new Map();
		const bondOverlapCounts = new Map();

		for (const meta of highlightMatches) {
			const { color, name: matchName, id: matchId, matches: matchInstances } = meta;
			const instancesArr = Array.isArray(matchInstances) ? matchInstances : [matchInstances];

			for (let i = 0; i < instancesArr.length; i++) {
				const match = instancesArr[i];
				const fillColor = highlightFillColor(color, shouldFill);

				try {
					const outlineGroup = await createSurroundingOutline({
						match,
						color,
						fill: fillColor !== 'none' ? fillColor : undefined,
						id: `${matchId}-${i}`,
						name: `${matchName} ${i + 1}`,
						svgRoot,
						viewBox: svgViewBox,
						atomOverlapCounts,
						bondOverlapCounts,
						strokeWidth: shouldOutline ? OUTLINE_WIDTH : 0,
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
						`[StructureRenderer] Error creating outline for match ${matchId}-${i}:`,
						error,
					);
				}
			}
		}

		// Post-process: make RDKit highlight circles/ellipses invisible
		svgRoot.querySelectorAll('circle, ellipse').forEach((/** @type {Element} */ el) => {
			// @ts-ignore
			el.style.fill = 'transparent';
			// @ts-ignore
			el.style.stroke = 'transparent';
			// @ts-ignore
			el.style.strokeWidth = el.style.strokeWidth || '2px';
		});
	}

	return { detectedMatches };
}
