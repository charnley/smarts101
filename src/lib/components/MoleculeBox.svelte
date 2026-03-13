<script>
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';
	import XIcon from '@lucide/svelte/icons/x';

	/**
	 * @type {{
	 *   smiles: string,
	 *   name?: string,
	 *   highlights?: { definitions?: any[], outline?: boolean, fill?: boolean },
	 *   onremove?: () => void
	 * }}
	 */
	let { smiles, name = '', highlights = { definitions: [] }, onremove } = $props();
</script>

<div class="molecule-box">
	<div class="molecule-box__renderer">
		<StructureRenderer {smiles} {highlights} width={280} height={200} />
	</div>
</div>

<style>
	.molecule-box {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border, #e2e8f0);
		border-radius: 8px;
		overflow: hidden;
		background: var(--card, #fff);
		transition: box-shadow 0.15s ease;
	}

	.molecule-box:hover {
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
	}

	.molecule-box__renderer {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		background: var(--card);
	}
</style>
