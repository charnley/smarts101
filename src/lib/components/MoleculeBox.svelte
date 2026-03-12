<script>
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';
	import XIcon from '@lucide/svelte/icons/x';

	/**
	 * @type {{
	 *   smiles: string,
	 *   name?: string,
	 *   softspots?: { definitions?: any[], outline?: boolean, fill?: boolean },
	 *   onremove?: () => void
	 * }}
	 */
	let { smiles, name = '', softspots = { definitions: [] }, onremove } = $props();
</script>

<div class="molecule-box">
	<div class="molecule-box__header">
		{#if name}
			<span class="molecule-box__name">{name}</span>
		{/if}
		{#if onremove}
			<button
				class="molecule-box__remove"
				onclick={onremove}
				aria-label="Remove {name || 'molecule'}"
				title="Remove"
			>
				<XIcon size={14} />
			</button>
		{/if}
	</div>

	<div class="molecule-box__renderer">
		<StructureRenderer {smiles} {softspots} width={280} height={200} />
	</div>

	<div class="molecule-box__smiles" title={smiles}>{smiles}</div>
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

	.molecule-box__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 10px;
		min-height: 28px;
		border-bottom: 1px solid var(--border, #e2e8f0);
	}

	.molecule-box__name {
		font-size: 12px;
		font-weight: 600;
		color: var(--muted-foreground, #64748b);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.molecule-box__remove {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2px;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--muted-foreground, #94a3b8);
		border-radius: 3px;
		margin-left: auto;
		flex-shrink: 0;
	}

	.molecule-box__remove:hover {
		background: var(--destructive, #fee2e2);
		color: var(--destructive-foreground, #dc2626);
	}

	.molecule-box__renderer {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		background: var(--card);
	}

	.molecule-box__smiles {
		padding: 4px 10px 6px;
		font-size: 10px;
		font-family: ui-monospace, monospace;
		color: var(--muted-foreground, #94a3b8);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		border-top: 1px solid var(--border, #e2e8f0);
	}
</style>
