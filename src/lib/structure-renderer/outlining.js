import OutlineWorker from './worker/surrounding-outline.worker.js?worker';
import { OUTLINE_POOL_SIZE } from '$lib/constants.js';
import { hexToRgbaArray, rgbaArrayToString } from './color-utils.js';

const NS = 'http://www.w3.org/2000/svg';
const BASE_OFFSET = 2;
/** Fallback band half-width at the reference size, when RDKit drew no atom shapes. */
const DEFAULT_BAND_RADIUS = 7;
/** Drawing height (viewBox units) at which BASE_OFFSET and friends were tuned. */
const REFERENCE_SIZE = 220;

/**
 * @typedef {Object} ShapeDescriptor
 * @property {'path'|'circle'|'ellipse'|'line'|'rect'} type
 * @property {string}  [d]
 * @property {number}  [cx]
 * @property {number}  [cy]
 * @property {number}  [r]
 * @property {number}  [rx]
 * @property {number}  [ry]
 * @property {number}  [x1]
 * @property {number}  [y1]
 * @property {number}  [x2]
 * @property {number}  [y2]
 * @property {number}  [x]
 * @property {number}  [y]
 * @property {number}  [width]
 * @property {number}  [height]
 * @property {boolean} hasFill
 * @property {boolean} hasStroke
 * @property {number}  strokeWidth
 * @property {boolean} closed
 */

/**
 * @typedef {{ atoms: Map<number, ShapeDescriptor[]>, bonds: Map<number, ShapeDescriptor[]>, viewBox: { w: number, h: number }, bandRadius: number, scale: number }} ShapeIndex
 */

/** @type {Worker[]} */
const workers = [];
/** @type {Map<number, { resolve: Function, reject: Function }>} */
const pending = new Map();
let msgId = 0;

function getWorker() {
	if (workers.length < OUTLINE_POOL_SIZE) {
		const worker = new OutlineWorker();
		worker.onmessage = (e) => {
			const { id, type, result, error } = e.data;
			const p = pending.get(id);
			if (!p) return;
			pending.delete(id);
			if (type === 'success') p.resolve(result);
			else p.reject(new Error(error || 'Worker error'));
		};
		workers.push(worker);
	}
	return workers[msgId % workers.length];
}

/**
 * @param {ShapeDescriptor[]} shapes
 * @param {{ w: number, h: number }} viewBox
 * @param {Object} options
 * @returns {Promise<Array<{ d: string }>>}
 */
function computeInWorker(shapes, viewBox, options) {
	return new Promise((resolve, reject) => {
		const id = ++msgId;
		pending.set(id, { resolve, reject });
		getWorker().postMessage({ id, type: 'compute', payload: { shapes, viewBox, options } });
	});
}

/**
 * @param {CSSStyleDeclaration} style
 * @returns {boolean}
 */
function isInvisible(style) {
	const fillOpacity = parseFloat(style.fillOpacity);
	const strokeOpacity = parseFloat(style.strokeOpacity);
	const strokeWidth = parseFloat(style.strokeWidth);
	const noFill = !style.fill || style.fill === 'none' || fillOpacity === 0;
	const noStroke =
		!style.stroke || style.stroke === 'none' || strokeOpacity === 0 || strokeWidth === 0;
	return noFill && noStroke;
}

/**
 * @param {Element} el
 * @param {boolean} isBond
 * @returns {ShapeDescriptor|null}
 */
function toDescriptor(el, isBond) {
	const tag = el.tagName.toLowerCase();
	const style = /** @type {SVGElement} */ (el).style;
	const num = (/** @type {string} */ name) => parseFloat(el.getAttribute(name) || '0');
	const parsedWidth = parseFloat(style.strokeWidth);
	const strokeWidth = Number.isNaN(parsedWidth) ? 2 : parsedWidth;
	const filled = !!style.fill && style.fill !== 'none';
	const stroked = !!style.stroke && style.stroke !== 'none';
	const base = { hasFill: filled, hasStroke: stroked, strokeWidth, closed: true };

	switch (tag) {
		case 'path': {
			const d = el.getAttribute('d');
			if (!d) return null;
			// Skip RDKit's transparent bond-highlight polygons. Their width scales
			// with bondLineWidth * highlightBondWidthMultiplier and they are mitered
			// into neighbouring bonds, which bloats and distorts the outline.
			if (isBond && isInvisible(style)) return null;
			const closed = /[Zz]\s*$/.test(d.trim());
			return isBond
				? { ...base, type: 'path', d, hasStroke: true, closed }
				: { ...base, type: 'path', d, hasFill: true, closed };
		}
		case 'circle':
			return {
				...base,
				type: 'circle',
				cx: num('cx'),
				cy: num('cy'),
				r: num('r'),
				hasFill: true,
				hasStroke: true,
			};
		case 'ellipse':
			return {
				...base,
				type: 'ellipse',
				cx: num('cx'),
				cy: num('cy'),
				rx: num('rx'),
				ry: num('ry'),
				hasFill: true,
				hasStroke: true,
			};
		case 'line':
			return {
				...base,
				type: 'line',
				x1: num('x1'),
				y1: num('y1'),
				x2: num('x2'),
				y2: num('y2'),
				hasStroke: true,
				closed: false,
			};
		case 'rect':
			return {
				...base,
				type: 'rect',
				x: num('x'),
				y: num('y'),
				width: num('width'),
				height: num('height'),
			};
		default:
			return null;
	}
}

