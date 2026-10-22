/**
 * @fileoverview Web Worker for surrounding-outline computation.
 * Offloads all Paper.js + PaperOffset heavy work off the main thread.
 *
 * Protocol:
 *   Request:  { id, type: 'compute', payload: { shapes, viewBox, options } }
 *   Response: { id, type: 'success', result: [{ d, bbox }] }
 *         or: { id, type: 'error', error: string }
 *
 * Shape descriptors are extracted on the main thread (where DOM is available)
 * and reconstructed here as Paper.js paths without needing DOMParser/importSVG.
 */

// @ts-nocheck
import paper from 'paper/dist/paper-full.js';
import { PaperOffset } from 'paperjs-offset';

const TRACE = '[Outline Worker]';

/**
 * Apply the black fill/stroke that Paper.js needs for boolean operations.
 * @param {any} item  Paper.js item
 * @param {{ hasFill?: boolean, hasStroke?: boolean, strokeWidth?: number }} flags
 * @param {number} [defaultWidth]  Stroke width when the descriptor has none
 * @returns {any}
 */
function paint(item, { hasFill, hasStroke, strokeWidth }, defaultWidth = 1) {
	if (hasFill) item.fillColor = 'black';
	if (hasStroke) {
		item.strokeColor = 'black';
		item.strokeWidth = strokeWidth || defaultWidth;
	}
	return item;
}

/**
 * Convert a shape descriptor into a Paper.js PathItem.
 * @param {Object} desc  Shape descriptor from the main thread
 * @param {any} scope    Paper.js scope
 * @returns {any|null}   Paper.js Path / CompoundPath, or null
 */
function descriptorToPath(desc, scope) {
	switch (desc.type) {
		case 'path': {
			if (!desc.d) return null;
			const p = new scope.CompoundPath(desc.d);
			// CompoundPath may produce a single child — unwrap if so
			if (p.children && p.children.length === 1) {
				const child = p.children[0].clone({ insert: false });
				p.remove();
				paint(child, desc);
				child.closed = desc.closed;
				return child;
			}
			return paint(p, desc);
		}
		case 'circle':
			return paint(new scope.Path.Circle(new scope.Point(desc.cx, desc.cy), desc.r), desc);
		case 'ellipse':
			return paint(
				new scope.Path.Ellipse({
					center: new scope.Point(desc.cx, desc.cy),
					radius: new scope.Size(desc.rx, desc.ry),
				}),
				desc,
			);
		case 'line':
			return paint(
				new scope.Path.Line(new scope.Point(desc.x1, desc.y1), new scope.Point(desc.x2, desc.y2)),
				{ hasStroke: true, strokeWidth: desc.strokeWidth },
				2,
			);
		case 'rect':
			return paint(
				new scope.Path.Rectangle(new scope.Rectangle(desc.x, desc.y, desc.width, desc.height)),
				desc,
			);
		default:
			return null;
	}
}

/**
 * Compute the outline around a set of shape descriptors: every shape is grown by `offset`,
 * all of them are merged into one, and only the outer boundary is kept.
 *
 * @param {Object[]} shapeDescriptors  Array of shape descriptors from main thread
 * @param {{ w: number, h: number }} viewBox  ViewBox dimensions
 * @param {{ offset?: number, miterLimit?: number, flatten?: number, strokeExpand?: number }} options
 *   offset: distance to grow each shape, miterLimit: limit of the round joins,
 *   flatten: flatness used to turn curves into lines, strokeExpand: width of the band drawn around bonds
 * @returns {Array<{ d: string, bbox: { x: number, y: number, width: number, height: number } }>}
 */
