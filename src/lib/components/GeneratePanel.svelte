<script>
	import { onDestroy, untrack } from 'svelte';
	import { SmarterSmartsWorker } from '$lib/smarter-smarts/index.js';
	import { validateSmarts } from '$lib/rdkit/utils.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';

	const MAX_RESULTS = 200;

	/**
	 * @type {{
	 *   smarts: string,
	 *   active?: boolean,
	 *   onresults?: (smiles: string[]) => void,
	 * }}
	 */
	let { smarts, active = false, onresults } = $props();

	let searching = $state(false);
	let progress = $state(0);
	let totalSearched = $state(0);
	let totalMolecules = $state(0);
	/** @type {string | null} */
	let error = $state(null);
	/** @type {string | null} */
	let currentSearch = $state(null);
	let workerReady = $state(false);

	/** @type {Worker | null} */
	let worker = null;
	/** @type {ReturnType<typeof setTimeout> | null} */
	let debounceTimer = null;
	let workerInited = false;

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

			onresults?.(results.map((r) => r.smiles));

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

	// results array hoisted so handleMessage can reference it
	/** @type {{ smiles: string, name: string }[]} */
	let results = $state([]);

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
		if (worker) {
			worker.terminate();
			worker = null;
		}
	});

	// Lazy worker init on first activation
	$effect(() => {
		if (!active || workerInited) return;
		workerInited = true;
		worker = new SmarterSmartsWorker();
		worker.onmessage = handleMessage;
		worker.onerror = (e) => {
			error = 'Worker error: ' + (e.message || 'Unknown');
			searching = false;
		};
	});

	// Debounced search on smarts/active/ready change
	$effect(() => {
		const value = smarts;
		const _active = active;
		const _ready = workerReady;

		if (debounceTimer) clearTimeout(debounceTimer);

		const trimmed = value.trim();
		if (!trimmed) {
			error = null;
			searching = false;
			results = [];
			progress = 0;
			currentSearch = null;
			untrack(() => onresults?.([]));
			return;
		}

		// Don't search when tab closed or worker not ready.
		// Effect re-fires when either flips, so no search is lost.
		if (!_active || !_ready) return;

		// Skip redundant re-search when smarts unchanged (incl. zero-match cached)
		if (trimmed === currentSearch) return;

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
		}, 350 * 2);
	});
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

	{#if results.length === 0 && !searching && !error && currentSearch}
		<div class="py-12 text-center text-muted-foreground">No matching molecules found.</div>
	{/if}
</div>
