<script>
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	/**
	 * @typedef {{ reactants: string[], products: string[] }} Slide
	 *
	 * @type {{
	 *   slides: Slide[],
	 *   width?: number,
	 *   height?: number,
	 * }}
	 */
	let { slides = [], width = 280, height = 200 } = $props();

	/** @type {'reactant' | 'product'} */
	let view = $state('reactant');

	let outcomeIndex = $state(0);

	/** Per-outcome fragment indices — lazy, defaults to 0 */
	let fragmentIndices = $state(/** @type {number[]} */ ([]));

	// clamp outcomeIndex when slides change
	$effect(() => {
		if (outcomeIndex >= slides.length) outcomeIndex = Math.max(0, slides.length - 1);
	});

	const totalOutcomes = $derived(slides.length);
	const currentSlide = $derived(slides[outcomeIndex] ?? { reactants: [], products: [] });
	const currentMols = $derived(
		view === 'reactant' ? currentSlide.reactants : currentSlide.products,
	);
	const totalFragments = $derived(currentMols.length);

	const fragmentIndex = $derived(fragmentIndices[outcomeIndex] ?? 0);
	const currentSmiles = $derived(currentMols[fragmentIndex] ?? '');

	function prevOutcome() {
		if (outcomeIndex > 0) outcomeIndex--;
	}
	function nextOutcome() {
		if (outcomeIndex < totalOutcomes - 1) outcomeIndex++;
	}

	function cycleFragment() {
		if (totalFragments <= 1) return;
		const next = ((fragmentIndices[outcomeIndex] ?? 0) + 1) % totalFragments;
		fragmentIndices[outcomeIndex] = next;
	}

	function toggleView() {
		view = view === 'reactant' ? 'product' : 'reactant';
	}
</script>

<div
	class="relative overflow-hidden rounded-lg border border-border bg-card"
	style="width:{width}px; height:{height}px"
>
	<!-- mol -->
	<div class="flex h-full w-full items-center justify-center">
		{#if !currentSmiles}
			<span class="text-xs text-muted-foreground italic">—</span>
		{:else}
			<StructureRenderer structureDefinition={currentSmiles} {width} {height} />
		{/if}
	</div>

	<!-- outcome nav — only when multiple outcomes and viewing products -->
	{#if totalOutcomes > 1 && view === 'product'}
		<div class="absolute top-1/2 left-1 -translate-y-1/2">
			<Button
				variant="ghost"
				size="icon-sm"
				disabled={outcomeIndex === 0}
				onclick={prevOutcome}
				aria-label="Previous outcome"
			>
				<ChevronLeft size={16} />
			</Button>
		</div>
		<div class="absolute top-1/2 right-1 -translate-y-1/2">
			<Button
				variant="ghost"
				size="icon-sm"
				disabled={outcomeIndex === totalOutcomes - 1}
				onclick={nextOutcome}
				aria-label="Next outcome"
			>
				<ChevronRight size={16} />
			</Button>
		</div>
	{/if}

	<!-- top-left: reactant/product toggle -->
	<Badge variant="secondary" onclick={toggleView} class="absolute top-2 left-2 cursor-pointer"
		>{view}</Badge
	>

	<!-- top-right: outcome badge -->
	{#if totalOutcomes > 1 && view === 'product'}
		<Badge variant="outline" onclick={toggleView} class="absolute top-2 right-2"
			>{outcomeIndex + 1}/{totalOutcomes}</Badge
		>
	{/if}

	<!-- bottom-right: fragment badge -->
	{#if totalFragments > 1}
		<Badge
			variant="secondary"
			onclick={cycleFragment}
			class="absolute right-2 bottom-2 cursor-pointer"
			>fragment {fragmentIndex + 1}/{totalFragments}</Badge
		>
	{/if}
</div>
