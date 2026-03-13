import OutlineWorker from './worker/surrounding-outline.worker.js?worker';

const NS = 'http://www.w3.org/2000/svg';

/**
 * @typedef {{ d: string, pathEl: SVGPathElement, bbox: { x:number, y:number, width:number, height:number } }} OutlineResult
 */

/**
 * @typedef {Object} SurroundingOutlineOptions
 * @property {boolean}  [includeUnfilled=true]  Include shapes without fill
 * @property {number}   [offset=6]              Outward expansion distance
 * @property {'miter'|'round'|'bevel'} [join='round'] Corner join mode
 * @property {number}   [miterLimit=8]          Miter limit (if join='miter')
 * @property {number|null} [flatten=null]       Pre-flatten tolerance (e.g. 0.25 for curvy paths)
 * @property {boolean}  [simplify=false]        Pre-simplify contours before expand
 * @property {number}   [simplifyTolerance=0]   Simplification tolerance after union
 * @property {boolean}  [outerOnly=true]        Strip inner holes, keep only the outer boundary
 * @property {number}   [strokeExpand=6]        Width used to expand open/stroked paths (bonds) into closed filled shapes
 * @property {boolean}  [mergeClusters=false]   Merge all clusters into a single result
 * @property {boolean}  [mergeClustersAfterOffset=false] Merge overlapping clusters after offset expansion
 * @property {string}   [stroke]                Stroke colour for the result <path>
 * @property {string}   [strokeWidth]           Stroke width for the result <path>
 * @property {string}   [fill]                  Fill colour for the result <path>
 * @property {string}   [lineJoin]              SVG stroke-linejoin for the result <path>
 * @property {string}   [lineCap]               SVG stroke-linecap for the result <path>
 */

// ============================================================================
// Worker pool for non-blocking outline computation
// ============================================================================

const POOL_SIZE = 2;

/** @type {Worker[]} */
const workers = [];
/** @type {Map<number, { resolve: Function, reject: Function }>} */
const pending = new Map();
let msgId = 0;
let nextWorker = 0;

/**
 * Get or create a worker from the pool.
 * @returns {Worker}
 */
function getWorker() {
	if (workers.length < POOL_SIZE) {
		const w = new OutlineWorker();
		w.onmessage = (e) => {
			const { id, type, result, error } = e.data;
			const p = pending.get(id);
			if (!p) return;
			pending.delete(id);
			if (type === 'success') p.resolve(result);
			else p.reject(new Error(error || 'Worker error'));
		};
		w.onerror = (err) => {
			console.error('[surrounding-outline] Worker error:', err);
		};
		workers.push(w);
	}
	const w = workers[nextWorker % workers.length];
	nextWorker++;
	return w;
}

/**
 * @typedef {Object} ShapeDescriptor
 * @property {'path'|'circle'|'ellipse'|'line'|'rect'} type
 * @property {string}  [d]           Path data (for type 'path')
 * @property {number}  [cx]          Centre X (circle/ellipse)
 * @property {number}  [cy]          Centre Y (circle/ellipse)
 * @property {number}  [r]           Radius (circle)
 * @property {number}  [rx]          Radius X (ellipse)
 * @property {number}  [ry]          Radius Y (ellipse)
 * @property {number}  [x1]          Start X (line)
 * @property {number}  [y1]          Start Y (line)
 * @property {number}  [x2]          End X (line)
 * @property {number}  [y2]          End Y (line)
 * @property {number}  [x]           X (rect)
 * @property {number}  [y]           Y (rect)
 * @property {number}  [width]       Width (rect)
 * @property {number}  [height]      Height (rect)
 * @property {boolean} hasFill       Whether the element has a fill
 * @property {boolean} hasStroke     Whether the element has a stroke
 * @property {number}  strokeWidth   Stroke width
 * @property {boolean} closed        Whether the path is closed
 */

/**
 * Extract serialisable shape descriptors from an SVG element's children.
 * Runs on the main thread where DOM APIs are available.
 *
 * @param {SVGSVGElement} svgElement
 * @returns {{ shapes: ShapeDescriptor[], viewBox: { w: number, h: number } }}
 */
