<script>
	import { performSubstructureSearch } from '$lib/structure-renderer/worker-manager.js';
	import MoleculeBox from '$lib/components/MoleculeBox.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { mode } from 'mode-watcher';

	// ── Default molecules ────────────────────────────────────────────────────
	// Extend this array to add more starting molecules.
	/** @type {{ id: number, smiles: string, name: string }[]} */
	const DEFAULT_MOLECULES = [
		{ id: 1, smiles: 'CC(=O)Oc1ccccc1C(=O)O', name: 'Aspirin' },
		{ id: 2, smiles: 'Cn1cnc2c1c(=O)n(C)c(=O)n2C', name: 'Caffeine' },
		{ id: 3, smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O', name: 'Ibuprofen' },
		{ id: 4, smiles: 'CC(=O)Nc1ccc(O)cc1', name: 'Paracetamol' },
		{ id: 5, smiles: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O', name: 'Glucose' },
		{ id: 6, smiles: 'c1ccc2c(c1)cc1ccc3cccc4ccc2c1c34', name: 'Pyrene' }
	];

	// ── State ────────────────────────────────────────────────────────────────
	let molecules = $state(DEFAULT_MOLECULES.map((m) => ({ ...m })));
	let nextId = $state(DEFAULT_MOLECULES.length + 1);

	let rawSmarts = $state('');
	let smartsError = $state(/** @type {string|null} */ (null));
	/** The validated SMARTS that gets passed down to renderers */
	let activeSmarts = $state('');

	/** Blue that reads well on both light and dark backgrounds */
	let activeSmartsColor = $derived(mode.current === 'dark' ? '#60a5fa' : '#2563eb');

	/** Softspots object built from the active SMARTS pattern */
	let softspots = $derived(
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

	let newSmiles = $state('');
	let newName = $state('');
	let showAddForm = $state(false);

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
			const result = await performSubstructureSearch([trimmed], 'C', false);
			if (!result?.success) throw new Error(result?.error ?? 'Invalid SMARTS');
			smartsError = null;
			activeSmarts = trimmed;
		} catch (/** @type {any} */ err) {
			smartsError = err?.message ?? 'Invalid SMARTS';
			activeSmarts = '';
		}
	}

	// ── Add / remove molecules ────────────────────────────────────────────────
	function addMolecule() {
		const smiles = newSmiles.trim();
		if (!smiles) return;
		molecules = [...molecules, { id: nextId++, smiles, name: newName.trim() || smiles }];
		newSmiles = '';
		newName = '';
		showAddForm = false;
	}

	/** @param {number} id */
	function removeMolecule(id) {
		molecules = molecules.filter((m) => m.id !== id);
	}

	function onAddKeydown(/** @type {KeyboardEvent} */ e) {
		if (e.key === 'Enter') addMolecule();
		if (e.key === 'Escape') showAddForm = false;
	}
</script>

<div class="playground">
	<!-- ── SMARTS input ── -->
	<section class="playground__query">
		<p class="playground__hint">Start from: <a href="#">RNA</a>, Druglike, DNA, Chembl</p>
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

	<!-- ── Molecule grid ── -->
	<section class="playground__grid-section">
		<div class="playground__grid">
			{#each molecules as mol (mol.id)}
				<MoleculeBox
					smiles={mol.smiles}
					name={mol.name}
					{softspots}
					onremove={() => removeMolecule(mol.id)}
				/>
			{/each}

		</div>
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

		width: 100%;
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

	.playground__hint {
		margin: 0;
		font-size: 12px;
		color: var(--muted-foreground, #94a3b8);
	}

	.playground__hint code {
		font-family: ui-monospace, monospace;
		background: var(--muted, #f1f5f9);
		padding: 1px 5px;
		border-radius: 3px;
		font-size: 11px;
	}

	/* ── Grid ── */
	.playground__grid-section {
		width: 100%;
	}

	.playground__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
		gap: 16px;
	}

	/* ── Add-molecule card ── */
	.playground__add-card {
		border: 2px dashed var(--border, #e2e8f0);
		border-radius: 8px;
		min-height: 260px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.playground__add-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 24px;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--muted-foreground, #94a3b8);
		font-size: 14px;
		border-radius: 6px;
		transition:
			color 0.15s ease,
			background 0.15s ease;
	}

	.playground__add-btn:hover {
		color: var(--foreground);
		background: var(--muted, #f1f5f9);
	}

	.playground__add-form {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px;
		width: 100%;
	}

	.playground__add-input {
		padding: 8px 10px;
		border: 1px solid var(--border, #e2e8f0);
		border-radius: 6px;
		font-size: 13px;
		font-family: ui-monospace, monospace;
		background: var(--background);
		color: var(--foreground);
		outline: none;
		width: 100%;
		box-sizing: border-box;
	}

	.playground__add-input:focus {
		border-color: var(--ring, #6366f1);
	}

	.playground__add-actions {
		display: flex;
		gap: 8px;
	}

	.playground__btn {
		padding: 6px 14px;
		border-radius: 6px;
		border: 1px solid var(--border, #e2e8f0);
		background: var(--background);
		color: var(--foreground);
		cursor: pointer;
		font-size: 13px;
	}

	.playground__btn:hover {
		background: var(--muted, #f1f5f9);
	}

	.playground__btn--primary {
		background: var(--primary, #6366f1);
		color: var(--primary-foreground, #fff);
		border-color: transparent;
	}

	.playground__btn--primary:hover {
		opacity: 0.9;
	}
</style>
