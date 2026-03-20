<script>
	import { performSubstructureSearch } from '$lib/structure-renderer/worker-manager.js';
	import MoleculeBox from '$lib/components/MoleculeBox.svelte';
	import { mode } from 'mode-watcher';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import {
		RNA,
		DNA,
		DRUGLIKE,
		AMINO_ACIDS,
		PEPTIDES,
		CHEMBL,
		MACROCYCLES,
		DEFAULT_MOLECULES,
	} from '$lib/molecules.js';

	// ── Molecule sets ────────────────────────────────────────────────────────
	const SETS = {
		druglike: { label: 'Druglike', molecules: DRUGLIKE},
		aminoacids: { label: 'Amino Acids', molecules: AMINO_ACIDS },
		peptides: { label: 'Peptides', molecules: PEPTIDES },
		rna: { label: 'RNA Bases', molecules: RNA},
		dna: { label: 'DNA Bases', molecules: DNA},
		chembl: { label: 'ChEMBL', molecules: CHEMBL },
		macrocycles: { label: 'Macrocycles', molecules: MACROCYCLES },
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
				.map((smiles) => ({ smiles, name: smiles })),
		);
	}

	// ── State ────────────────────────────────────────────────────────────────
	let molecules = $state(withIds(DEFAULT_MOLECULES));

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
						{ smarts: activeSmarts, color: activeSmartsColor, id: 'query', name: 'Query' },
					],
					outline: true,
					fill: false,
				}
			: { definitions: [] },
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
		}
		viewMode = 'grid';
	}

	/** @param {string} v */
	function onViewModeChange(v) {
		if (v === 'edit') switchToEdit();
		else if (v === 'grid') switchToGrid();
	}

	// ── Load a named molecule set ─────────────────────────────────────────────
	/** @param {keyof typeof SETS} setKey */
	function loadSet(setKey) {
		const list = withIds(SETS[setKey].molecules);
		molecules = list;
		textareaValue = toTextarea(list);
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
</script>

<div class="mx-auto flex max-w-[1200px] flex-col gap-6 py-2">
	<!-- Query input -->
	<section class="flex w-full flex-col gap-2">
		<Input
			class="font-mono text-base"
			type="text"
			placeholder="Enter a SMARTS pattern, e.g. [OX2H] for hydroxyl…"
			bind:value={rawSmarts}
			oninput={onSmartsInput}
			spellcheck={false}
			autocomplete="off"
			aria-invalid={!!smartsError || undefined}
		/>
		{#if smartsError}
			<p class="m-0 text-xs text-destructive" role="alert">{smartsError}</p>
		{/if}
	</section>

	<!-- Grid / Edit section -->
	<section class="flex w-full flex-col gap-3">
		<!-- Toolbar -->
		<div class="flex flex-wrap items-center justify-between gap-3">
			{#if viewMode === 'edit'}
				<div class="flex flex-wrap items-center gap-1.5">
					<span class="text-sm text-muted-foreground">Start from:</span>
					{#each Object.entries(SETS) as [key, set]}
						<Button
							variant="outline"
							size="sm"
							class="rounded-full"
							onclick={() => loadSet(/** @type {keyof typeof SETS} */ (key))}
						>
							{set.label}
						</Button>
					{/each}
				</div>
			{:else}
				<div></div>
			{/if}

			<ToggleGroup.Root type="single" value={viewMode} onValueChange={onViewModeChange}>
				<ToggleGroup.Item value="grid" variant="outline" size="sm" class="">View</ToggleGroup.Item>
				<ToggleGroup.Item value="edit" variant="outline" size="sm" class="">Edit</ToggleGroup.Item>
			</ToggleGroup.Root>
		</div>

		<!-- Grid view -->
		{#if viewMode === 'grid'}
			<div class="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4">
				{#each molecules as mol (mol.id)}
					<MoleculeBox smiles={mol.smiles} {highlights} />
				{/each}
			</div>

			<!-- Edit view -->
		{:else}
			<div class="flex flex-col gap-2">
				<Textarea
					class="resize-y font-mono text-sm leading-relaxed"
					bind:value={textareaValue}
					spellcheck={false}
					autocomplete="off"
					rows={Math.max(8, textareaValue.split('\n').length + 2)}
				/>
				<p class="m-0 text-sm text-muted-foreground">
					<strong>Format:</strong> SMILES per line or multi-SDF input.
				</p>
			</div>
		{/if}
	</section>
</div>