function extractShapeDescriptors(svgElement) {
	const vbStr = svgElement.getAttribute('viewBox');
	if (!vbStr) throw new Error('<svg> must have a viewBox.');
	const vb = vbStr.trim().split(/\s+/).map(Number);
	const [, , w, h] = vb;

	/** @type {ShapeDescriptor[]} */
	const shapes = [];

	for (const child of svgElement.children) {
		const tag = child.tagName?.toLowerCase();
		const style = /** @type {SVGElement} */ (child).style || {};
		const hasFill = !!(style.fill && style.fill !== 'none');
		const hasStroke = !!(style.stroke && style.stroke !== 'none');
		const sw = parseFloat(style.strokeWidth) || 0;

		switch (tag) {
			case 'path': {
				const d = child.getAttribute('d');
				if (!d) break;
				// Heuristic: path is closed if it ends with Z
				const closed = /[Zz]\s*$/.test(d.trim());
				shapes.push({ type: 'path', d, hasFill, hasStroke, strokeWidth: sw, closed });
				break;
			}
			case 'circle': {
				const cx = parseFloat(child.getAttribute('cx') || '0');
				const cy = parseFloat(child.getAttribute('cy') || '0');
				const r = parseFloat(child.getAttribute('r') || '0');
				if (r > 0)
					shapes.push({
						type: 'circle',
						cx,
						cy,
						r,
						hasFill,
						hasStroke,
						strokeWidth: sw,
						closed: true
					});
				break;
			}
			case 'ellipse': {
				const cx = parseFloat(child.getAttribute('cx') || '0');
				const cy = parseFloat(child.getAttribute('cy') || '0');
				const rx = parseFloat(child.getAttribute('rx') || '0');
				const ry = parseFloat(child.getAttribute('ry') || '0');
				if (rx > 0 && ry > 0)
					shapes.push({
						type: 'ellipse',
						cx,
						cy,
						rx,
						ry,
						hasFill,
						hasStroke,
						strokeWidth: sw,
						closed: true
					});
				break;
			}
			case 'line': {
				const x1 = parseFloat(child.getAttribute('x1') || '0');
				const y1 = parseFloat(child.getAttribute('y1') || '0');
				const x2 = parseFloat(child.getAttribute('x2') || '0');
				const y2 = parseFloat(child.getAttribute('y2') || '0');
				shapes.push({
					type: 'line',
					x1,
					y1,
					x2,
					y2,
					hasFill,
					hasStroke,
					strokeWidth: sw,
					closed: false
				});
				break;
			}
			case 'rect': {
				const x = parseFloat(child.getAttribute('x') || '0');
				const y = parseFloat(child.getAttribute('y') || '0');
				const rw = parseFloat(child.getAttribute('width') || '0');
				const rh = parseFloat(child.getAttribute('height') || '0');
				if (rw > 0 && rh > 0)
					shapes.push({
						type: 'rect',
						x,
						y,
						width: rw,
						height: rh,
						hasFill,
						hasStroke,
						strokeWidth: sw,
						closed: true
					});
				break;
			}
			default:
				// Skip unsupported elements (text, g, etc.)
				break;
		}
	}

	return { shapes, viewBox: { w, h } };
}

/**
 * Post a computation to the worker pool and return a promise.
 * @param {ShapeDescriptor[]} shapes  Serialisable shape descriptors
 * @param {{ w: number, h: number }} viewBox
 * @param {SurroundingOutlineOptions} options
 * @returns {Promise<Array<{ d: string, bbox: { x: number, y: number, width: number, height: number } }>>}
 */
function computeInWorker(shapes, viewBox, options) {
	return new Promise((resolve, reject) => {
		const id = ++msgId;
		pending.set(id, { resolve, reject });
		const worker = getWorker();
		worker.postMessage({ id, type: 'compute', payload: { shapes, viewBox, options } });
	});
}

/**
 * Compute surrounding outlines off the main thread.
 *
 * Extracts shape descriptors from the SVG element (main thread, fast),
 * sends them to a Web Worker for Paper.js computation, and returns
 * DOM-ready results.
 *
 * @param {SVGSVGElement} svgElement  An `<svg>` element with a viewBox
 * @param {SurroundingOutlineOptions} [options]
 * @returns {Promise<OutlineResult[]>}  Array of { d, pathEl, bbox }
 */
