<script>
	import { Button } from '$lib/components/ui/button/index.js';
	import PanelRightClose from '@lucide/svelte/icons/panel-right-close';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { buildExplainer } from '$lib/grammar-smarts/smarts-docs.js';

	/**
	 * @typedef {import('$lib/grammar-smarts/smarts-docs.js').ExplainerEntry} ExplainerEntry
	 */

	/**
	 * @type {{
	 *   smarts: string,
	 *   tree?: import('web-tree-sitter').Tree | null,
	 *   cursorPos?: number,
	 *   onclose: () => void
	 * }}
	 */
	let { smarts, tree = null, cursorPos = 0, onclose } = $props();

	/** @type {ExplainerEntry[]} */
	let entries = $derived.by(() => {
		if (!tree || !smarts.trim()) return [];
		try {
			return buildExplainer(tree.rootNode, smarts);
		} catch {
			return [];
		}
	});

	/**
	 * Per-entry open state keyed by startIndex. Absent = open (true).
	 * @type {Set<number>}
	 */
	let collapsed = $state(new Set());

	/** @param {number} key */
	function toggle(key) {
		const next = new Set(collapsed);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		collapsed = next;
	}

	/** @param {ExplainerEntry} entry */
	function isActive(entry) {
		return cursorPos >= entry.startIndex && cursorPos <= entry.endIndex;
	}
</script>

<div class="flex w-72 shrink-0 flex-col gap-3">
	<div class="flex items-center justify-between">
		<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase"
			>Explanation</span
		>
		<Button variant="ghost" size="sm" aria-label="Close panel" onclick={onclose}>
			<PanelRightClose size={14} />
		</Button>
	</div>

	{#if entries.length === 0}
		<p class="text-xs text-muted-foreground">
			{smarts.trim() ? 'No tokens found.' : 'Type a SMARTS string to see an explanation.'}
		</p>
	{:else}
		<div class="flex flex-col">
			{#each entries as entry}
				{@render entryRow(entry, 0)}
			{/each}
		</div>
	{/if}
</div>

{#snippet entryRow(/** @type {ExplainerEntry} */ entry, /** @type {number} */ depth)}
	{@const hasChildren = !!entry.children?.length}
	{@const open = !collapsed.has(entry.startIndex)}
	{@const active = isActive(entry)}
	{@const isSeparator =
		entry.type === 'fragment_separator' || entry.type === 'reaction_separator_gt'}

	{#if isSeparator}
		<div
			class={['flex items-center gap-1.5 rounded px-1 py-0.5', active && 'bg-primary/10']
				.filter(Boolean)
				.join(' ')}
			title={entry.doc.description}
		>
			<span class="w-3 shrink-0"></span>
			<code class="text-xs text-muted-foreground">{entry.text}</code>
			<span class="text-xs text-muted-foreground">{entry.doc.title}</span>
		</div>
	{:else if hasChildren}
		<button
			class={[
				'flex w-full cursor-pointer flex-wrap items-baseline gap-x-1.5 gap-y-0.5 rounded px-1 py-0.5 text-left hover:bg-muted',
				active && 'bg-primary/10',
			]
				.filter(Boolean)
				.join(' ')}
			style="padding-left: {depth * 14 + 4}px"
			title={entry.doc.description}
			onclick={() => toggle(entry.startIndex)}
		>
			<span class="flex shrink-0 items-center gap-1">
				{#if open}
					<ChevronDown size={12} class="text-muted-foreground" />
				{:else}
					<ChevronRight size={12} class="text-muted-foreground" />
				{/if}
				<code
					class={[
						'max-w-[10rem] overflow-hidden text-xs text-ellipsis whitespace-nowrap',
						entry.type === 'ERROR' ? 'error' : '',
					].join(' ')}>{entry.text}</code
				>
			</span>
			<span class="text-xs text-muted-foreground">{entry.doc.title}</span>
		</button>
		{#if open}
			{#each entry.children ?? [] as child}
				{@render entryRow(child, depth + 1)}
			{/each}
		{/if}
	{:else}
		<div
			class={[
				'flex w-full flex-wrap items-baseline gap-x-1.5 gap-y-0.5 rounded px-1 py-0.5 hover:bg-muted',
				active && 'bg-primary/10',
			]
				.filter(Boolean)
				.join(' ')}
			style="padding-left: {depth * 14 + 4 + 18}px"
			title={entry.doc.description}
		>
			<code
				class={[
					'max-w-[10rem] overflow-hidden text-xs text-ellipsis whitespace-nowrap',
					entry.type === 'ERROR' ? 'error' : '',
				].join(' ')}>{entry.text}</code
			>
			<span class="text-xs text-muted-foreground">{entry.doc.title}</span>
		</div>
	{/if}
{/snippet}
