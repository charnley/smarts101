<script>
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';

	/**
	 * @type {{
	 *   structureDefinition: string,
	 *   highlights?: { definitions?: any[], outline?: boolean, fill?: boolean },
	 *   width?: number,
	 *   height?: number,
	 *   preferCoorDGen?: boolean,
	 *   explicitHydrogens?: boolean,
	 * }}
	 */
	let {
		structureDefinition,
		highlights = { definitions: [] },
		width = 280,
		height = 200,
		preferCoorDGen = false,
		explicitHydrogens = false,
	} = $props();
</script>

<div
	class="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow duration-150"
>
	<div class="flex items-center justify-center bg-card p-1">
		<StructureRenderer
			{structureDefinition}
			{highlights}
			{width}
			{height}
			{preferCoorDGen}
			{explicitHydrogens}
		/>
	</div>
</div>