export async function computeSurroundingOutline(svgElement, options = {}) {
	// Extract shape data on main thread (no DOMParser needed in worker)
	const { shapes, viewBox } = extractShapeDescriptors(svgElement);
	if (!shapes.length) return [];

	// Heavy computation in worker (non-blocking)
	const workerResults = await computeInWorker(shapes, viewBox, options);

	// Create DOM elements on main thread from returned path data
	/** @type {OutlineResult[]} */
	const results = [];
	for (const { d, bbox } of workerResults) {
		const pathEl = /** @type {SVGPathElement} */ (document.createElementNS(NS, 'path'));
		pathEl.setAttribute('d', d);
		pathEl.setAttribute('fill-rule', 'nonzero');

		if (options.fill != null) pathEl.style.fill = options.fill;
		if (options.stroke != null) pathEl.style.stroke = options.stroke;
		if (options.strokeWidth != null) pathEl.style.strokeWidth = String(options.strokeWidth);
		if (options.lineJoin != null) pathEl.style.strokeLinejoin = options.lineJoin;
		if (options.lineCap != null) pathEl.style.strokeLinecap = options.lineCap;

		results.push({ d, pathEl, bbox });
	}
	return results;
}

// ============================================================================
// High-level API: createSurroundingOutline
// ============================================================================

/**
 * Creates an SVG group containing a surrounding outline for a SMARTS match.
 *
 * @param {Object} opts
 * @param {{ atoms: (string|number)[], bonds: (string|number)[] }} opts.match
 * @param {string|number[]} opts.color   Hex string or RGBA [r,g,b,a] (0-1 range)
 * @param {string} [opts.fill]           Fill colour override
 * @param {string} opts.id               Unique identifier
 * @param {string} opts.name             Display name
 * @param {SVGElement} opts.svgRoot      Root SVG element containing the molecular structure
 * @param {string} opts.viewBox          ViewBox string (e.g. "0 0 600 400")
 * @param {Map<string,number>} opts.atomOverlapCounts  Overlap tracking map
 * @param {Map<string,number>} opts.bondOverlapCounts  Overlap tracking map
 * @param {number} [opts.strokeWidth=1]
 * @param {number} [opts.extraOffset=0]
 * @param {SurroundingOutlineOptions} [opts.outlineOptions]
 * @returns {Promise<SVGGElement>}
 */
