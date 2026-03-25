<script>
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';
	import { performSubstructureSearchAsync } from '$lib/structure-renderer/worker-manager.js';
	import { mode } from 'mode-watcher';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	/**
	 * @type {{
	 *   index: number,
	 *   description: string,
	 *   smiles: string,
	 *   referenceSMARTS: string,
	 *   oncorrect?: () => void,
	 * }}
	 */
	let { index, description, smiles, referenceSMARTS, oncorrect } = $props();

	/** @type {HTMLInputElement | null} */
	let inputEl = $state(null);

	export function focusInput() {
		inputEl?.focus();
	}

	// ── State ────────────────────────────────────────────────────────────────
	let userSmarts = $state('');
	let syntaxValid = $state(true);
	let checking = $state(false);
	/** @type {null | 'correct' | 'incorrect'} */
	let checkResult = $state(null);
	let solutionRevealed = $state(false);

	// ── Colors ───────────────────────────────────────────────────────────────
	let highlightColor = $derived(mode.current === 'dark' ? '#60a5fa' : '#2563eb');

	// ── Live highlights ───────────────────────────────────────────────────────
	let highlights = $derived(
		syntaxValid && userSmarts.trim()
			? {
					definitions: [
						{ smarts: userSmarts.trim(), color: highlightColor, id: 'user', name: 'Your pattern' },
					],
					outline: true,
					fill: false,
				}
			: { definitions: [] },
	);

	// ── Debounced syntax validation ──────────────────────────────────────────
	/** @type {ReturnType<typeof setTimeout> | null} */
	let debounceTimer = null;

	/** @param {string} value */
	function onInput(value) {
		userSmarts = value;
		checkResult = null;

		if (debounceTimer) clearTimeout(debounceTimer);
		if (!value.trim()) {
			syntaxValid = true;
			return;
		}
		debounceTimer = setTimeout(async () => {
			try {
				await performSubstructureSearchAsync(value.trim(), 'C', 'rdkit', false);
				syntaxValid = true;
			} catch {
				syntaxValid = false;
			}
		}, 300);
	}

	// ── Answer checking ───────────────────────────────────────────────────────
	async function checkAnswer() {
		const trimmed = userSmarts.trim();
		if (!trimmed || !syntaxValid) return;

		checking = true;
		checkResult = null;

		try {
			const [userResult, refResult] = await Promise.all([
				performSubstructureSearchAsync(trimmed, smiles, 'rdkit', true),
				performSubstructureSearchAsync(referenceSMARTS, smiles, 'rdkit', true),
			]);

			const userAtoms = extractAtoms(userResult);
			const refAtoms = extractAtoms(refResult);

			checkResult = setsEqual(userAtoms, refAtoms) ? 'correct' : 'incorrect';
			if (checkResult === 'correct') oncorrect?.();
		} catch {
			checkResult = 'incorrect';
		} finally {
			checking = false;
		}
	}

	/**
	 * Extract the sorted unique set of matched atom indices from a search result.
	 * @param {any} result
	 * @returns {number[]}
	 */
	function extractAtoms(result) {
		if (!result?.success || !result.results?.length) return [];
		/** @type {number[]} */
		const atoms = [];
		for (const r of result.results) {
			for (const abm of r.atomBondMatches ?? []) {
				atoms.push(...(abm.atoms ?? []));
			}
		}
		return [...new Set(atoms)].sort((a, b) => a - b);
	}

	/**
	 * @param {number[]} a
	 * @param {number[]} b
	 */
	function setsEqual(a, b) {
		if (a.length !== b.length) return false;
		return a.every((v, i) => v === b[i]);
	}
</script>

<div
	class="overflow-hidden rounded-[10px] border border-border bg-card transition-colors duration-200"
	class:is-correct={checkResult === 'correct'}
	class:is-incorrect={checkResult === 'incorrect'}
>
	<!-- Header: question number + description -->
	<div class="flex items-baseline gap-3 border-b border-border px-5 py-3.5">
		<span class="shrink-0 font-semibold tracking-wider text-muted-foreground uppercase"
			>Q{index}</span
		>
		<p class="m-0 leading-relaxed text-foreground">{description}</p>
	</div>

	<!-- Body: two-column -->
	<div class="flex flex-row max-sm:flex-col-reverse">
		<!-- Left: input row + feedback + solution -->
		<div
			class="flex min-w-0 flex-1 flex-col gap-2.5 border-r border-border p-4 px-5 max-sm:border-t max-sm:border-r-0 max-sm:border-border"
		>
			<!-- Input + Check button on the same row -->
			<div class="flex items-center gap-2">
				<Input
					type="text"
					placeholder="Enter a SMARTS pattern…"
					spellcheck={false}
					autocomplete="off"
					value={userSmarts}
					aria-invalid={!syntaxValid && userSmarts.trim() ? true : undefined}
					class="flex-1 font-mono"
					bind:ref={inputEl}
					oninput={(/** @type {Event} */ e) =>
						onInput(/** @type {HTMLInputElement} */ (e.currentTarget).value)}
					onkeydown={(/** @type {KeyboardEvent} */ e) => {
						if (e.key === 'Enter' && userSmarts.trim() && syntaxValid && !checking) checkAnswer();
					}}
				/>
				<Button
					size="sm"
					onclick={checkAnswer}
					disabled={!userSmarts.trim() || !syntaxValid || checking}
				>
					{checking ? 'Checking…' : 'Check'}
				</Button>
			</div>

			{#if !syntaxValid && userSmarts.trim()}
				<p class="m-0 text-destructive">Invalid SMARTS syntax</p>
			{/if}

			{#if checkResult === 'correct'}
				<div
					class="rounded-md border border-green-600/30 bg-green-600/10 px-3 py-2 font-medium text-green-600"
				>
					Correct!
				</div>
			{:else if checkResult === 'incorrect'}
				<div
					class="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 font-medium text-destructive"
				>
					Not quite — try again.
				</div>
			{/if}
		</div>

		<!-- Right: molecule renderer -->
		<div class="flex shrink-0 items-center justify-center p-3">
			<StructureRenderer structureDefinition={smiles} {highlights} width={280} height={200} />
		</div>
	</div>

	<div class="border-t border-border p-2">
		{#if solutionRevealed}
			<div
				class="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted px-3 py-2"
			>
				<span class="font-medium text-muted-foreground">Solution:</span>
				<code class="font-mono text-foreground">{referenceSMARTS}</code>
			</div>
		{:else}
			<Button
				variant="ghost"
				size="sm"
				class="self-start"
				onclick={() => (solutionRevealed = true)}
			>
				Show solution
			</Button>
		{/if}
	</div>
</div>

<style>
	.is-correct {
		border-color: color-mix(in srgb, #16a34a 50%, var(--border));
	}

	.is-incorrect {
		border-color: color-mix(in srgb, var(--destructive) 50%, var(--border));
	}
</style>
