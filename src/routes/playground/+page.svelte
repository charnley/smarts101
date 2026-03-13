<script>
	import { performSubstructureSearch } from '$lib/structure-renderer/worker-manager.js';
	import MoleculeBox from '$lib/components/MoleculeBox.svelte';
	import { mode } from 'mode-watcher';
	import { RNA_BASES, DNA_BASES, DRUGLIKE_MOLECULES, DEFAULT_MOLECULES } from '$lib/molecules.js';

	// ── Molecule sets ────────────────────────────────────────────────────────
	const SETS = {
		druglike: { label: 'Druglike', molecules: DRUGLIKE_MOLECULES },
		rna: { label: 'RNA Bases', molecules: RNA_BASES },
		dna: { label: 'DNA Bases', molecules: DNA_BASES }
	};

	/**
	 * Assign sequential IDs to a molecule list.
	 * @param {{ smiles: string, name: string }[]} list
	 * @returns {{ id: number, smiles: string, name: string }[]}
	 */
	function withIds(list) {
		return list.map((m, i) => ({ ...m, id: i + 1 }));
	}

	/**
	 * Serialize molecules to textarea text (one SMILES per line).
	 * @param {{ smiles: string }[]} list
	 */
	function toTextarea(list) {
		return list.map((m) => m.smiles).join('\n');
	}

	/**
	 * Parse textarea text into a molecule list.
	 * @param {string} text
	 * @returns {{ id: number, smiles: string, name: string }[]}
	 */
	function fromTextarea(text) {
		return withIds(
			text
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line.length > 0)
				.map((smiles) => ({ smiles, name: smiles }))
		);
	}

	// ── State ────────────────────────────────────────────────────────────────
	let molecules = $state(withIds(DEFAULT_MOLECULES));
	let nextId = $state(DEFAULT_MOLECULES.length + 1);

	/** 'grid' shows the molecule cards; 'edit' shows the textarea editor */
	let viewMode = $state(/** @type {'grid' | 'edit'} */ ('grid'));

	/** Raw text in the textarea editor — synced from molecules when entering edit mode */
	let textareaValue = $state('');

	let rawSmarts = $state('');
	let smartsError = $state(/** @type {string|null} */ (null));
	/** The validated SMARTS that gets passed down to renderers */
	let activeSmarts = $state('');

	/** Blue that reads well on both light and dark backgrounds */
	let activeSmartsColor = $derived(mode.current === 'dark' ? '#60a5fa' : '#2563eb');

	let highlights = $derived(
		activeSmarts
			? {
					definitions: [
						{ smarts: activeSmarts, color: activeSmartsColor, id: 'query', name: 'Query' }
					],
					outline: true,
					fill: false
				}
			: { definitions: [] }
	);

	// ── View mode toggle ─────────────────────────────────────────────────────
	function switchToEdit() {
		textareaValue = toTextarea(molecules);
		viewMode = 'edit';
	}

	function switchToGrid() {
		const parsed = fromTextarea(textareaValue);
		if (parsed.length > 0) {
			molecules = parsed;
			nextId = parsed.length + 1;
		}
		viewMode = 'grid';
	}

	// ── Load a named molecule set ─────────────────────────────────────────────
	/** @param {keyof typeof SETS} setKey */
	function loadSet(setKey) {
		const list = withIds(SETS[setKey].molecules);
		molecules = list;
		nextId = list.length + 1;
		textareaValue = toTextarea(list);
		viewMode = 'grid';
	}

	// ── Debounced SMARTS validation ──────────────────────────────────────────
	let debounceTimer = /** @type {ReturnType<typeof setTimeout>|null} */ (null);

	/**
	 * Called on every keystroke in the SMARTS input.
	 * Validates the pattern against a known molecule after a short delay.
	 */
	function onSmartsInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => validateAndApply(rawSmarts), 350);
	}

	async function validateAndApply(/** @type {string} */ smarts) {
		const trimmed = smarts.trim();
		if (!trimmed) {
			smartsError = null;
			activeSmarts = '';
			return;
		}
		try {
			// Validate by running a search against a simple molecule
			const result = await performSubstructureSearch([trimmed], 'C');
			if (!result?.success) throw new Error(result?.error ?? 'Invalid SMARTS');
			smartsError = null;
			activeSmarts = trimmed;
		} catch (/** @type {any} */ err) {
			smartsError = err?.message ?? 'Invalid SMARTS';
			activeSmarts = '';
		}
	}

	// ── Remove molecule ───────────────────────────────────────────────────────
	/** @param {number} id */
	function removeMolecule(id) {
		molecules = molecules.filter((m) => m.id !== id);
	}
</script>

