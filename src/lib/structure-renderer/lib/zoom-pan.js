/**
 * @fileoverview Zoom and Pan utilities for the Interactive Depicter
 * Pure implementation without external dependencies (except d3)
 */

// @ts-nocheck
import * as d3 from 'd3';

/**
 * @typedef {Object} ZoomPanOptions
 * @property {number} [minZoom=0.5] - Minimum zoom scale
 * @property {number} [maxZoom=10] - Maximum zoom scale
 * @property {number} [initialZoom=1] - Initial zoom scale
 * @property {boolean} [enableZoom=true] - Enable zoom functionality
 * @property {boolean} [enablePan=true] - Enable pan functionality
 * @property {boolean} [requireShiftForZoom=true] - Require shift key for zoom
 * @property {Function} [onZoom] - Callback on zoom
 * @property {Function} [onPan] - Callback on pan
 */

/**
 * @typedef {Object} ZoomPanInstance
 * @property {Function} reset - Reset zoom and pan to initial state
 * @property {Function} zoomIn - Zoom in by a factor
 * @property {Function} zoomOut - Zoom out by a factor
 * @property {Function} zoomTo - Zoom to specific scale
 * @property {Function} panTo - Pan to specific coordinates
 * @property {Function} getTransform - Get current transform
 * @property {Function} destroy - Clean up event listeners
 */

/**
 * Create zoom and pan behavior for an SVG element
 * @param {SVGSVGElement} svgElement - The SVG element to apply zoom/pan to
 * @param {ZoomPanOptions} options - Configuration options
 * @returns {ZoomPanInstance}
 */
export function createZoomPan(svgElement, options = {}) {
	const config = {
		minZoom: 0.5,
		maxZoom: 10,
		initialZoom: 1,
		enableZoom: true,
		enablePan: true,
		requireShiftForZoom: true,
		onZoom: () => {},
		onPan: () => {},
		...options
	};

	const svg = d3.select(svgElement);
	const container = svg.select('g.zoom-container').empty()
		? svg.insert('g', ':first-child').attr('class', 'zoom-container')
		: svg.select('g.zoom-container');

	// Move all existing content into the zoom container
	if (container.selectAll('*').empty()) {
		svg.selectAll('*:not(.zoom-container)').each(function() {
			container.node().appendChild(this);
		});
	}

	let currentTransform = d3.zoomIdentity.scale(config.initialZoom);

	/**
	 * Zoom behavior
	 */
	const zoom = d3.zoom()
		.scaleExtent([config.minZoom, config.maxZoom])
		.on('zoom', (event) => {
			// Only allow zoom if shift is not required or shift is pressed
			if (!config.requireShiftForZoom || event.sourceEvent?.shiftKey) {
				currentTransform = event.transform;
				container.attr('transform', currentTransform.toString());
				config.onZoom(event.transform);
			} else if (config.enablePan) {
				// Allow pan without shift
				currentTransform = event.transform;
				container.attr('transform', currentTransform.toString());
				config.onPan(event.transform);
			}
		});

	// Apply zoom behavior
	if (config.enableZoom || config.enablePan) {
		svg.call(zoom);
		
		// Disable zoom on scroll if shift key is required
		if (config.requireShiftForZoom) {
			svg.on('wheel.zoom', (event) => {
				if (!event.shiftKey) {
					event.preventDefault();
				}
			});
		}
	}

	/**
	 * Reset to initial state
	 */
	function reset() {
		svg.transition()
			.duration(750)
			.call(zoom.transform, d3.zoomIdentity.scale(config.initialZoom));
	}

	/**
	 * Zoom in by a factor
	 * @param {number} factor - Zoom factor (default: 1.5)
	 */
	function zoomIn(factor = 1.5) {
		svg.transition()
			.duration(300)
			.call(zoom.scaleBy, factor);
	}

	/**
	 * Zoom out by a factor
	 * @param {number} factor - Zoom factor (default: 1.5)
	 */
	function zoomOut(factor = 1.5) {
		svg.transition()
			.duration(300)
			.call(zoom.scaleBy, 1 / factor);
	}

	/**
	 * Zoom to specific scale
	 * @param {number} scale - Target scale
	 */
	function zoomTo(scale) {
		const clampedScale = Math.max(config.minZoom, Math.min(config.maxZoom, scale));
		svg.transition()
			.duration(300)
			.call(zoom.scaleTo, clampedScale);
	}

	/**
	 * Pan to specific coordinates
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 */
	function panTo(x, y) {
		const transform = d3.zoomIdentity
			.scale(currentTransform.k)
			.translate(x, y);
		
		svg.transition()
			.duration(300)
			.call(zoom.transform, transform);
	}

	/**
	 * Get current transform
	 * @returns {{x: number, y: number, k: number}}
	 */
	function getTransform() {
		return {
			x: currentTransform.x,
			y: currentTransform.y,
			k: currentTransform.k
		};
	}

	/**
	 * Clean up
	 */
	function destroy() {
		svg.on('.zoom', null);
	}

	return {
		reset,
		zoomIn,
		zoomOut,
		zoomTo,
		panTo,
		getTransform,
		destroy
	};
}

