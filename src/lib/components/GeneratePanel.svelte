<script>
	import { onMount, onDestroy } from 'svelte';
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';
	import { SmarterSmartsWorker } from '$lib/smarter-smarts/index.js';
	import { validateSmarts } from '$lib/rdkit/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import CopyIcon from '@lucide/svelte/icons/copy';

	const MAX_RESULTS = 200;

	/**
	 * @type {{
	 *   smarts: string,
	 *   oncopy?: (smiles: string[]) => void,
	 * }}
	 */
	let { smarts, oncopy } = $props();

	let searching = $state(false);
	let progress = $state(0);
	let totalSearched = $state(0);
	let totalMolecules = $state(0);
	/** @type {{ smiles: string, name: string }[]} */
	let results = $state([]);
	/** @type {string | null} */
	let error = $state(null);
	/** @type {string | null} */
	let currentSearch = $state(null);
	let workerReady = $state(false);

	/** @type {Worker | null} */
	let worker = null;
	/** @type {ReturnType<typeof setTimeout> | null} */
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

	/** @param {MessageEvent} e */
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

	// Debounced search on smarts prop change
	$effect(() => {
		const value = smarts;
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
			if (!workerReady) return;
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
	});

	let highlights = $derived(
		currentSearch
			? { definitions: [{ smarts: currentSearch }], outline: true, fill: false }
			: { definitions: [], outline: true, fill: false },
	);

	function copyResults() {
		oncopy?.(results.map((r) => r.smiles));
	}
</script>

<div class="flex flex-col gap-3">
	{#if !workerReady}
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<Spinner />
			<span>Loading molecule dataset…</span>
		</div>
	{:else if error}
		<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
	{:else if searching}
		<div class="space-y-1">
			<div class="flex justify-between text-sm text-muted-foreground">
				<span>Searching molecules…</span>
				<span>{totalSearched.toLocaleString()} / {totalMolecules.toLocaleString()}</span>
			</div>
			<div class="h-2 w-full overflow-hidden rounded-full bg-secondary">
				<div class="h-full rounded-full bg-primary" style="width: {progress}%"></div>
			</div>
			<div class="text-xs text-muted-foreground">
				Found {results.length} match{results.length !== 1 ? 'es' : ''} so far
			</div>
		</div>
	{:else if !currentSearch}
		<p class="text-sm text-muted-foreground">
			Enter a SMARTS pattern above to search 100K ChEMBL small molecules
		</p>
	{/if}

	{#if results.length > 0}
		<div class="flex items-center justify-between">
			<div class="text-sm text-muted-foreground">
				Showing {results.length} matches
			</div>
			<Button variant="outline" size="sm" onclick={copyResults}>
				<CopyIcon size={16} />
				Copy to View/Edit
			</Button>
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
		<div class="py-12 text-center text-muted-foreground">No matching molecules found.</div>
	{/if}
</div>
