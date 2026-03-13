<script>
	import { generateMoleculeSVG } from './generate-svg.js';
	import { applySoftspots } from './apply-softspots.js';
	import { untrack } from 'svelte';
	import { mode } from 'mode-watcher';
	import { Spinner } from '$lib/components/ui/spinner/index.js';

	/**
	 * Props
	 * @type {{
	 *   smiles: string,
	 *   softspots?: { definitions?: any[], outline?: boolean, fill?: boolean },
	 *   width?: number,
	 *   height?: number,
	 *   darkMode?: boolean | null,
	 *   showAtomIndices?: boolean
	 * }}
	 */
	let {
		/** SMILES string for the molecule to render */
		smiles,
		/**
		 * SMARTS softspot configuration.
		 * definitions: array of { smarts, color, id?, name? }
		 * outline: draw outline (default true)
		 * fill:    fill the outline shape (default false)
		 */
		softspots = { definitions: [], outline: true, fill: false },
		/** Width in pixels */
		width = 300,
		/** Height in pixels */
		height = 220,
		/**
		 * Override dark mode. null/undefined = auto-detect from mode-watcher.
		 * Pass true/false to force a specific palette (e.g. false for PNG export).
		 */
		darkMode = null,
		/** Show atom index numbers on the molecule. Default false. */
		showAtomIndices = false
	} = $props();

	// Resolve dark mode: prop override takes priority, otherwise follow the app theme.
	// mode.current is a Svelte 5 rune (not a store), so read it directly.
	let isDark = $derived(darkMode !== null ? darkMode : mode.current === 'dark');

	// ── State ────────────────────────────────────────────────────────────────
	/** @type {HTMLDivElement|undefined} */
	let container = $state();
	let isRendering = $state(false);
	let renderError = $state(/** @type {string|null} */ (null));

	// ── Main render effect ────────────────────────────────────────────────────
	// Re-runs whenever any prop changes. Use void-array to track every dependency
	// unconditionally — && short-circuits on falsy values and drops tracking.
	// @ts-ignore
	$effect(async () => {
		void [smiles, container, width, height, softspots, isDark, showAtomIndices];

		untrack(async () => {
			if (!container || !smiles) return;

			isRendering = true;
			renderError = null;

			// Clear previous render (structure-shell is inside container)
			const shell = container.querySelector('.structure-shell');
			if (shell) shell.innerHTML = '';

			try {
				// Step 1: Generate molecule SVG via generate-svg.js pipeline
				// Pass darkMode and showAtomIndices as userDrawingOptions so the worker
				// receives them (generate-svg.js spreads userDrawingOptions into the payload).
				const needsHighlights = (softspots?.definitions?.length ?? 0) > 0;

				const { svgRoot, svgViewBox } = await generateMoleculeSVG({
					definition: smiles,
					container,
					width,
					height,
					userDrawingOptions: {
						darkMode: isDark,
						showAtomIndices
					},
					showBondIndices: false,
					needsHighlights
				});

				if (!svgRoot) throw new Error('No SVG from RDKit');

				// Step 1b: Replace hardcoded black fill/stroke values with currentColor.
				// RDKit bakes colors as both inline styles (style="fill:#000000") and
				// presentation attributes (fill="#000000"). Both must be replaced so that
				// bonds, wedge bonds, and R/S stereochemistry labels follow --foreground
				// in both light and dark themes.
				recolorBlackElements(svgRoot);

				// Step 2: Apply SMARTS softspot outlines if patterns are defined
				if (needsHighlights) {
					await applySoftspots({
						svgRoot,
						svgViewBox,
						softspots,
						definition: smiles
					});
				}
			} catch (/** @type {any} */ err) {
				renderError = err?.message ?? 'Render failed';
			} finally {
				isRendering = false;
			}
		});
	});

	/**
	 * Walk every element in the SVG and replace hardcoded black fill/stroke values
	 * with `currentColor` so bonds, wedge bonds, and R/S labels follow --foreground
	 * in both light and dark themes.
	 *
	 * RDKit bakes colors as inline styles (style="fill:#000000") AND as presentation
	 * attributes (fill="#000000"). Both forms must be replaced.
	 * Only unambiguously-black values are touched; heteroatom colors are left alone.
	 *
	 * @param {SVGSVGElement} svgRoot
	 */
	function recolorBlackElements(svgRoot) {
		const BLACK = new Set(['#000000', '#000', 'black', 'rgb(0,0,0)', 'rgb(0, 0, 0)']);
		svgRoot.querySelectorAll('*').forEach((el) => {
			const s = /** @type {SVGElement} */ (el).style;
			if (s) {
				if (BLACK.has(s.fill?.trim())) s.fill = 'currentColor';
				if (BLACK.has(s.stroke?.trim())) s.stroke = 'currentColor';
			}
			for (const attr of ['fill', 'stroke']) {
				const val = el.getAttribute(attr);
				if (val && BLACK.has(val.trim())) el.setAttribute(attr, 'currentColor');
			}
		});
	}
</script>

<div
	class="sr-shell"
	style:width="{width}px"
	style:height="{height}px"
	class:is-rendering={isRendering}
>
	<!-- generate-svg.js queries container.querySelector('.structure-shell') -->
	<div class="sr-container" bind:this={container}>
		<div class="structure-shell"></div>
	</div>

	{#if isRendering}
		<div class="sr-overlay" role="status" aria-label="Rendering…">
			<Spinner />
		</div>
	{/if}

	{#if renderError}
		<div class="sr-error" role="alert">{renderError}</div>
	{/if}
</div>

<style>
	.sr-shell {
		position: relative;
		overflow: hidden;
		background: transparent;
		box-sizing: border-box;
	}

	.sr-shell.is-rendering {
		pointer-events: none;
	}

	.sr-container {
		width: 100%;
		height: 100%;
	}

	.structure-shell {
		width: 100%;
		height: 100%;
		color: var(--foreground);
	}

	.structure-shell :global(svg) {
		width: 100%;
		height: 100%;
	}

	/* Centered spinner overlay */
	.sr-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--background, white) 60%, transparent);
		backdrop-filter: blur(1px);
	}

	.sr-spinner {
		width: 28px;
		height: 28px;
		border: 3px solid color-mix(in srgb, currentColor 20%, transparent);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: sr-spin 0.7s linear infinite;
	}

	@keyframes sr-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.sr-error {
		position: absolute;
		inset: auto 0 0 0;
		padding: 4px 8px;
		font-size: 11px;
		background: color-mix(in srgb, red 10%, var(--background, white));
		color: color-mix(in srgb, red 70%, currentColor);
		border-top: 1px solid color-mix(in srgb, red 30%, transparent);
	}
</style>
