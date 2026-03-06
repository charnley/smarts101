/**
 * @fileoverview Selection utilities for the Interactive Depicter
 * Implements lasso selection for atoms and bonds
 */

// @ts-nocheck
import * as d3 from 'd3';
import classifyPoint from 'robust-point-in-polygon';

/**
 * @typedef {Object} SelectionOptions
 * @property {boolean} [multiSelect=true] - Allow multiple selections
 * @property {boolean} [closePathDistance=75] - Distance to auto-close lasso path
 * @property {string} [selector='.selectable'] - CSS selector for selectable items
 * @property {Function} [onStart] - Callback when selection starts
 * @property {Function} [onDraw] - Callback during selection drawing
 * @property {Function} [onEnd] - Callback when selection ends
 * @property {boolean} [resetOnStart=false] - Clear previous selections on new lasso
 */

/**
 * @typedef {Object} SelectionInstance
 * @property {Function} getSelectedItems - Get currently selected items
 * @property {Function} clearSelection - Clear all selections
 * @property {Function} selectItems - Programmatically select items
 * @property {Function} deselectItems - Programmatically deselect items
 * @property {Function} destroy - Clean up
 */

/**
 * Create lasso selection behavior.
 * Coordinates are computed in SVG viewport space using getCTM(),
 * so lasso works correctly even when content is zoomed/panned
 * via a zoom-container transform.
 *
 * @param {SVGSVGElement} svgElement - SVG element
 * @param {SelectionOptions} options - Configuration options
 * @returns {SelectionInstance}
 */
