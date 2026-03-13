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
	 * }}
	 */
	let { index, description, smiles, referenceSMARTS } = $props();

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
	class="quiz-card"
	class:is-correct={checkResult === 'correct'}
	class:is-incorrect={checkResult === 'incorrect'}
>
	<!-- Header: question number + description -->
	<div class="quiz-card__header">
		<span class="quiz-card__index">Q{index}</span>
		<p class="quiz-card__description">{description}</p>
	</div>

	<!-- Body: two-column -->
	<div class="quiz-card__body">
		<!-- Left: input row + feedback + solution -->
		<div class="quiz-card__left">
			<!-- Input + Check button on the same row -->
			<div class="quiz-card__input-row">
				<Input
					type="text"
					placeholder="Enter a SMARTS pattern…"
					spellcheck={false}
					autocomplete="off"
					value={userSmarts}
					aria-invalid={!syntaxValid && userSmarts.trim() ? true : undefined}
					class="flex-1 font-mono"
					oninput={(/** @type {Event} */ e) =>
						onInput(/** @type {HTMLInputElement} */ (e.currentTarget).value)}
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
				<p class="quiz-card__syntax-error">Invalid SMARTS syntax</p>
			{/if}

			{#if checkResult === 'correct'}
				<div class="quiz-card__feedback quiz-card__feedback--correct">Correct!</div>
			{:else if checkResult === 'incorrect'}
				<div class="quiz-card__feedback quiz-card__feedback--incorrect">Not quite — try again.</div>
			{/if}

			{#if solutionRevealed}
				<div class="quiz-card__solution">
					<span class="quiz-card__solution-label">Solution:</span>
					<code class="quiz-card__solution-code">{referenceSMARTS}</code>
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

		<!-- Right: molecule renderer -->
		<div class="quiz-card__right">
			<StructureRenderer {smiles} {highlights} width={280} height={200} />
		</div>
	</div>
</div>

<style>
	.quiz-card {
		border: 1px solid var(--border);
		border-radius: 10px;
		overflow: hidden;
		background: var(--card);
		transition: border-color 0.2s ease;
	}

	.quiz-card.is-correct {
		border-color: color-mix(in srgb, #16a34a 50%, var(--border));
	}

	.quiz-card.is-incorrect {
		border-color: color-mix(in srgb, var(--destructive) 50%, var(--border));
	}

	/* Header */
	.quiz-card__header {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.875rem 1.25rem;
		border-bottom: 1px solid var(--border);
		/* background: var(--muted); */
	}

	.quiz-card__index {
		flex-shrink: 0;
		/* font-size: 0.75rem; */
		font-weight: 600;
		color: var(--muted-foreground);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.quiz-card__description {
		margin: 0;
		/* font-size: 0.9375rem; */
		line-height: 1.5;
		color: var(--foreground);
	}

	/* Body: two-column layout */
	.quiz-card__body {
		display: flex;
		flex-direction: row;
	}

	.quiz-card__left {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		padding: 1rem 1.25rem;
		border-right: 1px solid var(--border);
		min-width: 0;
	}

	/* Input + Check button side by side */
	.quiz-card__input-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.quiz-card__right {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem;
	}

	.quiz-card__syntax-error {
		margin: 0;
		/* font-size: 0.75rem; */
		color: var(--destructive);
	}

	/* Feedback banners */
	.quiz-card__feedback {
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		/* font-size: 0.875rem; */
		font-weight: 500;
	}

	.quiz-card__feedback--correct {
		background: color-mix(in srgb, #16a34a 12%, transparent);
		color: #16a34a;
		border: 1px solid color-mix(in srgb, #16a34a 30%, transparent);
	}

	.quiz-card__feedback--incorrect {
		background: color-mix(in srgb, var(--destructive) 10%, transparent);
		color: var(--destructive);
		border: 1px solid color-mix(in srgb, var(--destructive) 25%, transparent);
	}

	/* Solution reveal */
	.quiz-card__solution {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		background: var(--muted);
		border: 1px solid var(--border);
		flex-wrap: wrap;
	}

	.quiz-card__solution-label {
		/* font-size: 0.75rem; */
		color: var(--muted-foreground);
		font-weight: 500;
	}

	.quiz-card__solution-code {
		font-family: ui-monospace, 'Fira Code', monospace;
		/* font-size: 0.875rem; */
		color: var(--foreground);
	}

	/* Responsive: stack on narrow screens */
	@media (max-width: 560px) {
		.quiz-card__body {
			flex-direction: column-reverse;
		}

		.quiz-card__left {
			border-right: none;
			border-top: 1px solid var(--border);
		}
	}
</style>
