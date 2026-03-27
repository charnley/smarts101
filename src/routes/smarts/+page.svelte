<script>
	import { performSubstructureSearch } from '$lib/structure-renderer/worker-manager.js';
	import MoleculeBox from '$lib/components/MoleculeBox.svelte';
	import { mode } from 'mode-watcher';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { settings } from '$lib/settings.svelte.js';
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
		druglike: { label: 'Druglike', molecules: DRUGLIKE },
		aminoacids: { label: 'Amino Acids', molecules: AMINO_ACIDS },
		peptides: { label: 'Peptides', molecules: PEPTIDES },
		rna: { label: 'RNA Bases', molecules: RNA },
		dna: { label: 'DNA Bases', molecules: DNA },
		chembl: { label: 'ChEMBL', molecules: CHEMBL },
		macrocycles: { label: 'Macrocycles', molecules: MACROCYCLES },
	};

	/**
	 * Assign sequential IDs to a molecule list.
	 * @param {{ structureDefinition: string }[]} list
	 * @returns {{ id: number, structureDefinition: string }[]}
	 */
	function withIds(list) {
		return list.map((m, i) => ({ ...m, id: i + 1 }));
	}

	/**
	 * Returns true when the text looks like an SDF/molblock input
	 * (contains the standard SDF record terminator).
	 * @param {string} text
	 */
	function isSDF(text) {
		return text.includes('$$$$');
	}

	/**
	 * Serialize molecules back to textarea text.
	 * Molblock definitions are joined with the SDF record terminator;
	 * SMILES definitions are written one per line.
	 * @param {{ structureDefinition: string }[]} list
	 */
	function toTextarea(list) {
		if (list.length === 0) return '';
		// If any definition looks like a molblock, output as SDF
		if (list.some((m) => m.structureDefinition.includes('\n'))) {
			return list.map((m) => m.structureDefinition).join('\n$$$$\n') + '\n$$$$\n';
		}
		return list.map((m) => m.structureDefinition).join('\n');
	}

	/**
	 * Parse textarea text into a molecule list.
	 * Accepts either:
	 *   - SDF input  (text contains "$$$$") — splits on "$$$$", each segment is a molblock
	 *   - SMILES input — one SMILES per non-empty line
	 * @param {string} text
	 * @returns {{ id: number, structureDefinition: string }[]}
	 */
	function fromTextarea(text) {
		if (isSDF(text)) {
			const molblocks = text
				.split('$$$$')
				.map((block) => block.trim())
				.filter((block) => block.length > 0)
				.map((block) => ({ structureDefinition: block }));
			return withIds(molblocks);
		}
		return withIds(
			text
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line.length > 0)
				.map((structureDefinition) => ({ structureDefinition })),
		);
	}

	// ── Settings dialog ──────────────────────────────────────────────────────
	let settingsOpen = $state(false);

	// ── Grid layout derived from settings ────────────────────────────────────
	const COLS_CLASS = {
		1: 'grid-cols-1',
		2: 'grid-cols-1 sm:grid-cols-2',
		3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
	};
	const MOL_SIZE = {
		1: { width: 560, height: 380 },
		2: { width: 400, height: 280 },
		3: { width: 280, height: 200 },
	};

	let gridClass = $derived(
		COLS_CLASS[/** @type {1|2|3} */ (settings.columnsPerRow)] ?? COLS_CLASS[3],
	);
	let molSize = $derived(MOL_SIZE[/** @type {1|2|3} */ (settings.columnsPerRow)] ?? MOL_SIZE[3]);

	// ── State ────────────────────────────────────────────────────────────────
	let molecules = $state(
		withIds(DEFAULT_MOLECULES.map((m) => ({ structureDefinition: m.smiles }))),
	);

	/**
	 * Per-molecule match state — index-parallel to `molecules`.
	 * Each entry is set to `true` by its MoleculeBox when the active SMARTS matches.
	 * @type {boolean[]}
	 */
	let matchStates = $state(DEFAULT_MOLECULES.map(() => false));

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
			matchStates = parsed.map(() => false);
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
		const list = withIds(SETS[setKey].molecules.map((m) => ({ structureDefinition: m.smiles })));
		molecules = list;
		matchStates = list.map(() => false);
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