export function createLassoSelection(svgElement, options = {}) {
	const config = {
		multiSelect: true,
		closePathDistance: 75,
		selector: '.selectable',
		onStart: () => {},
		onDraw: () => {},
		onEnd: () => {},
		resetOnStart: false,
		...options
	};

	const svg = d3.select(svgElement);
	let items = svg.selectAll(config.selector);
	
	// Initialize lasso data on items
	items.nodes().forEach((node) => {
		const element = d3.select(node);
		if (!element.datum()) {
			element.datum({
				__lasso: {
					possible: false,
					selected: false
				}
			});
		}
	});

	// Create lasso container
	const lassoGroup = svg.append('g').attr('class', 'lasso-container');
	
	const drawnPath = lassoGroup
		.append('path')
		.attr('class', 'lasso-drawn-path')
		.attr('fill', 'rgba(4, 96, 169, 0.1)')
		.attr('stroke', 'rgba(156, 156, 157, 0.8)')
		.attr('stroke-width', 1);

	const closePath = lassoGroup
		.append('path')
		.attr('class', 'lasso-close-path')
		.attr('fill', 'none')
		.attr('stroke', 'rgba(156, 156, 157, 0.5)')
		.attr('stroke-width', 1)
		.attr('stroke-dasharray', '4,4');

	const originCircle = lassoGroup
		.append('circle')
		.attr('class', 'lasso-origin')
		.attr('r', 4)
		.attr('fill', 'rgba(4, 96, 169, 0.5)')
		.style('display', 'none');

	let isDrawing = false;
	let pathCoordinates = [];
	let origin = [0, 0];

	/**
	 * Get center point of an element
	 * @param {Element} element
	 * @returns {[number, number]}
	 */
	function getElementCenter(element) {
		try {
			// Get bounding box in element's local coordinate space
			const bbox = element.getBBox();
			const centerX = bbox.x + bbox.width / 2;
			const centerY = bbox.y + bbox.height / 2;

			// Create SVG point at the center
			const point = svgElement.createSVGPoint();
			point.x = centerX;
			point.y = centerY;

			// getCTM() transforms from element-local to SVG viewport space,
			// automatically accounting for any parent zoom-container transforms
			const ctm = element.getCTM();
			if (!ctm) return [centerX, centerY];

			const transformed = point.matrixTransform(ctm);
			return [transformed.x, transformed.y];
		} catch (e) {
			// Fallback: use screen coordinates mapped to SVG viewport
			const bbox = element.getBoundingClientRect();
			const pt = svgElement.createSVGPoint();
			pt.x = bbox.left + bbox.width / 2;
			pt.y = bbox.top + bbox.height / 2;
			const screenCTM = svgElement.getScreenCTM();
			if (screenCTM) {
				const svgPt = pt.matrixTransform(screenCTM.inverse());
				return [svgPt.x, svgPt.y];
			}
			const svgRect = svgElement.getBoundingClientRect();
			return [
				bbox.left + bbox.width / 2 - svgRect.left,
				bbox.top + bbox.height / 2 - svgRect.top
			];
		}
	}

	/**
	 * Check if point is inside polygon
	 * @param {[number, number]} point
	 * @param {Array<[number, number]>} polygon
	 * @returns {boolean}
	 */
	function isPointInPolygon(point, polygon) {
		if (polygon.length < 3) return false;
		const result = classifyPoint(polygon, point);
		return result <= 0; // -1 = inside, 0 = on boundary, 1 = outside
	}

	/**
	 * Calculate distance between two points
	 * @param {[number, number]} p1
	 * @param {[number, number]} p2
	 * @returns {number}
	 */
	function distance(p1, p2) {
		return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
	}

	/**
	 * Start lasso selection
	 */
	function handleStart(event) {
		const [x, y] = d3.pointer(event, svgElement);
		
		isDrawing = true;
		pathCoordinates = [[x, y]];
		origin = [x, y];

		// Reset selections if configured
		if (config.resetOnStart) {
			clearSelection();
		}

		// Initialize element data
		items = svg.selectAll(config.selector);
		items.each(function() {
			const node = this;
			const data = d3.select(node).datum() || {};
			data.__lasso = {
				possible: false,
				selected: data.__lasso?.selected || false,
				center: getElementCenter(node)
			};
			d3.select(node).datum(data);
		});

		originCircle
			.attr('cx', x)
			.attr('cy', y)
			.style('display', 'block');

		config.onStart(event, items);
	}

	/**
	 * Draw lasso path
	 */
	function handleDraw(event) {
		if (!isDrawing) return;

		const [x, y] = d3.pointer(event, svgElement);
		pathCoordinates.push([x, y]);

		// Create path string
		const pathString = pathCoordinates.reduce((path, point, i) => {
			return path + (i === 0 ? `M${point[0]},${point[1]}` : `L${point[0]},${point[1]}`);
		}, '');

		drawnPath.attr('d', pathString);

		// Check if close to origin
		const distToOrigin = distance([x, y], origin);
		if (distToOrigin < config.closePathDistance) {
			closePath
				.attr('d', `M${x},${y}L${origin[0]},${origin[1]}`)
				.style('display', 'block');
		} else {
			closePath.style('display', 'none');
		}

		// Check which items are inside the lasso
		const polygon = [...pathCoordinates];
		
		items.each(function() {
			const node = this;
			const data = d3.select(node).datum();
			if (data?.__lasso?.center) {
				const isPossible = isPointInPolygon(data.__lasso.center, polygon);
				data.__lasso.possible = isPossible;
				
				d3.select(node)
					.classed('lasso-possible', isPossible)
					.classed('lasso-not-possible', !isPossible);
			}
		});

		config.onDraw(event, items, getPossibleItems());
	}

	/**
	 * End lasso selection
	 */
	function handleEnd(event) {
		if (!isDrawing) return;

		isDrawing = false;

		// Finalize selection
		const selectedItems = [];
		items.each(function() {
			const node = this;
			const data = d3.select(node).datum();
			if (data?.__lasso?.possible) {
				data.__lasso.selected = true;
				d3.select(node)
					.classed('lasso-selected', true)
					.classed('lasso-possible', false);
				selectedItems.push(node);
			}
			d3.select(node).classed('lasso-not-possible', false);
		});

		// Clear lasso visuals
		drawnPath.attr('d', null);
		closePath.attr('d', null).style('display', 'none');
		originCircle.style('display', 'none');
		pathCoordinates = [];

		config.onEnd(event, items, selectedItems);
	}

	/**
	 * Set up event listeners
	 */
	let dragBehavior = d3.drag()
		.on('start', handleStart)
		.on('drag', handleDraw)
		.on('end', handleEnd);

	svg.call(dragBehavior);

	/**
	 * Get currently selected items
	 * @returns {Array<Element>}
	 */
	function getSelectedItems() {
		const selected = [];
		items.each(function() {
			const data = d3.select(this).datum();
			if (data?.__lasso?.selected) {
				selected.push(this);
			}
		});
		return selected;
	}

	/**
	 * Get possible items (currently being lassoed)
	 * @returns {Array<Element>}
	 */
	function getPossibleItems() {
		const possible = [];
		items.each(function() {
			const data = d3.select(this).datum();
			if (data?.__lasso?.possible) {
				possible.push(this);
			}
		});
		return possible;
	}

	/**
	 * Clear all selections
	 */
	function clearSelection() {
		items.each(function() {
			const data = d3.select(this).datum();
			if (data?.__lasso) {
				data.__lasso.selected = false;
			}
			d3.select(this).classed('lasso-selected', false);
		});
	}

	/**
	 * Programmatically select items
	 * @param {Array<Element>|Function} itemsOrPredicate - Items to select or predicate function
	 */
	function selectItems(itemsOrPredicate) {
		if (typeof itemsOrPredicate === 'function') {
			items.each(function(d, i) {
				if (itemsOrPredicate(this, d, i)) {
					const data = d3.select(this).datum();
					if (data) {
						data.__lasso = data.__lasso || {};
						data.__lasso.selected = true;
					}
					d3.select(this).classed('lasso-selected', true);
				}
			});
		} else {
			itemsOrPredicate.forEach((item) => {
				const data = d3.select(item).datum();
				if (data) {
					data.__lasso = data.__lasso || {};
					data.__lasso.selected = true;
				}
				d3.select(item).classed('lasso-selected', true);
			});
		}
	}

	/**
	 * Programmatically deselect items
	 * @param {Array<Element>|Function} itemsOrPredicate - Items to deselect or predicate function
	 */
	function deselectItems(itemsOrPredicate) {
		if (typeof itemsOrPredicate === 'function') {
			items.each(function(d, i) {
				if (itemsOrPredicate(this, d, i)) {
					const data = d3.select(this).datum();
					if (data?.__lasso) {
						data.__lasso.selected = false;
					}
					d3.select(this).classed('lasso-selected', false);
				}
			});
		} else {
			itemsOrPredicate.forEach((item) => {
				const data = d3.select(item).datum();
				if (data?.__lasso) {
					data.__lasso.selected = false;
				}
				d3.select(item).classed('lasso-selected', false);
			});
		}
	}

	/**
	 * Clean up
	 */
	function destroy() {
		svg.on('.drag', null);
		lassoGroup.remove();
	}

	return {
		getSelectedItems,
		clearSelection,
		selectItems,
		deselectItems,
		destroy
	};
}
