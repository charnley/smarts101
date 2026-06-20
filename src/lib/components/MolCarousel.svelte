<script>
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	/**
	 * @typedef {{ reactants: string[], products: string[] }} Slide
	 *
	 * @type {{
	 *   slides: Slide[],
	 *   width?: number,
	 *   height?: number,
	 *   highlights?: { definitions?: any[], outline?: boolean, fill?: boolean },
	 *   reactantFragmentIndex?: number,
	 *   productFragmentIndex?: number,
	 * }}
	 */
	let {
		slides = [],
		width = 280,
		height = 200,
		highlights = { definitions: [], outline: true, fill: false },
		reactantFragmentIndex = $bindable(0),
		productFragmentIndex = $bindable(0),
	} = $props();

	let outcomeIndex = $state(0);

	$effect(() => {
		if (outcomeIndex >= slides.length) outcomeIndex = Math.max(0, slides.length - 1);
	});

	const totalOutcomes = $derived(slides.length);
	const currentSlide = $derived(slides[outcomeIndex] ?? { reactants: [], products: [] });

	const reactantMols = $derived(currentSlide.reactants);
	const productMols = $derived(currentSlide.products);

	const reactantTotalFragments = $derived(reactantMols.length);
	const productTotalFragments = $derived(productMols.length);

	const displayedReactantFragmentIndex = $derived(
		Math.min(reactantFragmentIndex, Math.max(0, reactantTotalFragments - 1)),
	);
	const displayedProductFragmentIndex = $derived(
		Math.min(productFragmentIndex, Math.max(0, productTotalFragments - 1)),
	);

	const reactantSmiles = $derived(reactantMols[displayedReactantFragmentIndex] ?? '');
	const productSmiles = $derived(productMols[displayedProductFragmentIndex] ?? '');

	const molWidth = $derived(Math.floor((width - 60) / 2));

	function prevOutcome() {
		if (outcomeIndex > 0) outcomeIndex--;
	}
	function nextOutcome() {
		if (outcomeIndex < totalOutcomes - 1) outcomeIndex++;
	}

	function cycleReactantFragment() {
		if (reactantTotalFragments <= 1) return;
		reactantFragmentIndex = (reactantFragmentIndex + 1) % reactantTotalFragments;
	}

	function cycleProductFragment() {
		if (productTotalFragments <= 1) return;
		productFragmentIndex = (productFragmentIndex + 1) % productTotalFragments;
	}
</script>

<div
	class="relative flex flex-col gap-1 overflow-hidden rounded-lg border border-border bg-card p-2 transition-shadow duration-150"
>
	<!-- top bar: labels + outcome -->
	<div class="flex items-center justify-between px-1">
		<div class="flex items-center gap-1.5">
			<Badge variant="secondary">reactant</Badge>
			<ArrowRight size={14} class="text-muted-foreground/60" />
			<Badge variant="secondary">product</Badge>
		</div>
		{#if totalOutcomes > 1}
			<Badge variant="outline">{outcomeIndex + 1}/{totalOutcomes}</Badge>
		{/if}
	</div>

	<!-- molecules side-by-side -->
	<div class="flex items-center gap-1">
		<!-- reactant -->
		<div class="flex-1 flex flex-col items-center gap-0.5">
			{#if !reactantSmiles}
				<div
					class="flex items-center justify-center"
					style:width="{molWidth}px"
					style:height="{height}px"
				>
					<CircleXIcon size={32} class="text-muted-foreground/40" />
				</div>
			{:else}
				<StructureRenderer structureDefinition={reactantSmiles} width={molWidth} {height} {highlights} />
			{/if}
			{#if reactantTotalFragments > 1}
				<Badge
					variant="secondary"
					onclick={cycleReactantFragment}
					class="cursor-pointer text-xs"
				>
					fragment {displayedReactantFragmentIndex + 1}/{reactantTotalFragments}
				</Badge>
			{/if}
		</div>

		<ArrowRight size={20} class="shrink-0 text-muted-foreground/40" />

		<!-- product -->
		<div class="flex-1 flex flex-col items-center gap-0.5">
			{#if !productSmiles}
				<div
					class="flex items-center justify-center"
					style:width="{molWidth}px"
					style:height="{height}px"
				>
					<CircleXIcon size={32} class="text-muted-foreground/40" />
				</div>
			{:else}
				<StructureRenderer
					structureDefinition={productSmiles}
					width={molWidth}
					{height}
					highlights={{ definitions: [], outline: true, fill: false }}
				/>
			{/if}
			{#if productTotalFragments > 1}
				<Badge
					variant="secondary"
					onclick={cycleProductFragment}
					class="cursor-pointer text-xs"
				>
					fragment {displayedProductFragmentIndex + 1}/{productTotalFragments}
				</Badge>
			{/if}
		</div>
	</div>

	<!-- outcome nav -->
	{#if totalOutcomes > 1}
		<div class="flex items-center justify-center gap-2">
			<Button
				variant="ghost"
				size="icon-sm"
				disabled={outcomeIndex === 0}
				onclick={prevOutcome}
				aria-label="Previous outcome"
			>
				<ChevronLeft size={16} />
			</Button>
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
</div>
