<script module>
	import { generateMoleculeSVG } from './lib/generate-svg.js';
	import { applySoftspots } from './lib/apply-softspots.js';
	import { toPng } from 'html-to-image';
</script>

<script>
	import { createLassoSelection } from './lib/selection.js';
	import { createMinimap } from './lib/zoom-pan.js';
	import { tick, untrack } from 'svelte';

	let {
		/** @type {string} Molecule definition (SMILES, molblock, etc.) */
		definition,
		/** @type {{ definitions?: any[], outline?: boolean, fill?: boolean }} SMARTS softspot configuration */
		softspots = { definitions: [], outline: true, fill: true },
		/** @type {number} Component width in pixels */
		width = 600,
		/** @type {number} Component height in pixels */
		height = 400,
		/** @type {Object} Extra RDKit drawing options */
		userDrawingOptions = {},
		/** @type {boolean} Whether to show bond index labels */
		showBondIndices = false,
		/** @type {{ enabled?: boolean, kind?: string, type?: string }} Selection configuration */
		selection = { enabled: false, kind: 'lasso', type: 'select' },
		/** @type {{ visible?: boolean, position?: string, ratio?: number, requireShiftForMinimap?: boolean }} Minimap configuration */
		minimapOptions = { visible: false },
		/** @type {string[]} Active softspot IDs to highlight */
		highlights = $bindable([]),
		/** @type {Function|undefined} Optional callback for selection events */
		onselectionchange = undefined,
		/** @type {Function|undefined} Optional callback when rendering completes */
		onrenderend = undefined,
		/** @type {Function|undefined} Optional callback when an error occurs */
		onrendererror = undefined,
		/** @type {boolean} Whether to show a native context menu with copy options */
		enableContextMenu = false,
		...restProps
	} = $props();

	// ── Reactive state ─────────────────────────────────────────────────
	let container = $state();
	let isRendering = $state(false);
	let renderingStep = $state('');
	/** @type {string|null} */
	let renderError = $state(null);

	/** @type {any} */
	let minimap = $state();
	/** @type {any} */
	let lassoInstance = $state();

	/** @type {{ monoisotopic?: number, mostAbundantMonoisotopic?: number, weightedMean?: number } | null} */
	let _mass = $state(null);
	/** @type {string|null} */
	let _formula = $state(null);
	/** @type {string|null} */
	let _smiles = $state(null);
	/** @type {string|null} */
	let _molblock = $state(null);

	/** @type {Array<{id: string, name: string, query: string[], color: string|number[], atoms: number[], bonds: number[]}>} */
	let detectedSoftspots = $state([]);

	/** @type {HTMLElement|null} */
	let popoverEl = $state(null);
	/** @type {boolean} */
	let isCopyingImage = $state(false);

	// ── Exported methods ────────────────────────────────────────────────

	/**
	 * Zoom in on the structure.
	 */
	export const zoomIn = () => {
		minimap?.zoomIn?.();
	};

	/**
	 * Zoom out on the structure.
	 */
	export const zoomOut = () => {
		minimap?.zoomOut?.();
	};

	/**
	 * Reset zoom to default level.
	 */
	export const resetZoom = () => {
		minimap?.resetZoom?.();
	};

	/**
	 * Get the list of detected softspots with atom and bond details.
	 * @returns {Array<{id: string, name: string, query: string[], color: string|number[], atoms: number[], bonds: number[]}>}
	 */
	export const getDetectedSoftspots = () => detectedSoftspots;

	/**
	 * Toggle visibility of a specific softspot outline.
	 * @param {string} softspotId - The softspot id (e.g. "hydroxyl-0")
	 * @param {boolean} [visible] - Force visible/hidden. Omit to toggle.
	 */
	export const toggleSoftspotVisibility = (softspotId, visible) => {
		const svg = container?.querySelector('.structure-shell svg');
		if (!svg) return;
		const group = svg.querySelector(`[data-contour-id="${softspotId}"]`);
		if (!group) return;
		const isHidden = group.getAttribute('visibility') === 'hidden';
		const show = visible ?? isHidden;
		group.setAttribute('visibility', show ? 'visible' : 'hidden');
	};

	/**
	 * Get extracted molecular properties.
	 * @returns {{ mass: any, formula: string|null, smiles: string|null, molblock: string|null }}
	 */
	export const getMolecularProperties = () => ({
		mass: _mass,
		formula: _formula,
		smiles: _smiles,
		molblock: _molblock,
	});

	/**
	 * Get the SVG element for external usage (e.g. export).
	 * @returns {SVGSVGElement|null}
	 */
	export const getSvgElement = () =>
		container?.querySelector('.structure-shell svg') ?? null;

	/**
	 * Copy text to the clipboard.
	 * @param {string} text
	 */
	const copyToClipboard = async (text) => {
		try {
			await navigator.clipboard.writeText(text);
		} catch (err) {
			console.error('[StructureRenderer] Failed to copy:', err);
		}
	};

	/**
	 * Close the context menu popover.
	 */
	const closeContextMenu = () => {
		try { popoverEl?.hidePopover(); } catch { /* already hidden */ }
	};

	/**
	 * Handle right-click context menu using HTML popover.
	 * @param {MouseEvent} e
	 */
	const handleContextMenu = (e) => {
		if (!enableContextMenu) return;
		e.preventDefault();
		if (!popoverEl) return;

		// Show off-screen so we can measure before placing
		popoverEl.style.left = '-9999px';
		popoverEl.style.top = '-9999px';
		try { popoverEl.showPopover(); } catch { /* already open */ }

		const rect = popoverEl.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const pad = 4;

		// Flip horizontally: open left if cursor is too close to right edge
		const x = (e.clientX + rect.width + pad > vw)
			? Math.max(pad, e.clientX - rect.width)
			: e.clientX;

		// Flip vertically: open upward if cursor is too close to bottom edge
		const y = (e.clientY + rect.height + pad > vh)
			? Math.max(pad, e.clientY - rect.height)
			: e.clientY;

		popoverEl.style.left = `${x}px`;
		popoverEl.style.top = `${y}px`;
	};

	/**
	 * Inline critical styles on SVG nodes so html-to-image captures them.
	 * - Copies computed `fill`, `stroke`, `opacity`, `fill-opacity`, `stroke-opacity`,
	 *   and `stroke-width` onto each element in the subtree.
	 * - Works for mixed HTML+SVG content.
	 */
	const inlineSvgPaintStyles = (root) => {
		const PROPS = [
			'fill',
			'stroke',
			'opacity',
			'fill-opacity',
			'stroke-opacity',
			'stroke-width',
			// Add more if your charts need them:
			'stroke-linecap',
			'stroke-linejoin',
			'stroke-dasharray',
			'stroke-dashoffset',
			'display',
		];

		const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
		let node = root;

		while (node) {
			// Only inline for SVG elements (including <svg> itself)
			if (node instanceof SVGElement) {
				const cs = getComputedStyle(node);

				// Write into the inline style to preserve precedence when serialized
				PROPS.forEach((prop) => {
					const val = cs.getPropertyValue(prop);
					if (val) {
						node.style.setProperty(prop, val);
					}
				});

				// Optional: convert presentation attributes if present
				// e.g., ensure `fill-opacity` becomes an attribute too:
				const fillOpacity = cs.getPropertyValue('fill-opacity');
				if (fillOpacity) node.setAttribute('fill-opacity', fillOpacity);

				const strokeOpacity = cs.getPropertyValue('stroke-opacity');
				if (strokeOpacity) node.setAttribute('stroke-opacity', strokeOpacity);
			}

			node = walker.nextNode();
		}
	};

	/**
	 * Copy the rendered structure as a PNG image to the clipboard.
	 */
	const copyAsImage = async () => {
		const shell = container?.querySelector('.structure-shell');
		if (!shell) return;
		isCopyingImage = true;
		try {
			inlineSvgPaintStyles(shell);
			const dataUrl = await toPng(/** @type {HTMLElement} */ (shell), {
				backgroundColor: '#ffffff',
				pixelRatio: 2,
				filter: (/** @type {Element} */ node) => {
					// Hide the minimap overlay
					if (node?.classList?.contains('minimap')) return false;
					// Hide bond index labels
					if (node?.classList?.contains('note')) return false;
					return true;
				},
				includeStyleProperties: [
					'fill',
					'stroke',
					'stroke-width',
					'fill-opacity',
					'stroke-opacity',
					'opacity'
				],
			});
			const res = await fetch(dataUrl);
			const blob = await res.blob();
			await navigator.clipboard.write([
				new ClipboardItem({ 'image/png': blob }),
			]);
		} catch (err) {
			console.error('[StructureRenderer] Failed to copy image:', err);
		} finally {
			isCopyingImage = false;
		}
	};

	/**
	 * Format mass values as a readable string.
	 * @returns {string}
	 */
	const formatMasses = () => {
		if (!_mass) return '';
		const lines = [];
		if (_mass.monoisotopic != null) lines.push(`Monoisotopic: ${_mass.monoisotopic}`);
		if (_mass.mostAbundantMonoisotopic != null) lines.push(`Most abundant: ${_mass.mostAbundantMonoisotopic}`);
		if (_mass.weightedMean != null) lines.push(`Weighted mean: ${_mass.weightedMean}`);
		return lines.join('\n');
	};

	// ── Main rendering pipeline ────────────────────────────────────────
	// @ts-ignore
	$effect(async () => {
		definition && container && softspots && minimapOptions;
		untrack(async () => {
			if (!container?.querySelector) return;

			// Clean previous render
			container.querySelector('.structure-shell').innerHTML = '';
			minimap?.destroy?.();
			minimap = null;
			lassoInstance?.destroy?.();
			lassoInstance = null;
			detectedSoftspots = [];
			_mass = null;
			_formula = null;
			_smiles = null;
			_molblock = null;
			isRendering = true;
			renderingStep = 'Initializing...';
			renderError = null;

			if (!definition) {
				renderError = 'No structure definition provided';
				isRendering = false;
				renderingStep = '';
				onrendererror?.('No structure definition provided');
				return;
			}

			try {
				// Step 1: Generate molecule SVG
				renderingStep = 'Generating molecule layout...';
				const needsHighlights = (softspots?.definitions?.length ?? 0) > 0;
				const {
					svgRoot,
					svgViewBox,
					mass,
					formula,
					smiles,
					molblock,
				} = await generateMoleculeSVG({
					definition,
					container,
					width,
					height,
					userDrawingOptions,
					showBondIndices,
					needsHighlights,
				});

				_mass = mass;
				_formula = formula;
				_smiles = smiles;
				_molblock = molblock;

				// Step 2: Softspot SMARTS outlines
				if (softspots?.definitions?.length > 0) {
					renderingStep = 'Searching for SMARTS patterns...';
					const { detectedSoftspots: found } = await applySoftspots({
						svgRoot,
						svgViewBox,
						softspots,
						definition,
					});
					detectedSoftspots = found;
				}

				/**
				 * Initialize lasso selection on the structure SVG.
				 */
				const setupLasso = () => {
					if (!selection?.enabled || !container) return;
					const selectionSvg =
						container.querySelector('.structure-shell svg');
					if (!selectionSvg) return;

					lassoInstance = createLassoSelection(selectionSvg, {
						selector: 'g[data-cleavage-id] > .cleavage',
						resetOnStart: selection.type !== 'select',
						onEnd: (/** @type {any} */ _event, /** @type {any} */ _items, /** @type {any} */ selectedItems) => {
							/** @type {number[]} */
							const bondIds = [];
							selectedItems.forEach((/** @type {Element} */ el) => {
								const cleavageId =
									el.parentElement?.getAttribute(
										'data-cleavage-id'
									);
								if (cleavageId) {
									const id = parseInt(cleavageId);
									if (!bondIds.includes(id)) bondIds.push(id);
								}
							});
							highlights = bondIds;
							onselectionchange?.({ bonds: bondIds });
						},
					});
				};

				// Step 3: Setup minimap if enabled
				if (minimapOptions?.visible && container) {
					renderingStep = 'Setting up minimap...';
					await tick();
					setTimeout(() => {
						const mainSVG =
							container.querySelector('.structure-shell');
						minimap = createMinimap(mainSVG, {
							position: 'top-right',
							ratio: 0.15,
							minimap: {
								requireShiftForMinimap: true,
							},
							...minimapOptions,
						});
						// Lasso after minimap (content now in zoom-container)
						setupLasso();
					}, 125);
				} else if (selection?.enabled) {
					renderingStep = 'Setting up selection...';
					await tick();
					setupLasso();
				}

				renderingStep = 'Rendering complete';
				onrenderend?.({
					mass: _mass,
					formula: _formula,
					smiles: _smiles,
					molblock: _molblock,
					detectedSoftspots,
				});
			} catch (/** @type {any} */ err) {
				console.error('[StructureRenderer] Error generating SVG:', err);
				renderError = err?.message || 'Unknown error';
				onrendererror?.(renderError);
			} finally {
				isRendering = false;
				renderingStep = '';
			}
		});
	});