function computeOutline(shapeDescriptors, viewBox, options = {}) {
	const { offset = 6, miterLimit = 8, flatten = 1, strokeExpand = 6 } = options;

	const vbW = viewBox.w;
	const vbH = viewBox.h;
	if (!(isFinite(vbW) && isFinite(vbH) && vbW > 0 && vbH > 0)) throw new Error('Invalid viewBox.');

	// --- Isolated Paper scope with OffscreenCanvas ---
	const scope = new paper.PaperScope();
	const canvas =
		typeof OffscreenCanvas !== 'undefined'
			? new OffscreenCanvas(Math.max(1, Math.round(vbW)), Math.max(1, Math.round(vbH)))
			: (() => {
					const c = { width: 0, height: 0, getContext: () => null };
					c.width = Math.max(1, Math.round(vbW));
					c.height = Math.max(1, Math.round(vbH));
					return c;
				})();
	scope.setup(canvas);

	// Reconstruct Paper.js items from descriptors (no importSVG / DOMParser)
	const closedShapes = [];
	const openPaths = [];

	for (const desc of shapeDescriptors) {
		const item = descriptorToPath(desc, scope);
		if (!item) continue;
		if (flatten && typeof item.flatten === 'function') item.flatten(flatten);

		const isClosed = !(item instanceof scope.Path) || item.closed;
		if (isClosed && Math.abs(item.area || 0) > 0) {
			closedShapes.push(item);
		} else if (!isClosed) {
			openPaths.push(item);
		} else {
			item.remove();
		}
	}

	// Expand open paths (bonds / lines) into closed filled shapes
	const expandedBonds = [];
	for (const openPath of openPaths) {
		try {
			// Constant band width: the drawn bond stroke width (bondLineWidth) must
			// not leak into the outline geometry.
			const strokeShape = PaperOffset.offsetStroke(openPath, strokeExpand / 2, {
				join: 'round',
				cap: 'round',
				limit: 4,
				insert: false,
			});
			if (strokeShape && Math.abs(strokeShape.area || 0) > 0) {
				if (flatten && typeof strokeShape.flatten === 'function') strokeShape.flatten(flatten);
				expandedBonds.push(strokeShape);
			} else if (strokeShape) {
				strokeShape.remove();
			}
		} catch (_) {
			/* skip */
		}
	}

	const items = [...closedShapes, ...expandedBonds];
	if (!items.length) {
		scope.project.clear();
		return [];
	}

	// Grow each item
	const expandedItems = items.map((item) => {
		if (!(offset > 0)) return item.clone();
		try {
			if (item instanceof scope.Path) item.closed = true;
			const expanded = PaperOffset.offset(item, offset, {
				join: 'round',
				limit: miterLimit,
				insert: false,
			});
			if (expanded && Math.abs(expanded.area || 0) > 0) return expanded;
			if (expanded) expanded.remove();
		} catch (_) {}
		return item.clone();
	});

	// Union everything into one shape
	let merged = null;
	for (const item of expandedItems) {
		if (!merged) {
			merged = item.clone();
			continue;
		}
		try {
			const u = merged.unite(item);
			merged.remove();
			merged = u;
		} catch (_) {}
	}
	if (typeof merged.reduce === 'function') merged.reduce();

	// Outer boundary only, no inner holes
	merged = extractOuterBoundary(merged, scope);
	ensureClosed(merged, scope);
	if (typeof merged.reduce === 'function') merged.reduce();

	const b = merged.bounds;
	const results = [
		{ d: merged.pathData, bbox: { x: b.x, y: b.y, width: b.width, height: b.height } },
	];

	scope.project.clear();
	return results;
}

// Helpers
function extractOuterBoundary(item, scope) {
	if (!(item instanceof scope.CompoundPath) || !item.children) return item;
	const outers = item.children.filter((c) => c.area > 0);
	if (!outers.length || outers.length === item.children.length) return item;

	if (outers.length === 1) {
		const outer = outers[0].clone({ insert: false });
		outer.closed = true;
		item.remove();
		return outer;
	}

	let merged = outers[0].clone({ insert: false });
	for (let i = 1; i < outers.length; i++) {
		try {
			const u = merged.unite(outers[i]);
			merged.remove();
			merged = u;
		} catch (_) {}
	}
	item.remove();

	if (merged instanceof scope.CompoundPath && merged.children) {
		const remaining = merged.children.filter((c) => c.area > 0);
		if (remaining.length === 1) {
			const single = remaining[0].clone({ insert: false });
			single.closed = true;
			merged.remove();
			return single;
		}
	}
	return merged;
}

function ensureClosed(item, scope) {
	if (item instanceof scope.CompoundPath && item.children) {
		for (const child of item.children) child.closed = true;
	} else if (item instanceof scope.Path) {
		item.closed = true;
	}
}

// Worker message handler
self.onmessage = (event) => {
	const { id, type, payload } = event.data;

	if (type !== 'compute') {
		self.postMessage({ id, type: 'error', error: `Unknown message type: ${type}` });
		return;
	}

	try {
		const { shapes, viewBox, options } = payload;
		const results = computeOutline(shapes, viewBox, options);
		self.postMessage({ id, type: 'success', result: results });
	} catch (error) {
		console.error(`${TRACE} Error:`, error);
		self.postMessage({ id, type: 'error', error: error.message || String(error) });
	}
};
