<script>
	import { rdkitWorker } from '$lib/structure-renderer/worker-manager.js';
	import { mode } from 'mode-watcher';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import { untrack } from 'svelte';

	/**
	 * @type {{
	 *   smarts: string,
	 *   width?: number,
	 *   height?: number,
	 *   darkMode?: boolean | null,
	 * }}
	 */
	let { smarts, width = 300, height = 220, darkMode = null } = $props();

	let isDark = $derived(darkMode !== null ? darkMode : mode.current === 'dark');

	/** @type {string | null} */
	let svg = $state(null);
	let isRendering = $state(false);
	let renderError = $state(/** @type {string | null} */ (null));

	/** @type {HTMLDivElement | undefined} */
	let container = $state();

	// Re-render whenever smarts, size, or theme changes
	// @ts-ignore
	$effect(async () => {
		void [smarts, width, height, isDark, container];

		untrack(async () => {
			if (!smarts?.trim()) {
				svg = null;
				renderError = null;
				return;
			}

			isRendering = true;
			renderError = null;

			try {
				const result = await rdkitWorker.generateQuerySVG({
					smartsInput: smarts.trim(),
					width,
					height,
					darkMode: isDark,
				});

				// Parse the SVG string, recolour black → currentColor, then re-serialise
				const parser = new DOMParser();
				const doc = parser.parseFromString(result.svg, 'image/svg+xml');
				const svgEl = /** @type {SVGSVGElement} */ (doc.documentElement);
				recolorBlackElements(svgEl);
				svg = svgEl.outerHTML;
			} catch (/** @type {any} */ err) {
				svg = null;
				renderError = err?.message ?? 'Render failed';
			} finally {
				isRendering = false;
			}
		});
	});

	/**
	 * Replace hardcoded black fill/stroke with currentColor for dark-mode support.
	 * @param {SVGSVGElement} svgEl
	 */
	function recolorBlackElements(svgEl) {
		const BLACK = new Set(['#000000', '#000', 'black', 'rgb(0,0,0)', 'rgb(0, 0, 0)']);
		svgEl.querySelectorAll('*').forEach((el) => {
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

<div class="sr-shell" style:width="{width}px" style:height="{height}px" bind:this={container}>
	{#if svg}
		<div class="structure-shell">
			{@html svg}
		</div>
	{/if}

	{#if isRendering}
		<div class="sr-overlay" role="status" aria-label="Rendering…">
			<Spinner />
		</div>
	{/if}

	{#if renderError && !isRendering}
		<div class="sr-error" role="alert" title={renderError}>
			<CircleXIcon size={28} />
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

	.structure-shell {
		width: 100%;
		height: 100%;
		color: var(--foreground);
	}

	.structure-shell :global(svg) {
		width: 100%;
		height: 100%;
	}

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
		opacity: 0.4;
	}
</style>