<div class="playground">
	<!-- ── SMARTS input ── -->
	<section class="playground__query">
		<div class="playground__input-wrap" class:has-error={!!smartsError}>
			<input
				class="playground__smarts-input"
				type="text"
				placeholder="Enter a SMARTS pattern, e.g. [OX2H] for hydroxyl…"
				bind:value={rawSmarts}
				oninput={onSmartsInput}
				spellcheck="false"
				autocomplete="off"
			/>
		</div>
		{#if smartsError}
			<p class="playground__error" role="alert">{smartsError}</p>
		{/if}
	</section>

	<!-- ── Molecule grid / editor ── -->
	<section class="playground__grid-section">
		<!-- Toolbar: set selector (edit mode only) + view toggle -->
		<div class="playground__toolbar">
			{#if viewMode === 'edit'}
				<div class="playground__sets">
					<span class="playground__sets-label">Start from:</span>
					{#each Object.entries(SETS) as [key, set]}
						<button
							class="playground__set-btn"
							onclick={() => loadSet(/** @type {keyof typeof SETS} */ (key))}
						>
							{set.label}
						</button>
					{/each}
				</div>
			{:else}
				<div></div>
			{/if}

			<div class="playground__view-toggle">
				<button
					class="playground__toggle-btn"
					class:active={viewMode === 'grid'}
					onclick={switchToGrid}
				>
					Grid
				</button>
				<button
					class="playground__toggle-btn"
					class:active={viewMode === 'edit'}
					onclick={switchToEdit}
				>
					Edit
				</button>
			</div>
		</div>

		<!-- Grid view -->
		{#if viewMode === 'grid'}
			<div class="playground__grid">
				{#each molecules as mol (mol.id)}
					<MoleculeBox
						smiles={mol.smiles}
						name={mol.name}
						{highlights}
						onremove={() => removeMolecule(mol.id)}
					/>
				{/each}
			</div>

			<!-- Edit view -->
		{:else}
			<div class="playground__edit">
				<p class="playground__edit-hint">One SMILES per line. Switch to Grid to apply.</p>
				<textarea
					class="playground__textarea"
					bind:value={textareaValue}
					spellcheck="false"
					autocomplete="off"
					rows={Math.max(8, textareaValue.split('\n').length + 2)}
				></textarea>
			</div>
		{/if}
	</section>
</div>

<style>
	.playground {
		display: flex;
		flex-direction: column;
		gap: 24px;
		max-width: 1200px;
		margin: 0 auto;
		padding: 8px 0;
	}

	/* ── Query section ── */
	.playground__query {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 0 auto;
		width: 100%;
	}

	.playground__input-wrap {
		border: 2px solid var(--border, #e2e8f0);
		border-radius: 8px;
		transition: border-color 0.15s ease;
	}

	.playground__input-wrap:focus-within {
		border-color: var(--ring, #6366f1);
	}

	.playground__input-wrap.has-error {
		border-color: var(--destructive, #dc2626);
	}

	.playground__smarts-input {
		width: 100%;
		padding: 14px 16px;
		font-size: 16px;
		font-family: ui-monospace, 'Fira Code', monospace;
		background: transparent;
		border: none;
		outline: none;
		color: var(--foreground);
		box-sizing: border-box;
	}

	.playground__smarts-input::placeholder {
		color: var(--muted-foreground, #94a3b8);
		font-family: inherit;
	}

	.playground__error {
		margin: 0;
		font-size: 12px;
		color: var(--destructive, #dc2626);
	}

	/* ── Grid section ── */
	.playground__grid-section {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	/* ── Toolbar ── */
	.playground__toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.playground__sets {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.playground__sets-label {
		font-size: 12px;
		color: var(--muted-foreground, #94a3b8);
	}

	.playground__set-btn {
		padding: 3px 10px;
		font-size: 12px;
		border-radius: 9999px;
		border: 1px solid var(--border, #e2e8f0);
		background: var(--background);
		color: var(--foreground);
		cursor: pointer;
		transition:
			background 0.1s ease,
			color 0.1s ease;
	}

	.playground__set-btn:hover {
		background: var(--muted, #f1f5f9);
	}

	/* ── View toggle ── */
	.playground__view-toggle {
		display: flex;
		border: 1px solid var(--border, #e2e8f0);
		border-radius: 6px;
		overflow: hidden;
	}

	.playground__toggle-btn {
		padding: 4px 14px;
		font-size: 12px;
		border: none;
		background: transparent;
		color: var(--muted-foreground, #94a3b8);
		cursor: pointer;
		transition:
			background 0.1s ease,
			color 0.1s ease;
	}

	.playground__toggle-btn:not(:last-child) {
		border-right: 1px solid var(--border, #e2e8f0);
	}

	.playground__toggle-btn.active {
		background: var(--muted, #f1f5f9);
		color: var(--foreground);
		font-weight: 500;
	}

	/* ── Grid ── */
	.playground__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
		gap: 16px;
	}

	/* ── Edit view ── */
	.playground__edit {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.playground__edit-hint {
		margin: 0;
		font-size: 12px;
		color: var(--muted-foreground, #94a3b8);
	}

	.playground__textarea {
		width: 100%;
		padding: 12px 14px;
		font-size: 14px;
		font-family: ui-monospace, 'Fira Code', monospace;
		border: 2px solid var(--border, #e2e8f0);
		border-radius: 8px;
		background: var(--background);
		color: var(--foreground);
		outline: none;
		resize: vertical;
		box-sizing: border-box;
		line-height: 1.6;
		transition: border-color 0.15s ease;
	}

	.playground__textarea:focus {
		border-color: var(--ring, #6366f1);
	}
</style>