/**
 * @typedef {Object} MinimapOptions
 * @property {number}  [ratio=0.15]            - Minimap size as ratio of container
 * @property {string}  [position='bottom-right'] - Corner position
 * @property {number}  [padding=10]            - Padding from edges (px)
 * @property {number}  [minZoom=0.25]          - Minimum zoom scale for main SVG
 * @property {number}  [maxZoom=8]             - Maximum zoom scale for main SVG
 * @property {boolean} [requireShiftForMinimap=false] - Require shift for minimap interactions
 * @property {Object}  [minimap]               - Extra minimap config (passed from caller)
 */

/**
 * Create a minimap with viewport indicator and wire zoom/pan on the main SVG.
 *
 * Accepts the container div that holds the main SVG (or a wrapper div whose
 * first `<svg>` child is the main SVG).  Returns a d3 selection of the main
 * SVG as `mainSVG` so callers can chain lasso / other behaviour on it.
 *
 * @param {HTMLElement} containerEl - Container element that holds the main SVG
 * @param {MinimapOptions} options
 * @returns {{ mainSVG: d3.Selection, updateViewport: Function, destroy: Function, element: SVGSVGElement }}
 */
export function createMinimap(containerEl, options = {}) {
	const minimapCfg = options.minimap ?? {};
	const config = {
		ratio: 0.15,
		position: minimapCfg.togglePosition ?? options.position ?? 'bottom-right',
		padding: 10,
		minZoom: 0.25,
		maxZoom: 8,
		requireShiftForMinimap: minimapCfg.requireShiftForMinimap ?? options.requireShiftForMinimap ?? false,
		...options
	};

	// ── Locate the main SVG ──────────────────────────────────────────────
	const containerD3 = d3.select(containerEl);
	const mainSVG = containerD3.select('svg');
	const mainSvgNode = mainSVG.node();

	if (!mainSvgNode) {
		console.warn('createMinimap: no <svg> found inside container');
		return { mainSVG, updateViewport() {}, destroy() {}, element: null };
	}

	// ── Ensure a zoom-container group exists ─────────────────────────────
	let zoomContainer = mainSVG.select('g.zoom-container');
	if (zoomContainer.empty()) {
		zoomContainer = mainSVG.insert('g', ':first-child').attr('class', 'zoom-container');
		// Move all existing top-level children (except the new group) into it
		mainSVG.selectAll(':scope > *:not(.zoom-container)').each(function () {
			zoomContainer.node().appendChild(this);
		});
	}

	// ── Measure content from the original (un-transformed) source ────────
	// Temporarily reset transform on the zoom-container so getBBox is accurate
	const savedTransform = zoomContainer.attr('transform');
	zoomContainer.attr('transform', null);

	let contentBBox;
	try {
		contentBBox = zoomContainer.node().getBBox();
	} catch {
		contentBBox = { x: 0, y: 0, width: 0, height: 0 };
	}

	// Restore original transform
	if (savedTransform) zoomContainer.attr('transform', savedTransform);

	// Fallback when content is invisible or empty
	const mainRect = mainSvgNode.getBoundingClientRect();
	if (!contentBBox.width || !contentBBox.height) {
		contentBBox = {
			x: 0,
			y: 0,
			width: mainRect.width || 400,
			height: mainRect.height || 300
		};
	}

	// ── Minimap dimensions ───────────────────────────────────────────────
	const minimapW = Math.round(mainRect.width * config.ratio) || 150;
	const minimapH = Math.round(mainRect.height * config.ratio) || 112;

	// Ensure container has relative positioning for the absolutely-placed minimap
	if (getComputedStyle(containerEl).position === 'static') {
		containerEl.style.position = 'relative';
	}

	// ── Create minimap SVG as a sibling inside the container div ─────────
	const minimapSvg = containerD3
		.append('svg')
		.attr('class', 'minimap')
		.attr('viewBox', `${contentBBox.x} ${contentBBox.y} ${contentBBox.width} ${contentBBox.height}`)
		.attr('width', minimapW)
		.attr('height', minimapH)
		.style('position', 'absolute')
		.style('border', '1px solid #ccc')
		.style('background', 'rgba(255,255,255,0.85)')
		.style('pointer-events', 'all')
		.style('z-index', '10');

	// Position in the chosen corner
	const posMap = {
		'top-left':     { top: config.padding, left: config.padding, bottom: null, right: null },
		'top-right':    { top: config.padding, right: config.padding, bottom: null, left: null },
		'bottom-left':  { bottom: config.padding, left: config.padding, top: null, right: null },
		'bottom-right': { bottom: config.padding, right: config.padding, top: null, left: null }
	};
	const pos = posMap[config.position] || posMap['bottom-right'];
	Object.entries(pos).forEach(([k, v]) => minimapSvg.style(k, v != null ? `${v}px` : null));

	// ── Clone content into minimap (transform-free) ──────────────────────
	const minimapContent = minimapSvg.append('g').attr('class', 'minimap-content');
	const clone = zoomContainer.node().cloneNode(true);
	clone.removeAttribute('transform');
	minimapContent.node().appendChild(clone);

	// ── Viewport indicator ───────────────────────────────────────────────
	const viewport = minimapSvg
		.append('rect')
		.attr('class', 'minimap-viewport')
		.attr('fill', 'rgba(4,96,169,0.08)')
		.attr('stroke', '#0460a9')
		.attr('stroke-width', 1.5 / (minimapW / contentBBox.width))
		.attr('rx', 2 / (minimapW / contentBBox.width));

	// ── Set up d3-zoom on the main SVG ───────────────────────────────────
	let currentTransform = d3.zoomIdentity;
	const clampTransform = (t) => {
		const svgW = mainRect.width || mainSvgNode.clientWidth || contentBBox.width;
		const svgH = mainRect.height || mainSvgNode.clientHeight || contentBBox.height;
		const vw = svgW / t.k;
		const vh = svgH / t.k;
		const slackX = vw * 0.2;
		const slackY = vh * 0.2;
		const minX = contentBBox.x - slackX;
		const maxX = contentBBox.x + contentBBox.width - vw + slackX;
		const minY = contentBBox.y - slackY;
		const maxY = contentBBox.y + contentBBox.height - vh + slackY;
		const viewportX = Math.max(minX, Math.min(maxX, -t.x / t.k));
		const viewportY = Math.max(minY, Math.min(maxY, -t.y / t.k));

		return d3.zoomIdentity.translate(-viewportX * t.k, -viewportY * t.k).scale(t.k);
	};

	function updateViewport(t = currentTransform) {
		// Map the visible area of the main SVG back into content coordinates
		const svgW = mainRect.width || mainSvgNode.clientWidth || contentBBox.width;
		const svgH = mainRect.height || mainSvgNode.clientHeight || contentBBox.height;
		const vx = (contentBBox.x - t.x) / t.k + contentBBox.x;
		const vy = (contentBBox.y - t.y) / t.k + contentBBox.y;
		const vw = svgW / t.k;
		const vh = svgH / t.k;

		viewport
			.attr('x', -t.x / t.k)
			.attr('y', -t.y / t.k)
			.attr('width', vw)
			.attr('height', vh);
	}

	const zoom = d3.zoom()
		.scaleExtent([config.minZoom, config.maxZoom])
		.filter((event) => {
			// When shift is required for zoom/pan, only capture shift+events
			// This lets non-shift drags pass through to lasso selection
			if (config.requireShiftForMinimap) {
				// Allow programmatic events (no sourceEvent)
				if (!event) return true;
				return event.shiftKey;
			}
			// Default d3 filter: exclude ctrl+click and right-click
			return !event.ctrlKey && !event.button;
		})
		.on('zoom', (event) => {
			currentTransform = event.transform;
			zoomContainer.attr('transform', currentTransform.toString());
			updateViewport(currentTransform);
		});

	mainSVG.call(zoom);
	// Set initial viewport
	updateViewport();

	// ── Minimap click-to-pan ─────────────────────────────────────────────
	// d3.pointer returns coords in viewBox (= content) space because the
	// minimap SVG has a viewBox.  We centre the main viewport on that point.
	minimapSvg.on('click', function (event) {
		if (event.defaultPrevented) return;
		// Coordinates in content-space (viewBox)
		const [cx, cy] = d3.pointer(event, minimapSvg.node());
		const svgW = mainRect.width || mainSvgNode.clientWidth || contentBBox.width;
		const svgH = mainRect.height || mainSvgNode.clientHeight || contentBBox.height;
		const k = currentTransform.k;
		const newTransform = d3.zoomIdentity
			.translate(-(cx * k - svgW / 2), -(cy * k - svgH / 2))
			.scale(k);

		mainSVG.transition().duration(300).call(zoom.transform, clampTransform(newTransform));
	});

	// ── Minimap viewport drag-to-pan ─────────────────────────────────────
	// d3.drag reports dx/dy in the container's coordinate system.  Because
	// the viewport rect lives inside the viewBox SVG, the deltas are already
	// in content-space units — just multiply by k to get main-SVG
	// translation pixels.
	const drag = d3.drag()
		.on('drag', function (event) {
			const k = currentTransform.k;
			const newTransform = d3.zoomIdentity
				.translate(
					currentTransform.x - event.dx * k,
					currentTransform.y - event.dy * k
				)
				.scale(k);

			mainSVG.call(zoom.transform, clampTransform(newTransform));
		});

	viewport.call(drag);

	// ── Destroy ──────────────────────────────────────────────────────────
	function destroy() {
		mainSVG.on('.zoom', null);
		minimapSvg.remove();
	}

	const resetZoom = () => {
		mainSVG?.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
	};
	
	const zoomIn = () => {
		mainSVG?.transition().duration(250).call(zoom.scaleBy, 1.2);
	};
	const zoomOut = () => {
		mainSVG?.transition().duration(250).call(zoom.scaleBy, 0.8);
	};
	return {
		mainSVG,
		updateViewport,
		destroy,
		resetZoom,
		zoomIn,
		zoomOut,
		element: minimapSvg.node()
	};
}

