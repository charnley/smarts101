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

// ============================================================================
// Reconstruct Paper.js items from shape descriptors (no DOM needed)
// ============================================================================

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
				if (desc.hasFill) child.fillColor = 'black';
				if (desc.hasStroke) {
					child.strokeColor = 'black';
					child.strokeWidth = desc.strokeWidth || 1;
				}
				child.closed = desc.closed;
				return child;
			}
			if (desc.hasFill) p.fillColor = 'black';
			if (desc.hasStroke) {
				p.strokeColor = 'black';
				p.strokeWidth = desc.strokeWidth || 1;
			}
			return p;
		}
		case 'circle': {
			const c = new scope.Path.Circle(new scope.Point(desc.cx, desc.cy), desc.r);
			if (desc.hasFill) c.fillColor = 'black';
			if (desc.hasStroke) {
				c.strokeColor = 'black';
				c.strokeWidth = desc.strokeWidth || 1;
			}
			return c;
		}
		case 'ellipse': {
			const e = new scope.Path.Ellipse({
				center: new scope.Point(desc.cx, desc.cy),
				radius: new scope.Size(desc.rx, desc.ry),
			});
			if (desc.hasFill) e.fillColor = 'black';
			if (desc.hasStroke) {
				e.strokeColor = 'black';
				e.strokeWidth = desc.strokeWidth || 1;
			}
			return e;
		}
		case 'line': {
			const l = new scope.Path.Line(
				new scope.Point(desc.x1, desc.y1),
				new scope.Point(desc.x2, desc.y2),
			);
			l.strokeColor = 'black';
			l.strokeWidth = desc.strokeWidth || 2;
			return l;
		}
		case 'rect': {
			const r = new scope.Path.Rectangle(
				new scope.Rectangle(desc.x, desc.y, desc.width, desc.height),
			);
			if (desc.hasFill) r.fillColor = 'black';
			if (desc.hasStroke) {
				r.strokeColor = 'black';
				r.strokeWidth = desc.strokeWidth || 1;
			}
			return r;
		}
		default:
			return null;
	}
}

// ============================================================================
// Core computation (runs entirely in the worker)
// ============================================================================

/**
 * Compute surrounding outlines from pre-extracted shape descriptors.
 *
 * @param {Object[]} shapeDescriptors  Array of shape descriptors from main thread
 * @param {{ w: number, h: number }} viewBox  ViewBox dimensions
 * @param {Object} options              Outline options
 * @returns {Array<{ d: string, bbox: { x: number, y: number, width: number, height: number } }>}
 */