/**
 * Collect the outline-relevant shapes of every atom and bond in an RDKit SVG.
 *
 * @param {SVGSVGElement} svgRoot
 * @returns {ShapeIndex}
 */
export function buildShapeIndex(svgRoot) {
	const [, , w, h] = (svgRoot.getAttribute('viewBox') ?? '').trim().split(/\s+/).map(Number);
	/** @type {ShapeIndex} */
	const index = {
		atoms: new Map(),
		bonds: new Map(),
		viewBox: { w, h },
		bandRadius: 0,
		// RDKit's fixedScale makes atoms, labels and bond lengths grow with the render size,
		// so margins measured in viewBox units have to grow with it too.
		scale: Math.min(w, h) / REFERENCE_SIZE || 1,
	};

	for (const el of svgRoot.children) {
		const bond = el.getAttribute('class')?.match(/\bbond-(\d+)/);
		const atom = el.getAttribute('class')?.match(/\batom-(\d+)/);
		const [map, idx] = bond ? [index.bonds, bond[1]] : atom ? [index.atoms, atom[1]] : [];
		if (!map) continue;
		const desc = toDescriptor(el, !!bond);
		if (!desc) continue;
		const key = Number(idx);
		map.set(key, [...(map.get(key) ?? []), desc]);
	}

	// Half-width of the band drawn around bonds. RDKit sizes the (invisible) atom highlight
	// ellipses from the drawing scale, and stretches them for labelled atoms (O, N, OH, ...).
	// Matching the tallest label means the band meets heteroatoms without a step, and it
	// ignores bondLineWidth, which does not scale with the drawing.
	const radii = [...index.atoms.values()]
		.flat()
		.filter((s) => s.type === 'ellipse' || s.type === 'circle')
		.map((s) => Math.min(s.rx ?? s.r ?? 0, s.ry ?? s.r ?? 0))
		.filter((r) => r > 0);
	index.bandRadius = radii.length ? Math.max(...radii) : DEFAULT_BAND_RADIUS * index.scale;
	return index;
}

/**
 * @param {ShapeDescriptor} s
 * @returns {string}
 */
function descriptorToD({ type, d = '', cx = 0, cy = 0, r = 0, rx = r, ry = r, ...s }) {
	const { x1 = 0, y1 = 0, x2 = 0, y2 = 0, x = 0, y = 0, width = 0, height = 0 } = s;
	switch (type) {
		case 'circle':
		case 'ellipse':
			return `M ${cx - rx},${cy} a ${rx},${ry} 0 1,0 ${2 * rx},0 a ${rx},${ry} 0 1,0 ${-2 * rx},0 Z`;
		case 'line':
			return `M ${x1},${y1} L ${x2},${y2}`;
		case 'rect':
			return `M ${x},${y} h ${width} v ${height} h ${-width} Z`;
		default:
			return d;
	}
}

/**
 * @param {string|number[]} color
 * @returns {string}
 */
function toStrokeColor(color) {
	if (Array.isArray(color))
		return rgbaArrayToString([color[0], color[1], color[2], color[3] ?? 0.6]);
	if (color.startsWith('#')) return rgbaArrayToString(hexToRgbaArray(color));
	return color;
}

/**
 * Create an SVG group with a single outline path around a SMARTS match.
 *
 * @param {Object} opts
 * @param {{ atoms: number[], bonds: number[] }} opts.match
 * @param {ShapeIndex} opts.shapeIndex
 * @param {string|number[]} opts.color
 * @param {string} [opts.fill]
 * @param {string} opts.id
 * @param {string} opts.name
 * @param {number} opts.overlap  Number of earlier outlines sharing atoms/bonds with this match
 * @param {number} opts.strokeWidth
 * @param {number} [opts.extraOffset]
 * @returns {Promise<SVGGElement>}
 */
export async function createSurroundingOutline({
	match,
	shapeIndex,
	color,
	fill,
	id,
	name,
	overlap,
	strokeWidth,
	extraOffset = 0,
}) {
	const group = /** @type {SVGGElement} */ (document.createElementNS(NS, 'g'));
	group.classList.add('contour-highlight', `contour-highlight--${id}`);
	group.setAttribute('data-contour-id', id);
	group.setAttribute('data-contour-name', name);

	const shapes = [
		...match.atoms.flatMap((a) => shapeIndex.atoms.get(a) ?? []),
		...match.bonds.flatMap((b) => shapeIndex.bonds.get(b) ?? []),
	];
	if (!shapes.length) return group;

	const options = {
		offset: (BASE_OFFSET + overlap * BASE_OFFSET * 2 + extraOffset) * shapeIndex.scale,
		miterLimit: BASE_OFFSET + overlap,
		flatten: 0.25,
		mergeClusters: true,
		strokeExpand: 2 * shapeIndex.bandRadius,
		smooth: 9 * shapeIndex.scale,
	};

	let d;
	try {
		const results = await computeInWorker(shapes, shapeIndex.viewBox, options);
		d = results.map((r) => r.d).join(' ');
	} catch (error) {
		console.warn(`[surrounding-outline] Error for ${id}:`, error);
	}

	const path = document.createElementNS(NS, 'path');
	path.setAttribute('d', d || shapes.map(descriptorToD).join(' '));
	path.setAttribute('fill-rule', 'nonzero');
	Object.assign(path.style, {
		stroke: toStrokeColor(color),
		strokeWidth: `${strokeWidth}px`,
		fill: fill ?? 'none',
		strokeLinecap: 'round',
		strokeLinejoin: 'round',
	});
	group.appendChild(path);
	return group;
}
