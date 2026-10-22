<script>
	import { onDestroy, untrack } from 'svelte';
	import { SmarterSmartsWorker } from '$lib/smarter-smarts/index.js';
	import { validateSmarts } from '$lib/rdkit/utils.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { GENERATE_DEBOUNCE_MS } from '$lib/constants.js';

	/**
	 * @type {{
	 *   smarts: string,
	 *   active?: boolean,
	 *   onresults?: (items: { smiles: string, name: string }[]) => void,
	 * }}
	 */
	let { smarts, active = false, onresults } = $props();

	let searching = $state(false);
	/** @type {string | null} */
	let error = $state(null);
	/** @type {string | null} */
	let currentSearch = $state(null);
	let workerReady = $state(false);
	/** @type {{ smiles: string, name: string }[]} */
	let results = $state([]);

	/** @type {Worker | null} */
	let worker = null;
	/** @type {ReturnType<typeof setTimeout> | null} */
	let debounceTimer = null;
	/** Id of the current search. The worker echoes it back, replies with another id are dropped. */
	let searchId = 0;

	function cancelSearch() {
		searchId++;
		searching = false;
	}

	/** @param {MessageEvent} e */
	function handleMessage(e) {
		const { type } = e.data;

		if (type === 'ready') {
			workerReady = true;
			return;
		}

		// Replies from a search that was replaced or cleared. Errors from loading carry no id.
		if (e.data.searchId !== undefined && e.data.searchId !== searchId) return;

		if (type === 'batch') {
			const batch = e.data;
			results = [...results, ...batch.results];

			onresults?.(results);

			if (batch.finished) {
				searching = false;
				return;
			}

			worker?.postMessage({
				smarts: currentSearch,
				startIdx: batch.nextIdx,
				searchId,
			});
		} else if (type === 'error') {
			error = e.data.message;
			searching = false;
		}
	}

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
		if (worker) {
			worker.terminate();
			worker = null;
		}
	});

	// Lazy worker init on first activation
	$effect(() => {
		if (!active || worker) return;
		worker = new SmarterSmartsWorker();
		worker.onmessage = handleMessage;
		worker.onerror = (e) => {
			error = 'Worker error: ' + (e.message || 'Unknown');
			searching = false;
		};
	});

	// Debounced search on smarts/active/ready change
	$effect(() => {
		const trimmed = smarts.trim();

		if (debounceTimer) clearTimeout(debounceTimer);

		if (!trimmed) {
			cancelSearch();
			error = null;
			results = [];
			currentSearch = null;
			untrack(() => onresults?.([]));
			return;
		}

		// Don't search when tab closed or worker not ready.
		// Effect re-fires when either flips, so no search is lost.
		if (!active || !workerReady) return;

		// Skip redundant re-search when smarts unchanged (incl. zero-match cached)
		if (trimmed === untrack(() => currentSearch)) return;

		debounceTimer = setTimeout(async () => {
			const id = ++searchId;
			const { valid, errors } = await validateSmarts(trimmed);
			if (id !== searchId) return; // the SMARTS changed while validating

			if (!valid) {
				error = errors?.join('; ') || 'Invalid SMARTS pattern';
				searching = false;
				results = [];
				currentSearch = null;
				onresults?.([]);
				return;
			}

			error = null;
			results = [];
			searching = true;
			currentSearch = trimmed;

			worker?.postMessage({
				smarts: trimmed,
				startIdx: 0,
				searchId: id,
			});
		}, GENERATE_DEBOUNCE_MS);
	});
</script>

<div class="flex flex-col gap-3">
	{#if error}
		<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
	{:else if !workerReady}
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<Spinner />
			<span>Loading molecule dataset…</span>
		</div>
	{:else if searching}
		<div class="text-sm text-muted-foreground">
			Searching… {results.length} match{results.length !== 1 ? 'es' : ''} so far
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
