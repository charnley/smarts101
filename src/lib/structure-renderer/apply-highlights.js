import { createSurroundingOutline } from './outlining.js';
import { runSmartsSearch } from './smarts-search.js';
import { highlightFillColor } from './color-utils.js';

const OUTLINE_WIDTH = 2.5;

/**
 * @typedef {Object} HighlightConfig
 * @property {any[]} [definitions]
 * @property {boolean} [outline]
 * @property {boolean} [fill]
 */

/**
 * Search SMARTS patterns and build one outline group per match instance.
 *
 * @param {Object} options
 * @param {import('./outlining.js').ShapeIndex} options.shapeIndex
 * @param {HighlightConfig} options.highlights
 * @param {string} options.definition
 * @returns {Promise<{ groups: SVGGElement[], matched: boolean }>}
 */
export async function buildHighlights({ shapeIndex, highlights, definition }) {
	const highlightMatches = await runSmartsSearch(highlights.definitions ?? [], definition);

	const strokeWidth = highlights.outline !== false ? OUTLINE_WIDTH : 0;
	const atomCounts = new Map();
	const bondCounts = new Map();
	/** @type {Promise<SVGGElement>[]} */
	const jobs = [];

	for (const { color, name, id, matches } of highlightMatches) {
		const instances = Array.isArray(matches) ? matches : [matches];
		const fill = highlightFillColor(color, highlights.fill === true);

		instances.forEach((match, i) => {
			const overlap = Math.max(
				0,
				...match.atoms.map((/** @type {number} */ a) => atomCounts.get(a) ?? 0),
				...match.bonds.map((/** @type {number} */ b) => bondCounts.get(b) ?? 0),
			);
			for (const a of match.atoms) atomCounts.set(a, (atomCounts.get(a) ?? 0) + 1);
			for (const b of match.bonds) bondCounts.set(b, (bondCounts.get(b) ?? 0) + 1);

			jobs.push(
				createSurroundingOutline({
					match,
					shapeIndex,
					color,
					fill: fill !== 'none' ? fill : undefined,
					id: `${id}-${i}`,
					name: `${name} ${i + 1}`,
					overlap,
					strokeWidth,
					extraOffset: 2,
				}),
			);
		});
	}

	const groups = (await Promise.all(jobs)).filter((g) => g.children.length > 0);
	return { groups, matched: highlightMatches.length > 0 };
}
