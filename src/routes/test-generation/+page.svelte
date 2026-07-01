<script>
	import { onMount, onDestroy } from 'svelte';
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';
	import { SmarterSmartsWorker } from '$lib/smarter-smarts/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { validateSmarts } from '$lib/rdkit/utils.js';

	const MAX_RESULTS = 200;

	let smarts = $state('');
	let searching = $state(false);
	let progress = $state(0);
	let totalSearched = $state(0);
	let totalMolecules = $state(0);
	let results = $state([]);
	let error = $state(null);
	let currentSearch = $state(null);
	let workerReady = $state(false);

	/** @type {Worker|null} */
	let worker = null;
	/** @type {ReturnType<typeof setTimeout>|null} */
	let debounceTimer = null;

	onMount(() => {
		worker = new SmarterSmartsWorker();
		worker.onmessage = handleMessage;
		worker.onerror = (e) => {
			error = 'Worker error: ' + (e.message || 'Unknown');
			searching = false;
		};
	});

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
		if (worker) {
			worker.terminate();
			worker = null;
		}
	});

	function handleMessage(e) {
		const { type } = e.data;

		if (type === 'ready') {
			workerReady = true;
			return;
		}

		if (type === 'batch') {
			const batch = e.data;
			results = [...results, ...batch.results];
			progress = batch.percent;
			totalSearched = batch.totalSearched;
			totalMolecules = batch.totalMolecules;

			if (batch.finished || results.length >= MAX_RESULTS) {
				searching = false;
				return;
			}

			worker?.postMessage({ smarts: currentSearch, startIdx: batch.nextIdx });
		} else if (type === 'error') {
			error = e.data.message;
			searching = false;
		}
	}

	function onInput(value) {
		smarts = value;
		if (debounceTimer) clearTimeout(debounceTimer);

		const trimmed = value.trim();
		if (!trimmed) {
			error = null;
			searching = false;
			results = [];
			progress = 0;
			return;
		}

		debounceTimer = setTimeout(async () => {
			const { valid, errors } = await validateSmarts(trimmed);
			if (!valid) {
				error = errors?.join('; ') || 'Invalid SMARTS pattern';
				searching = false;
				return;
			}

			error = null;
			results = [];
			progress = 0;
			totalSearched = 0;
			totalMolecules = 0;
			searching = true;
			currentSearch = trimmed;

			worker?.postMessage({ smarts: trimmed, startIdx: 0 });
		}, 350);
	}

	let highlights = $derived(
		currentSearch
			? { definitions: [{ smarts: currentSearch }], outline: true, fill: false }
			: { definitions: [], outline: true, fill: false },
	);
</script>

<svelte:head>
	<title>Test Generation — SMARTS101</title>
</svelte:head>

<div class="mx-auto max-w-[1200px] px-4 py-8">
	<h1 class="mb-6 text-2xl font-bold">Test Molecule Generation</h1>

	<div class="mb-6 rounded-lg border border-border bg-card p-4">
		<label for="smarts-input" class="mb-2 block text-sm font-medium">
			SMARTS Pattern
		</label>
		<Textarea
			id="smarts-input"
			value={smarts}
			oninput={(e) => onInput(e.target.value)}
			placeholder="Enter a SMARTS pattern, e.g. C=O or c1ccccc1"
			class="mb-3 font-mono"
			rows="2"
		/>
		<div class="flex items-center gap-3">
			{#if !workerReady}
				<span class="text-xs text-muted-foreground">Loading 100K molecule dataset...</span>
			{:else if searching}
				<span class="text-xs text-muted-foreground animate-pulse">Searching...</span>
			{:else}
				<span class="text-xs text-muted-foreground">Type a SMARTS pattern to search</span>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
			{error}
		</div>
	{/if}

	{#if searching}
		<div class="mb-4 space-y-1">
			<div class="flex justify-between text-sm text-muted-foreground">
				<span>Searching molecules...</span>
				<span>{totalSearched.toLocaleString()} / {totalMolecules.toLocaleString()}</span>
			</div>
			<div class="h-2 w-full overflow-hidden rounded-full bg-secondary">
				<div class="h-full rounded-full bg-primary transition-all" style="width: {progress}%"></div>
			</div>
			<div class="text-xs text-muted-foreground">
				Found {results.length} match{results.length !== 1 ? 'es' : ''} so far
			</div>
		</div>
	{/if}

	{#if results.length > 0}
		<div class="mb-2 text-sm text-muted-foreground">
			Showing {results.length} of {results.length >= MAX_RESULTS ? `${MAX_RESULTS}+ ` : ''}matches{#if !searching && totalMolecules > 0} (searched {totalSearched.toLocaleString()} molecules){/if}
		</div>
	{/if}

	<div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
		{#each results as result (result.name)}
			<div class="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
				<div class="flex items-center justify-center bg-card p-2">
					<StructureRenderer
						structureDefinition={result.smiles}
						{highlights}
						width={280}
						height={200}
					/>
				</div>
				<div
					class="border-t border-border px-3 py-1.5 font-mono text-xs text-muted-foreground"
					title={result.smiles}
				>
					{result.name}
				</div>
			</div>
		{/each}
	</div>

	{#if results.length === 0 && !searching && !error && currentSearch}
		<div class="py-12 text-center text-muted-foreground">
			No matching molecules found.
		</div>
	{/if}
</div>
