<script>
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';

	/**
	 * @type {{
	 *   structureDefinition: string,
	 *   highlights?: { definitions?: any[], outline?: boolean, fill?: boolean },
	 * }}
	 */
	let { structureDefinition, highlights = { definitions: [] } } = $props();
</script>

<div
	class="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow duration-150"
>
	<div class="flex items-center justify-center bg-card p-1">
		<StructureRenderer {structureDefinition} {highlights} width={280} height={200} />
	</div>
</div>
