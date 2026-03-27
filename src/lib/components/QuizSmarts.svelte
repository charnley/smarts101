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
	 *   useCoordgen?: boolean,
	 *   rendererWidth?: number,
	 *   rendererHeight?: number,
	 *   oncorrect?: () => void,
	 * }}
	 */
	let {
		index,
		description,
		smiles,
		referenceSMARTS,
		useCoordgen = false,
		rendererWidth = 280,
		rendererHeight = 200,
		oncorrect,
	} = $props();

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
	let hintActive = $state(false);

	// ── Colors ───────────────────────────────────────────────────────────────
	let highlightColor = $derived(mode.current === 'dark' ? '#60a5fa' : '#2563eb');

	// ── Live highlights ───────────────────────────────────────────────────────
	let highlights = $derived({
		definitions: [
			...(syntaxValid && userSmarts.trim()
				? [{ smarts: userSmarts.trim(), color: highlightColor, id: 'user', name: 'Your pattern' }]
				: []),
			...(hintActive
				? [{ smarts: referenceSMARTS, color: '#eab308', id: 'hint', name: 'Hint' }]
				: []),
		],
		outline: true,
		fill: false,
	});

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

	<!-- Input row: full width below header -->
	<div class="flex flex-col gap-2.5 border-b border-border px-5 py-4">
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

	<!-- Molecule renderer -->
	<div class="flex items-center justify-center p-3">
		<StructureRenderer
			structureDefinition={smiles}
			{highlights}
			{useCoordgen}
			width={rendererWidth}
			height={rendererHeight}
		/>
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
			<div class="flex gap-1">
				<Button
					variant="ghost"
					size="sm"
					class={hintActive ? 'text-yellow-500 hover:text-yellow-500' : ''}
					onclick={() => (hintActive = !hintActive)}
				>
					{hintActive ? 'Hide hint' : 'Hint'}
				</Button>
				<Button variant="ghost" size="sm" onclick={() => (solutionRevealed = true)}>
					Show solution
				</Button>
			</div>
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
