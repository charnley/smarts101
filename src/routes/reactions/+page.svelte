<script>
	import { onMount } from 'svelte';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import ReactionCard from '$lib/components/ReactionCard.svelte';
	import { runReaction } from '$lib/structure-renderer/reaction-runner.js';

	let rxnSmarts = $state('[C:1]=[C:2].[C:3]=[*:4][*:5]=[C:6]>>[C:1]1[C:2][C:3][*:4]=[*:5][C:6]1');
	let targetsRaw = $state('OC=C.C=CC(N)=C\nOC=C.C=CC=C\nCC');

	/** @type {import('$lib/structure-renderer/reaction-runner.js').ReactionEntry[]} */
	let results = $state([]);

	let running = $state(false);
	let error = $state(/** @type {string|null} */ (null));

	/** @type {ReturnType<typeof setTimeout>|null} */
	let debounce = null;

	const targets = $derived(
		targetsRaw
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean),
	);

	$effect(() => {
		const _rxn = rxnSmarts;
		const _targets = targets;
		if (debounce) clearTimeout(debounce);
		debounce = setTimeout(() => run(_rxn, _targets), 400);
	});

	onMount(() => run(rxnSmarts, targets));

	/**
	 * @param {string} rxn
	 * @param {string[]} smilesList
	 */
	async function run(rxn, smilesList) {
		if (!rxn.trim() || smilesList.length === 0) {
			results = [];
			return;
		}
		running = true;
		error = null;
		try {
			results = await runReaction(rxn, smilesList);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			results = [];
		} finally {
			running = false;
		}
	}
</script>

<div class="flex h-screen flex-col overflow-hidden">
	<div class="border-b px-4 py-3">
		<h1 class="text-sm font-semibold">
			Reaction debug <span class="font-normal text-muted-foreground">/ reactions</span>
		</h1>
	</div>

	<div class="flex flex-1 overflow-hidden">
		<!-- left panel -->
		<div class="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r p-4">
			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium">rxnSmarts</label>
				<Input bind:value={rxnSmarts} placeholder="[OH:1]c>>[Br:1]c" class="font-mono text-xs" />
			</div>

			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium">
					Targets
					<span class="font-normal text-muted-foreground">
						— one run per line, <code>.</code> separates reactant slots
					</span>
				</label>
				<Textarea
					bind:value={targetsRaw}
					rows={10}
					placeholder="Oc1ccccc1"
					class="font-mono text-xs"
				/>
			</div>

			<div class="text-xs text-muted-foreground">
				{targets.length} target{targets.length !== 1 ? 's' : ''}
				{#if running}<span class="animate-pulse"> · running…</span>{/if}
			</div>

			{#if error}
				<p class="text-xs text-destructive">{error}</p>
			{/if}
		</div>

		<!-- right panel -->
		<div class="flex-1 overflow-y-auto p-6">
			{#if results.length === 0 && !running}
				<p class="text-sm text-muted-foreground">No results.</p>
			{/if}

			<div class="flex flex-wrap gap-4">
				{#each results as result (result.smarts)}
					<ReactionCard slides={result.slides} />
				{/each}
			</div>
		</div>
	</div>
</div>
