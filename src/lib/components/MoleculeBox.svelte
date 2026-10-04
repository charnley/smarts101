<script>
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';

	/**
	 * @type {{
	 *   structureDefinition: string,
	 *   highlights?: { definitions?: any[], outline?: boolean, fill?: boolean },
	 *   width?: number,
	 *   height?: number,
	 *   useCoordgen?: boolean,
	 *   explicitHydrogens?: boolean,
	 *   hasMatch?: boolean,
	 *   name?: string,
	 * }}
	 */
	let {
		structureDefinition,
		highlights = { definitions: [] },
		width = 280,
		height = 200,
		useCoordgen = false,
		explicitHydrogens = false,
		hasMatch = $bindable(false),
		name,
	} = $props();
</script>

<div
	class="relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow duration-150"
>
	<div class="flex items-center justify-center bg-card p-1">
		<StructureRenderer
			{structureDefinition}
			{highlights}
			{width}
			{height}
			{useCoordgen}
			{explicitHydrogens}
			bind:hasMatch
		/>
	</div>
	{#if name}
		<Badge variant="secondary" class="absolute top-1 right-1 text-xs">{name}</Badge>
	{/if}
</div>