export async function createSurroundingOutline({
	match,
	color,
	fill,
	id,
	name,
	svgRoot,
	viewBox,
	atomOverlapCounts,
	bondOverlapCounts,
	strokeWidth = 1,
	extraOffset = 0,
	outlineOptions = {}
}) {
	const { atoms, bonds } = match;

	// ---- Create output group ----
	const contourGroup = /** @type {SVGGElement} */ (
		document.createElementNS('http://www.w3.org/2000/svg', 'g')
	);
	contourGroup.classList.add('contour-highlight', `contour-highlight--${id}`);
	contourGroup.setAttribute('data-contour-id', id);
	contourGroup.setAttribute('data-contour-name', name);

	// ---- Resolve stroke colour ----
	let strokeColor;
	if (Array.isArray(color)) {
		strokeColor = `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${color[3] ?? 0.6})`;
	} else if (typeof color === 'string' && color.startsWith('#')) {
		const hex = color.slice(1);
		const r = parseInt(hex.slice(0, 2), 16);
		const g = parseInt(hex.slice(2, 4), 16);
		const b = parseInt(hex.slice(4, 6), 16);
		strokeColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
	} else {
		strokeColor = /** @type {string} */ (color);
	}

	// ---- Helpers ----
	const hasBondClass = (/** @type {Element} */ el) => {
		for (const cls of el.classList) if (cls.startsWith('bond-')) return true;
		return false;
	};

	// ---- Collect atom/bond SVG nodes ----
	const atomSelector = atoms.map((a) => `.atom-${a}`).join(',');
	const atomNodes = atomSelector
		? Array.from(svgRoot?.querySelectorAll(atomSelector) ?? []).filter((el) => !hasBondClass(el))
		: [];

	const bondSelector = bonds.map((b) => `.bond-${b}`).join(',');
	const bondNodes = bondSelector ? Array.from(svgRoot?.querySelectorAll(bondSelector) ?? []) : [];

	const allShapes = [...atomNodes, ...bondNodes];
	if (!allShapes.length) {
		console.warn(`[surrounding-outline] No shapes found for ${id}`);
		return contourGroup;
	}

	// ---- Build temp SVG with prepared clones ----
	const tempSvg = /** @type {SVGSVGElement} */ (
		document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	);
	tempSvg.setAttribute('viewBox', viewBox);

	for (const shape of allShapes) {
		const isBond = hasBondClass(shape);
		const clone = /** @type {SVGElement} */ (shape.cloneNode(true));
		clone.removeAttribute('class');
		prepareShapeForClustering(clone, shape.tagName, isBond);
		tempSvg.appendChild(clone);
	}

	// ---- Calculate adaptive offset ----
	const baseOffset = 2;
	let maxOverlap = 0;
	for (const a of atoms) {
		const c = atomOverlapCounts.get(String(a)) || 0;
		if (c > maxOverlap) maxOverlap = c;
	}
	for (const b of bonds) {
		const c = bondOverlapCounts.get(String(b)) || 0;
		if (c > maxOverlap) maxOverlap = c;
	}
	const adaptiveOffset = Math.ceil(baseOffset + maxOverlap * (baseOffset / 0.5)) + extraOffset;

	// ---- Outline options for the computation ----
	/** @type {SurroundingOutlineOptions} */
	const defaultOutlineOptions = {
		includeUnfilled: true,
		offset: outlineOptions.offset ?? adaptiveOffset,
		join: /** @type {'miter'|'round'|'bevel'} */ (outlineOptions.join ?? 'round'),
		miterLimit: outlineOptions.miterLimit ?? baseOffset + maxOverlap,
		flatten: outlineOptions.flatten ?? null,
		simplify: outlineOptions.simplify ?? false,
		simplifyTolerance: outlineOptions.simplifyTolerance ?? 0,
		outerOnly: outlineOptions.outerOnly ?? true,
		strokeExpand: outlineOptions.strokeExpand ?? 6,
		mergeClusters: outlineOptions.mergeClusters ?? true,
		mergeClustersAfterOffset: outlineOptions.mergeClustersAfterOffset ?? true
	};

	// ---- Compute surrounding outline ----
	try {
		const results = await computeSurroundingOutline(tempSvg, defaultOutlineOptions);

		if (results.length === 0) {
			// Fallback: process individual shapes
			await processIndividualShapes(
				allShapes,
				contourGroup,
				strokeColor,
				viewBox,
				defaultOutlineOptions,
				strokeWidth
			);
		} else {
			// Merge all cluster path-data into a single <path>
			const combinedD = results
				.filter((c) => c.pathEl && c.d)
				.map((c) => c.d)
				.join(' ');
			if (combinedD) {
				const singlePath = document.createElementNS(NS, 'path');
				singlePath.setAttribute('d', combinedD);
				singlePath.setAttribute('fill-rule', 'nonzero');
				applyOutlinePathStyling(singlePath, strokeColor, strokeWidth, fill);
				contourGroup.appendChild(singlePath);
			}
		}
	} catch (error) {
		console.warn(`[surrounding-outline] Error for ${id}:`, error);
		createFallbackOutlines(allShapes, contourGroup, strokeColor, strokeWidth);
	}

	// ---- Ensure single-path output ----
	mergeGroupToSinglePath(contourGroup, strokeColor, strokeWidth, fill);

	// ---- Update overlap tracking ----
	for (const a of atoms)
		atomOverlapCounts.set(String(a), (atomOverlapCounts.get(String(a)) || 0) + 1);
	for (const b of bonds)
		bondOverlapCounts.set(String(b), (bondOverlapCounts.get(String(b)) || 0) + 1);

	return contourGroup;
}

// ============================================================================
// Rendering helpers
// ============================================================================

/**
 * Applies standard styling to an outline path element.
 * @param {SVGElement} outlinePath - The path element to style
 * @param {string} strokeColor - The stroke colour
 * @param {number} strokeWidth - Stroke width in px
 * @param {string} [fill] - Fill colour
 */
function applyOutlinePathStyling(outlinePath, strokeColor, strokeWidth = 1, fill) {
	outlinePath.style.stroke = strokeColor;
	outlinePath.style.strokeWidth = `${strokeWidth}px`;
	outlinePath.style.fill = fill || 'none';
	outlinePath.style.strokeLinecap = 'round';
	outlinePath.style.strokeLinejoin = 'round';
}

/**
 * Processes individual shapes when the grouped outline returns no results.
 * Each shape is outlined individually via `computeSurroundingOutline`; if that
 * also fails the shape is cloned directly with stroke styling.
 *
 * @param {Element[]} allShapes - Array of shape elements from the SVG
 * @param {SVGGElement} contourGroup - Group to append outline paths into
 * @param {string} strokeColor - Stroke colour
 * @param {string} viewBox - ViewBox string
 * @param {SurroundingOutlineOptions} outlineOptions - Options for the computation
 * @param {number} strokeWidth - Stroke width in px
 * @returns {Promise<void>}
 */
