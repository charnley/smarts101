<script>
	import PilcrowIcon from '@lucide/svelte/icons/pilcrow';

	/** @type {{ id: string, level?: 'h1' | 'h2' | 'h3' | 'h4', children: import('svelte').Snippet }} */
	let { id, level = 'h2', children } = $props();
</script>

<svelte:element this={level} {id} class="anchor-heading">
	{@render children()}
	<a href="#{id}" class="anchor-link" aria-label="Link to this section">
		<PilcrowIcon size={16} />
	</a>
</svelte:element>

<style>
	.anchor-heading {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.anchor-link {
		opacity: 0;
		color: var(--color-muted-foreground, #888);
		text-decoration: none;
		transition: opacity 0.15s ease;
		flex-shrink: 0;
	}

	.anchor-heading:hover .anchor-link {
		opacity: 1;
	}
</style>