<svelte:head>
	<title>SMARTS101 — Query Tool</title>
	<meta
		name="description"
		content="Interactively build, test and debug SMARTS substructure queries against molecules (SMILES)."
	/>
</svelte:head>

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

			<div class="flex items-center gap-2">
				<ToggleGroup.Root type="single" value={viewMode} onValueChange={onViewModeChange}>
					<ToggleGroup.Item value="grid" variant="outline" size="sm" class="">View</ToggleGroup.Item
					>
					<ToggleGroup.Item value="edit" variant="outline" size="sm" class=""
						>Edit Molecules</ToggleGroup.Item
					>
				</ToggleGroup.Root>
				<Button
					variant="outline"
					size="icon-sm"
					aria-label="Settings"
					onclick={() => (settingsOpen = true)}
				>
					<SettingsIcon size={16} />
				</Button>
			</div>
		</div>

		<!-- Grid view -->
		{#if viewMode === 'grid'}
			<div class="grid gap-4 {gridClass}">
				{#each molecules as mol, i (mol.id)}
					<div
						class={settings.filterMatchesOnly && activeSmarts && !matchStates[i] ? 'hidden' : ''}
					>
						<MoleculeBox
							structureDefinition={mol.structureDefinition}
							{highlights}
							width={molSize.width}
							height={molSize.height}
							useCoordgen={settings.useCoordgen}
							explicitHydrogens={settings.explicitHydrogens}
							bind:hasMatch={matchStates[i]}
						/>
					</div>
				{/each}
			</div>

			<!-- Edit view -->
		{:else}
			<div class="flex flex-col gap-2">
				<Textarea
					class="max-h-[70vh] w-full resize-y overflow-auto font-mono text-sm leading-relaxed whitespace-pre"
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

<!-- Settings dialog -->
<Dialog.Root bind:open={settingsOpen}>
	<Dialog.Content class="sm:max-w-md" portalProps={{}}>
		<Dialog.Header class="">
			<Dialog.Title class="">Settings</Dialog.Title>
		</Dialog.Header>

		<div class="flex flex-col gap-6 py-2">
			<!-- Molecules per row -->
			<div class="flex flex-col gap-2">
				<Label class="text-sm font-medium">Molecules per row</Label>
				<ToggleGroup.Root
					type="single"
					value={String(settings.columnsPerRow)}
					onValueChange={(/** @type {string} */ v) => {
						if (v) settings.columnsPerRow = /** @type {1|2|3} */ (Number(v));
					}}
					class="justify-start"
				>
					<ToggleGroup.Item value="1" variant="outline" size="sm" class="w-10">1</ToggleGroup.Item>
					<ToggleGroup.Item value="2" variant="outline" size="sm" class="w-10">2</ToggleGroup.Item>
					<ToggleGroup.Item value="3" variant="outline" size="sm" class="w-10">3</ToggleGroup.Item>
				</ToggleGroup.Root>
			</div>

			<!-- Explicit hydrogens -->
			<div class="flex items-center gap-3">
				<Checkbox class="" id="explicit-h" bind:checked={settings.explicitHydrogens} />
				<div class="flex flex-col gap-0.5">
					<Label class="" for="explicit-h">Keep explicit hydrogens</Label>
					<p class="text-xs text-muted-foreground">Relevant for SDF input with embedded H atoms.</p>
				</div>
			</div>

			<!-- prefer_coordgen -->
			<div class="flex items-center gap-3">
				<Checkbox class="" id="coordgen" bind:checked={settings.useCoordgen} />
				<div class="flex flex-col gap-0.5">
					<Label class="" for="coordgen">Generate Coordinate</Label>
					<p class="text-xs text-muted-foreground">
						Generate new coordinates for molecules (will be slower, but pretty)
					</p>
				</div>
			</div>

			<!-- Filter matches only -->
			<div class="flex items-center gap-3">
				<Checkbox class="" id="filter-matches" bind:checked={settings.filterMatchesOnly} />
				<div class="flex flex-col gap-0.5">
					<Label class="" for="filter-matches">Show only matching molecules</Label>
					<p class="text-xs text-muted-foreground">
						Hides molecules that do not match the active SMARTS pattern.
					</p>
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