async function processIndividualShapes(
	allShapes,
	contourGroup,
	strokeColor,
	viewBox,
	outlineOptions,
	strokeWidth = 1
) {
	const BATCH_SIZE = 8;
	for (let batchStart = 0; batchStart < allShapes.length; batchStart += BATCH_SIZE) {
		const batch = allShapes.slice(batchStart, batchStart + BATCH_SIZE);
		const results = await Promise.allSettled(
			batch.map(async (elem) => {
				const batchSvg = /** @type {SVGSVGElement} */ (
					document.createElementNS('http://www.w3.org/2000/svg', 'svg')
				);
				batchSvg.setAttribute('viewBox', viewBox);

				const isBond = /** @type {SVGElement} */ (elem).classList
					? Array.prototype.some.call(
							/** @type {SVGElement} */ (elem).classList,
							(/** @type {string} */ cls) => cls.startsWith('bond-')
						)
					: false;
				const clonedElem = /** @type {SVGElement} */ (elem.cloneNode(true));
				prepareShapeForClustering(clonedElem, elem.tagName, isBond);
				batchSvg.appendChild(clonedElem);

				const clusters = await computeSurroundingOutline(batchSvg, outlineOptions);
				return { elem, clusters };
			})
		);

		for (let idx = 0; idx < results.length; idx++) {
			const result = results[idx];
			if (result.status === 'fulfilled') {
				for (const cluster of result.value.clusters) {
					if (cluster.pathEl && cluster.d) {
						applyOutlinePathStyling(cluster.pathEl, strokeColor, strokeWidth);
						contourGroup.appendChild(cluster.pathEl);
					}
				}
				// If individual outline also empty, clone shape directly
				if (result.value.clusters.length === 0) {
					const elem = batch[idx];
					const directCopy = /** @type {SVGElement} */ (elem.cloneNode(true));
					applyDirectCopyStyle(directCopy, elem.tagName, strokeColor, strokeWidth);
					contourGroup.appendChild(directCopy);
				}
			} else {
				// Failed – fallback to direct copy
				const elem = batch[idx];
				console.warn(
					'[surrounding-outline] Error computing outline for single element:',
					result.reason
				);
				const directCopy = /** @type {SVGElement} */ (elem.cloneNode(true));
				applyDirectCopyStyle(directCopy, elem.tagName, strokeColor, strokeWidth);
				contourGroup.appendChild(directCopy);
			}
		}
	}
}

/**
 * Creates simple fallback outlines when the entire outline computation fails.
 * @param {Element[]} allShapes - Array of shape elements
 * @param {SVGGElement} contourGroup - Group to append clones into
 * @param {string} strokeColor - Stroke colour
 * @param {number} strokeWidth - Stroke width in px
 */
function createFallbackOutlines(allShapes, contourGroup, strokeColor, strokeWidth = 1) {
	for (const elem of allShapes) {
		const clonedElem = /** @type {SVGElement} */ (elem.cloneNode(true));
		applyDirectCopyStyle(clonedElem, elem.tagName, strokeColor, strokeWidth);
		contourGroup.appendChild(clonedElem);
	}
}

/**
 * Style a directly-cloned element as a fallback outline.
 * @param {SVGElement} clone
 * @param {string} tagName
 * @param {string} strokeColor
 * @param {number} strokeWidth
 */
function applyDirectCopyStyle(clone, tagName, strokeColor, strokeWidth = 1) {
	if (tagName === 'circle' || tagName === 'ellipse') {
		clone.style.fill = 'transparent';
		clone.style.stroke = strokeColor;
		clone.style.strokeWidth = `${strokeWidth + 1}px`;
	} else {
		clone.style.fill = 'none';
		clone.style.stroke = strokeColor;
		clone.style.strokeWidth = `${strokeWidth}px`;
	}
	clone.style.strokeLinecap = 'round';
	clone.style.strokeLinejoin = 'round';
}

// ============================================================================
// Single-path merge helper
// ============================================================================

/**
 * Consolidates all children of a contour group into a single <path> element.
 * Converts non-path children (circle, ellipse, line, rect) to path data.
 * If the group already has 0-1 path children, it's a no-op.
 *
 * @param {SVGGElement} group   The contour <g> element
 * @param {string} strokeColor  Stroke colour for the merged path
 * @param {number} strokeWidth  Stroke width
 * @param {string} [fill]       Fill colour
 */
