<script>
	import { onMount } from 'svelte';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';
	import { runReaction } from '$lib/structure-renderer/reaction-runner.js';

	/**
	 * @typedef {Object} ReactionResult
	 * @property {string} smiles
	 * @property {string[][]} products
	 */

	// ── State ──────────────────────────────────────────────────────────────
	let rxnSmarts = $state('[C:1]=[C:2].[C:3]=[*:4][*:5]=[C:6]>>[C:1]1[C:2][C:3][*:4]=[*:5][C:6]1');
	let targetsRaw = $state('OC=C.C=CC(N)=C\nOC=C.C=CC=C');

	/** @type {ReactionResult[]} */
	let results = $state([]);
	let running = $state(false);
	let error = $state(/** @type {string|null} */ (null));

	/** @type {ReturnType<typeof setTimeout>|null} */
	let debounce = null;

	// ── Derived ─────────────────────────────────────────────────────────
	const targets = $derived(
		targetsRaw
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean),
	);

	// ── Auto-run on input change ─────────────────────────────────────────
	$effect(() => {
		// track reactive inputs
		const _rxn = rxnSmarts;
		const _targets = targets;

		if (debounce) clearTimeout(debounce);
		debounce = setTimeout(() => run(_rxn, _targets), 400);
	});

	onMount(() => {
		run(rxnSmarts, targets);
	});

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
	<!-- header -->
	<div class="border-b px-4 py-3">
		<h1 class="text-sm font-semibold">Reaction debug <span class="text-muted-foreground font-normal">/ reactions</span></h1>
	</div>

	<div class="flex flex-1 overflow-hidden">
		<!-- left panel: inputs -->
		<div class="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r p-4">
			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium">rxnSmarts</label>
				<Input
					bind:value={rxnSmarts}
					placeholder="[OH:1]c>>[Br:1]c"
					class="font-mono text-xs"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium">Targets <span class="text-muted-foreground">(one reaction run per line, use <code>.</code> to separate multiple reactants)</span></label>
				<Textarea
					bind:value={targetsRaw}
					rows={10}
					placeholder="Oc1ccccc1"
					class="font-mono text-xs"
				/>
			</div>

			<div class="text-muted-foreground text-xs">
				{targets.length} target{targets.length !== 1 ? 's' : ''}
				{#if running}· running…{/if}
			</div>

			{#if error}
				<p class="text-destructive text-xs">{error}</p>
			{/if}
		</div>

		<!-- right panel: results -->
		<div class="flex-1 overflow-y-auto p-4">
			{#if results.length === 0 && !running}
				<p class="text-muted-foreground text-sm">No results.</p>
			{/if}

			<div class="flex flex-col gap-6">
				{#each results as result (result.smiles)}
					<div class="rounded border">
						<!-- target header -->
						<div class="bg-muted flex items-center gap-2 border-b px-3 py-2">
							<code class="text-xs">{result.smiles}</code>
							{#if result.products.length === 0}
								<span class="text-muted-foreground text-xs">— no reaction</span>
							{:else}
								<span class="text-muted-foreground text-xs">→ {result.products.length} outcome{result.products.length !== 1 ? 's' : ''}</span>
							{/if}
						</div>

						{#if result.products.length > 0}
							<div class="flex flex-wrap gap-4 p-3">
								<!-- reactant -->
								<div class="flex flex-col items-center gap-1">
									<span class="text-muted-foreground text-xs">reactant</span>
									<StructureRenderer
										structureDefinition={result.smiles}
										width={180}
										height={140}
									/>
								</div>

								<div class="text-muted-foreground flex items-center text-lg">→</div>

								<!-- product sets -->
								{#each result.products as productSet, i}
									<div class="flex flex-col gap-1">
										{#if result.products.length > 1}
											<span class="text-muted-foreground text-xs">outcome {i + 1}</span>
										{/if}
										<div class="flex gap-2">
											{#each productSet as productSmiles}
												<div class="flex flex-col items-center gap-1">
													<StructureRenderer
														structureDefinition={productSmiles}
														width={180}
														height={140}
													/>
													<code class="text-muted-foreground text-xs">{productSmiles}</code>
												</div>
											{/each}
										</div>
									</div>

									{#if i < result.products.length - 1}
										<div class="text-muted-foreground flex items-center text-xs">|</div>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