</script>

<div
	class="sr-shell"
	class:is-rendering={isRendering}
	style:width="{width}px"
	style:height="{height}px"
	data-showIndices={showBondIndices ?? false}
	{...restProps}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="sr-container" bind:this={container} oncontextmenu={handleContextMenu}>
		<div class="structure-shell"></div>

		{#if isRendering}
			<div class="sr-progress" role="status" aria-live="polite">
				<div class="sr-progress-bar">
					<div class="sr-progress-track"></div>
				</div>
				<span class="sr-progress-label">Rendering...</span>
				{#if renderingStep}
					<span class="sr-progress-helper">{renderingStep}</span>
				{/if}
			</div>
		{/if}

		{#if renderError}
			<div class="sr-error" role="alert">
				<div class="sr-error-icon">
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
						<line x1="8" y1="4" x2="8" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
						<circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
					</svg>
				</div>
				<div class="sr-error-text">
					<strong>Could not load structure</strong>
					<span>{renderError}</span>
				</div>
			</div>
		{/if}
	</div>

	{#if enableContextMenu}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="sr-context-menu"
			popover="auto"
			bind:this={popoverEl}
			role="menu"
		>
			{#if _smiles}
				<button class="sr-menu-item" role="menuitem" onclick={() => { copyToClipboard(_smiles ?? ''); closeContextMenu(); }}>
					<span class="sr-menu-icon">📋</span> Copy SMILES
				</button>
			{/if}
			{#if _molblock}
				<button class="sr-menu-item" role="menuitem" onclick={() => { copyToClipboard(_molblock ?? ''); closeContextMenu(); }}>
					<span class="sr-menu-icon">🧱</span> Copy Molblock
				</button>
			{/if}
			<button class="sr-menu-item" role="menuitem" disabled={isCopyingImage} onclick={() => { copyAsImage(); closeContextMenu(); }}>
				<span class="sr-menu-icon">🖼️</span> {isCopyingImage ? 'Copying...' : 'Copy as Image'}
			</button>
			{#if _mass}
				<div class="sr-menu-separator"></div>
				<div class="sr-menu-group-label">MASSES [Da]</div>
				{#if _mass.monoisotopic != null}
					<button class="sr-menu-item" role="menuitem" onclick={() => { copyToClipboard(`${_mass?.monoisotopic}`); closeContextMenu(); }}>
						<span class="sr-menu-icon">⚖️</span> Monoisotopic
						<span class="sr-menu-value">{Number(_mass.monoisotopic).toFixed(4)}</span>
					</button>
				{/if}
				{#if _mass.mostAbundantMonoisotopic != null}
					<button class="sr-menu-item" role="menuitem" onclick={() => { copyToClipboard(`${_mass?.mostAbundantMonoisotopic}`); closeContextMenu(); }}>
						<span class="sr-menu-icon">⚖️</span> Most Abundant
						<span class="sr-menu-value">{Number(_mass.mostAbundantMonoisotopic).toFixed(4)}</span>
					</button>
				{/if}
				{#if _mass.weightedMean != null}
					<button class="sr-menu-item" role="menuitem" onclick={() => { copyToClipboard(`${_mass?.weightedMean}`); closeContextMenu(); }}>
						<span class="sr-menu-icon">⚖️</span> Weighted Mean
						<span class="sr-menu-value">{Number(_mass.weightedMean).toFixed(4)}</span>
					</button>
				{/if}
				<div class="sr-menu-separator"></div>
				<button class="sr-menu-item" role="menuitem" onclick={() => { copyToClipboard(formatMasses()); closeContextMenu(); }}>
					<span class="sr-menu-icon">📋</span> Copy All Masses
				</button>
			{/if}
			{#if _formula}
				<div class="sr-menu-separator"></div>
				<button class="sr-menu-item" role="menuitem" onclick={() => { copyToClipboard(_formula ?? ''); closeContextMenu(); }}>
					<span class="sr-menu-icon">🧪</span> Copy Formula
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* ── Shell layout ─────────────────────────────────────────── */
	.sr-shell {
		position: relative;
		box-sizing: border-box;
		overflow: hidden;
		display: grid;
		transform: translateZ(0);
		border: 1px solid var(--sr-border-color, #e0e0e0);
		background: var(--sr-background, #ffffff);
		border-radius: var(--sr-border-radius, 0);
	}

	.sr-shell.is-rendering {
		pointer-events: none;
		opacity: 0.7;
	}

	.sr-container {
		position: relative;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
	}

	/* ── Progress bar (native) ────────────────────────────────── */
	.sr-progress {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 4px 8px;
		background: rgba(255, 255, 255, 0.9);
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.sr-progress-bar {
		height: 3px;
		background: #e0e0e0;
		border-radius: 1.5px;
		overflow: hidden;
	}

	.sr-progress-track {
		height: 100%;
		width: 30%;
		background: var(--sr-accent-color, #0f62fe);
		border-radius: 1.5px;
		animation: sr-indeterminate 1.5s ease-in-out infinite;
	}

	@keyframes sr-indeterminate {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(400%);
		}
	}

	.sr-progress-label {
		font-size: 11px;
		font-weight: 600;
		color: #525252;
	}

	.sr-progress-helper {
		font-size: 10px;
		color: #8d8d8d;
	}

	/* ── Error state ──────────────────────────────────────────── */
	.sr-error {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 8px 12px;
		background: #fff1f1;
		border-top: 2px solid #da1e28;
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.sr-error-icon {
		color: #da1e28;
		flex-shrink: 0;
		margin-top: 1px;
	}

	.sr-error-text {
		display: flex;
		flex-direction: column;
		font-size: 12px;
		color: #161616;
	}

	.sr-error-text strong {
		font-weight: 600;
		margin-bottom: 2px;
	}

	.sr-error-text span {
		color: #525252;
		font-size: 11px;
	}

	/* ── Context menu (popover) ───────────────────────────────── */
	.sr-context-menu {
		position: fixed;
		margin: 0;
		inset: unset;
		min-width: 200px;
		max-height: calc(100vh - 8px);
		max-width: calc(100vw - 8px);
		overflow-y: auto;
		background: #fff;
		border: 1px solid #d4d4d4;
		border-radius: 6px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
		padding: 4px 0;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.sr-context-menu::backdrop {
		background: transparent;
	}

	.sr-menu-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 7px 14px;
		background: none;
		border: none;
		text-align: left;
		font-size: 13px;
		color: #161616;
		cursor: pointer;
		white-space: nowrap;
	}

	.sr-menu-item:hover {
		background: #f0f0f0;
	}

	.sr-menu-item:active {
		background: #e0e0e0;
	}

	.sr-menu-item:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.sr-menu-icon {
		font-size: 14px;
		line-height: 1;
		flex-shrink: 0;
		width: 18px;
		text-align: center;
	}

	.sr-menu-value {
		margin-left: auto;
		padding-left: 16px;
		font-size: 11px;
		color: #8d8d8d;
		font-variant-numeric: tabular-nums;
	}

	.sr-menu-separator {
		height: 1px;
		background: #e4e4e4;
		margin: 4px 0;
	}

	.sr-menu-group-label {
		padding: 4px 14px 2px;
		font-size: 11px;
		font-weight: 600;
		color: #8d8d8d;
		/* text-transform: uppercase; */
		letter-spacing: 0.04em;
	}

	/* ── Bond indices ─────────────────────────────────────────── */
	.sr-shell[data-showIndices='true'] :global(svg .note) {
		stroke-opacity: 0.75 !important;
		fill-opacity: 0.75 !important;
	}

	.sr-shell[data-showIndices='false'] :global(svg .note) {
		display: none;
	}

	/* ── Softspot highlights ──────────────────────────────────── */
	:global(.sr-shell svg g.contour-highlight path) {
		transition: opacity 0.2s ease;
	}

	/* ── Lasso selection styles ───────────────────────────────── */
	:global(.sr-container .lasso--origin) {
		fill: var(--sr-accent-color, #0f62fe);
		fill-opacity: 0.5;
	}

	:global(.sr-container .lasso--drawn_path) {
		fill-opacity: 0.05;
	}

	:global(.sr-container .lasso--container path) {
		stroke: rgb(156, 156, 157);
		stroke-width: 0.25px;
	}

	:global(.sr-container .lasso--loop_close) {
		fill: none;
		stroke-dasharray: 4, 4;
		stroke-width: 1;
	}
</style>