function mergeGroupToSinglePath(group, strokeColor, strokeWidth = 1, fill) {
	const children = Array.from(group.children);
	if (children.length <= 1 && children[0]?.tagName?.toLowerCase() === 'path') return;
	if (children.length === 0) return;

	const parts = [];
	for (const child of children) {
		const d = extractPathData(child);
		if (d) parts.push(d);
	}

	// Clear existing children
	while (group.firstChild) group.removeChild(group.firstChild);

	if (parts.length > 0) {
		const merged = document.createElementNS(NS, 'path');
		merged.setAttribute('d', parts.join(' '));
		merged.setAttribute('fill-rule', 'nonzero');
		applyOutlinePathStyling(merged, strokeColor, strokeWidth, fill);
		group.appendChild(merged);
	}
}

/**
 * Extracts SVG path-data (`d` attribute string) from any SVG shape element.
 * For non-path elements (circle, ellipse, line, rect) it generates an
 * equivalent path-data string.
 *
 * @param {Element} element  An SVG shape element
 * @returns {string|null}    The path-data string, or null if unsupported
 */
function extractPathData(element) {
	const tag = element.tagName?.toLowerCase();

	if (tag === 'path') {
		return element.getAttribute('d');
	}
	if (tag === 'circle') {
		const cx = parseFloat(element.getAttribute('cx') || '0');
		const cy = parseFloat(element.getAttribute('cy') || '0');
		const r = parseFloat(element.getAttribute('r') || '0');
		if (r <= 0) return null;
		return `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 ${-2 * r},0 Z`;
	}
	if (tag === 'ellipse') {
		const cx = parseFloat(element.getAttribute('cx') || '0');
		const cy = parseFloat(element.getAttribute('cy') || '0');
		const rx = parseFloat(element.getAttribute('rx') || '0');
		const ry = parseFloat(element.getAttribute('ry') || '0');
		if (rx <= 0 || ry <= 0) return null;
		return `M ${cx - rx},${cy} a ${rx},${ry} 0 1,0 ${2 * rx},0 a ${rx},${ry} 0 1,0 ${-2 * rx},0 Z`;
	}
	if (tag === 'line') {
		const x1 = element.getAttribute('x1') || '0';
		const y1 = element.getAttribute('y1') || '0';
		const x2 = element.getAttribute('x2') || '0';
		const y2 = element.getAttribute('y2') || '0';
		return `M ${x1},${y1} L ${x2},${y2}`;
	}
	if (tag === 'rect') {
		const x = parseFloat(element.getAttribute('x') || '0');
		const y = parseFloat(element.getAttribute('y') || '0');
		const w = parseFloat(element.getAttribute('width') || '0');
		const h = parseFloat(element.getAttribute('height') || '0');
		if (w <= 0 || h <= 0) return null;
		return `M ${x},${y} L ${x + w},${y} L ${x + w},${y + h} L ${x},${y + h} Z`;
	}
	// Unsupported shape — try to grab a `d` attribute anyway
	return element.getAttribute('d');
}

// ============================================================================
// SVG shape preparation helper
// ============================================================================

/**
 * Prepare a cloned SVG element for Paper.js import by setting transparent
 * fill/stroke so Paper.js treats it as a valid shape.
 * @param {SVGElement} clonedElem
 * @param {string} tagName
 * @param {boolean} isBond
 */
function prepareShapeForClustering(clonedElem, tagName, isBond = false) {
	if (tagName === 'circle' || tagName === 'ellipse') {
		clonedElem.style.fill = 'transparent';
		clonedElem.style.stroke = 'transparent';
		clonedElem.style.strokeWidth = clonedElem.style.strokeWidth || '2px';
	} else if (tagName === 'path') {
		if (isBond) {
			clonedElem.style.strokeWidth = clonedElem.style.strokeWidth || '2px';
			if (!clonedElem.style.stroke || clonedElem.style.stroke === 'none') {
				clonedElem.style.stroke = 'transparent';
			}
		} else {
			if (!clonedElem.style.fill || clonedElem.style.fill === 'none') {
				clonedElem.style.fill = 'transparent';
			}
		}
	} else if (tagName === 'line') {
		clonedElem.style.strokeWidth = clonedElem.style.strokeWidth || '2px';
		if (!clonedElem.style.stroke || clonedElem.style.stroke === 'none') {
			clonedElem.style.stroke = 'transparent';
		}
	} else if (tagName === 'text') {
		if (!clonedElem.style.fill || clonedElem.style.fill === 'none') {
			clonedElem.style.fill = 'transparent';
		}
	}
}