function computeOutline(shapeDescriptors, viewBox, options = {}) {
	const {
		includeUnfilled = true,
		offset = 6,
		join = 'round',
		miterLimit = 8,
		flatten = null,
		simplify = false,
		simplifyTolerance = 0,
		outerOnly = true,
		strokeExpand = 6,
		mergeClusters = false,
		mergeClustersAfterOffset = false,
	} = options;

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

	// --- Reconstruct Paper.js items from descriptors (no importSVG / DOMParser) ---
	const closedShapes = [];
	const openPaths = [];

	for (const desc of shapeDescriptors) {
		const item = descriptorToPath(desc, scope);
		if (!item) continue;

		const isClosed = !(item instanceof scope.Path) || item.closed;
		const hasArea = Math.abs(item.area || 0) > 0;
		const hasFill = desc.hasFill;
		const hasStroke = desc.hasStroke || desc.strokeWidth > 0;

		if (isClosed && hasArea && (hasFill || includeUnfilled)) {
			closedShapes.push(item);
		} else if (!isClosed && (hasStroke || hasFill || includeUnfilled)) {
			openPaths.push(item);
		} else {
			item.remove();
		}
	}

	// Expand open paths (bonds / lines) into closed filled shapes
	const expandedBonds = [];
	for (const openPath of openPaths) {
		try {
			const sw = openPath.strokeWidth > 0 ? openPath.strokeWidth : strokeExpand;
			const strokeShape = PaperOffset.offsetStroke(openPath, Math.max(sw, strokeExpand) / 2, {
				join: 'round',
				cap: 'round',
				limit: 4,
				insert: false,
			});
			if (strokeShape && Math.abs(strokeShape.area || 0) > 0) {
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
		cleanup();
		return [];
	}

	// ================================================================
	// Step 4: Connectivity graph
	// ================================================================

	const n = items.length;
	const adj = Array.from({ length: n }, () => new Set());
	const areaEps = 1e-7 * vbW * vbH;
	const bbPad = 1e-6 * Math.max(vbW, vbH);

	function boundsIntersect(a, b) {
		const A = a.bounds.expand(bbPad),
			B = b.bounds.expand(bbPad);
		return A.intersects(B);
	}

	function connected(a, b) {
		if (!boundsIntersect(a, b)) return false;
		if (a.intersects(b)) return true;
		const bc = b.bounds.center,
			ac = a.bounds.center;
		if (a.contains(bc) || b.contains(ac)) return true;
		const acp = a.clone(),
			bcp = b.clone();
		let u = null,
			ok = false;
		try {
			u = acp.unite(bcp);
			ok = Math.abs(u.area) < Math.abs(a.area) + Math.abs(b.area) - areaEps;
		} catch (_) {
			ok = false;
		} finally {
			if (u) u.remove();
			acp.remove();
			bcp.remove();
		}
		return ok;
	}

	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			if (connected(items[i], items[j])) {
				adj[i].add(j);
				adj[j].add(i);
			}
		}
	}

	// ================================================================
	// Step 5: Connected components (clusters)
	// ================================================================

	const visited = new Array(n).fill(false);
	const clustersIdx = [];
	for (let i = 0; i < n; i++) {
		if (visited[i]) continue;
		const comp = [];
		const stack = [i];
		visited[i] = true;
		while (stack.length) {
			const k = stack.pop();
			comp.push(k);
			for (const m of adj[k]) {
				if (!visited[m]) {
					visited[m] = true;
					stack.push(m);
				}
			}
		}
		clustersIdx.push(comp);
	}

	// ================================================================
	// Step 6: Offset each item individually
	// ================================================================

	const expandedItems = [];
	for (let i = 0; i < items.length; i++) {
		if (offset > 0) {
			try {
				if (items[i] instanceof scope.Path) items[i].closed = true;
				if (flatten != null && typeof items[i].flatten === 'function') items[i].flatten(flatten);
				if (simplify && typeof items[i].simplify === 'function') items[i].simplify();
				const expanded = PaperOffset.offset(items[i], offset, {
					join,
					limit: miterLimit,
					insert: false,
				});
				if (expanded && Math.abs(expanded.area || 0) > 0) {
					expandedItems.push(expanded);
				} else {
					if (expanded) expanded.remove();
					expandedItems.push(items[i].clone());
				}
			} catch (_) {
				expandedItems.push(items[i].clone());
			}
		} else {
			expandedItems.push(items[i].clone());
		}
	}

	// ================================================================
	// Step 7: Boolean-union the pre-expanded items per cluster
	// ================================================================

	const unions = [];
	for (const comp of clustersIdx) {
		let merged = null;
		for (const idx of comp) {
			const p = expandedItems[idx];
			if (!merged) {
				merged = p.clone();
			} else {
				try {
					const u = merged.unite(p);
					merged.remove();
					merged = u;
				} catch (_) {}
			}
		}
		if (typeof merged.reduce === 'function') merged.reduce();
		if (simplifyTolerance > 0) merged.simplify(simplifyTolerance);
		unions.push(merged);
	}

	let buffered = unions.map((u) => u.clone());
	if (simplifyTolerance > 0) {
		for (const it of buffered) it.simplify(simplifyTolerance);
	}

	// ================================================================
	// Step 8: Optionally merge clusters after offset
	// ================================================================

	if (mergeClusters) {
		if (buffered.length > 1) {
			let acc = buffered[0].clone();
			for (let i = 1; i < buffered.length; i++) {
				try {
					const u = acc.unite(buffered[i]);
					acc.remove();
					acc = u;
				} catch (_) {}
			}
			for (const it of buffered) it.remove();
			buffered = [acc];
		}
	} else if (mergeClustersAfterOffset && buffered.length > 1) {
		const m = buffered.length;
		const adj2 = Array.from({ length: m }, () => new Set());
		for (let i = 0; i < m; i++) {
			for (let j = i + 1; j < m; j++) {
				if (
					boundsIntersect(buffered[i], buffered[j]) &&
					(buffered[i].intersects(buffered[j]) || connected(buffered[i], buffered[j]))
				) {
					adj2[i].add(j);
					adj2[j].add(i);
				}
			}
		}
		const visited2 = new Array(m).fill(false);
		const groups = [];
		for (let i = 0; i < m; i++) {
			if (visited2[i]) continue;
			const comp = [];
			const st = [i];
			visited2[i] = true;
			while (st.length) {
				const k = st.pop();
				comp.push(k);
				for (const t of adj2[k]) {
					if (!visited2[t]) {
						visited2[t] = true;
						st.push(t);
					}
				}
			}
			groups.push(comp);
		}
		const mergedGroups = [];
		for (const g of groups) {
			let acc = null;
			for (const idx of g) {
				const it = buffered[idx];
				if (!acc) {
					acc = it.clone();
				} else {
					try {
						const u = acc.unite(it);
						acc.remove();
						acc = u;
					} catch (_) {}
				}
			}
			mergedGroups.push(acc);
		}
		for (const it of buffered) it.remove();
		buffered = mergedGroups;
	}

	// ================================================================
	// Step 9: Strip inner holes for outer-only outlines
	// ================================================================

	if (outerOnly) {
		for (let i = 0; i < buffered.length; i++) {
			buffered[i] = extractOuterBoundary(buffered[i], scope);
		}
	}

	// ================================================================
	// Step 10+11: Ensure closed + export path data
	// ================================================================

	const results = [];
	for (const merged of buffered) {
		ensureClosed(merged, scope);
		if (typeof merged.reduce === 'function') merged.reduce();
		const d = merged.pathData;
		const b = merged.bounds;
		results.push({ d, bbox: { x: b.x, y: b.y, width: b.width, height: b.height } });
		merged.remove();
	}

	// Cleanup
	for (const u of unions) {
		try {
			u.remove();
		} catch (_) {}
	}
	for (const eb of expandedBonds) {
		try {
			eb.remove();
		} catch (_) {}
	}
	for (const ei of expandedItems) {
		try {
			ei.remove();
		} catch (_) {}
	}
	cleanup();
	return results;

	function cleanup() {
		scope.project.clear();
	}
}

// ============================================================================
// Helpers (duplicated from main module — worker has no access to main-thread code)
// ============================================================================

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

// ============================================================================
// Worker message handler
// ============================================================================

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
