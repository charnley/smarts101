<script>
	import { rdkitWorker } from './worker-manager.js';
	import { buildShapeIndex } from './outlining.js';
	import { buildHighlights } from './apply-highlights.js';
	import { untrack } from 'svelte';
	import { mode } from 'mode-watcher';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';

	/**
	 * Props
	 * @type {{
	 *   structureDefinition: string,
	 *   highlights?: { definitions?: any[], outline?: boolean, fill?: boolean },
	 *   width?: number,
	 *   height?: number,
	 *   isDarkMode?: boolean | null,
	 *   showAtomIndices?: boolean,
	 *   useCoordgen?: boolean,
	 *   explicitHydrogens?: boolean,
	 *   hasMatch?: boolean,
	 *   outlinesOnTop?: boolean,
	 * }}
	 */
	let {
		/** Structure definition — either a SMILES string or a molblock/SDF record */
		structureDefinition,
		highlights = { definitions: [], outline: true, fill: false },
		/** Width in pixels */
		width = 300,
		/** Height in pixels */
		height = 220,
		/**
		 * Override dark mode. null/undefined = auto-detect from mode-watcher.
		 * Pass true/false to force a specific palette (e.g. false for PNG export).
		 */
		isDarkMode = null,
		/** Show atom index numbers on the molecule. Default false. */
		showAtomIndices = false,
		/** Use CoordGen layout engine in RDKit. Default false. */
		useCoordgen = false,
		/** Keep explicit hydrogens when rendering (relevant for SDF input). Default false. */
		explicitHydrogens = false,
		/**
		 * Bindable — set to true when the current SMARTS highlights have at least one match
		 * on this molecule, false otherwise. Only meaningful when highlights.definitions is non-empty.
		 */
		hasMatch = $bindable(false),
		/** Draw SMARTS outlines over the molecule (true) or behind it (false). */
		outlinesOnTop = true,
	} = $props();

	// Resolve dark mode: prop override takes priority, otherwise follow the app theme.
	// mode.current is a Svelte 5 rune (not a store), so read it directly.
	let resolvedDarkMode = $derived(isDarkMode !== null ? isDarkMode : mode.current === 'dark');

	/** @type {HTMLDivElement|undefined} */
	let container = $state();
	let isRendering = $state(false);
	let renderError = $state(/** @type {string|null} */ (null));

	/** @typedef {{ svgRoot: SVGSVGElement, shapeIndex: import('./outlining.js').ShapeIndex, definition: string }} RenderedStructure */

	/** @type {RenderedStructure | null} */
	let rendered = $state.raw(null);

	let structureToken = 0;
	let highlightToken = 0;
	/** @type {RenderedStructure | null} */
	let highlightedStructure = null;
	let highlightedKey = '';

	$effect(() => {
		const target = container;
		const request = {
			definition: structureDefinition,
			width,
			height,
			isDarkMode: resolvedDarkMode,
			showAtomIndices,
			preferCoorDGen: useCoordgen,
			explicitHydrogens,
		};
		if (target && structureDefinition) untrack(() => renderStructure(target, request));
	});

	$effect(() => {
		const structure = rendered;
		const key = JSON.stringify({ highlights: highlights ?? {}, outlinesOnTop });
		untrack(() => {
			if (structure === highlightedStructure && key === highlightedKey) return;
			highlightedStructure = structure;
			highlightedKey = key;
			updateHighlights(structure);
		});
	});

	/**
	 * @param {HTMLDivElement} target
	 * @param {{ definition: string, width: number, height: number } & Record<string, any>} request
	 */
	async function renderStructure(target, { definition, ...options }) {
		const token = ++structureToken;
		isRendering = true;
		renderError = null;
		try {
			const { svg } = await rdkitWorker.generateSVG({ ...options, moleculeInput: definition });
			if (token !== structureToken) return;

			const shell = /** @type {Element} */ (target.querySelector('.structure-shell'));
			shell.innerHTML = svg;
			const svgRoot = shell.querySelector('svg');
			if (!svgRoot) throw new Error('No SVG from RDKit');
			recolorBlackElements(svgRoot);
			rendered = { svgRoot, shapeIndex: buildShapeIndex(svgRoot), definition };
		} catch (/** @type {any} */ err) {
			if (token !== structureToken) return;
			renderError = err?.message ?? 'Render failed';
			target.querySelector('.structure-shell')?.replaceChildren();
			rendered = null;
			hasMatch = false;
		} finally {
			if (token === structureToken) isRendering = false;
		}
	}

	/** @param {RenderedStructure | null} structure */
	async function updateHighlights(structure) {
		const token = ++highlightToken;
		if (!structure) return;

		/** @type {SVGGElement[]} */
		let groups = [];
		let matched = false;
		if (highlights?.definitions?.length) {
			try {
				const result = await buildHighlights({
					shapeIndex: structure.shapeIndex,
					highlights,
					definition: structure.definition,
				});
				groups = result.groups;
				matched = result.matched;
			} catch (err) {
				console.warn('[StructureRenderer] Highlighting failed', err);
			}
		}
		if (token !== highlightToken) return;

		for (const old of structure.svgRoot.querySelectorAll('.contour-highlight')) old.remove();
		// Reverse so the first match is painted last (on top of later matches).
		const ordered = [...groups].reverse();
		if (outlinesOnTop) structure.svgRoot.append(...ordered);
		else structure.svgRoot.prepend(...ordered);
		hasMatch = matched;
	}

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
	<div class="sr-container" bind:this={container}>
		<div class="structure-shell"></div>
	</div>

	{#if isRendering}
		<div class="sr-overlay" role="status" aria-label="Rendering…">
			<Spinner class="" />
		</div>
	{/if}

	{#if renderError}
		<div class="sr-error" role="alert" title={renderError}>
			<CircleXIcon size={32} />
		</div>
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

	.structure-shell :global(.contour-highlight) {
		pointer-events: none;
	}

	/* Centered spinner overlay */
	.sr-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--card, white) 60%, transparent);
		backdrop-filter: blur(1px);
	}

	.sr-error {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: color-mix(in srgb, white 50%, currentColor);
	}
</style>
