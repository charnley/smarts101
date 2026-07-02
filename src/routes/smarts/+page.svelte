<script>
	import { onMount } from 'svelte';
	import MoleculeBox from '$lib/components/MoleculeBox.svelte';
	import ReactionCard from '$lib/components/ReactionCard.svelte';
	import { runReaction } from '$lib/structure-renderer/reaction-runner.js';
	import { mode } from 'mode-watcher';
	import SmartsEditor from '$lib/components/SmartsEditor.svelte';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import CircleQuestionMarkIcon from '@lucide/svelte/icons/circle-question-mark';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import ListFilter from '@lucide/svelte/icons/list-filter';
	import PanelRightOpen from '@lucide/svelte/icons/panel-right-open';
	import PanelRightClose from '@lucide/svelte/icons/panel-right-close';
	import ExplainPanel from '$lib/components/ExplainPanel.svelte';
	import GeneratePanel from '$lib/components/GeneratePanel.svelte';
	import { settings } from '$lib/settings.svelte.js';
	import { isMediumScreen } from '$lib/breakpoints.svelte.js';
	import { validateSmarts } from '$lib/rdkit/utils.js';
	import { Parser, Language } from 'web-tree-sitter';
	import smartsWasmUrl from '$lib/grammar-smarts/tree-sitter-smarts.wasm?url';
	import coreWasmUrl from 'web-tree-sitter/web-tree-sitter.wasm?url';
	import {
		findRecursiveAtCursor,
		buildExplainer,
		findFragmentSpanAtCursor,
	} from '$lib/grammar-smarts/smarts-docs.js';
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
			return list.map((m) => m.structureDefinition).join('$$$$') + '$$$$';
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
				.filter((block) => block.trim().length > 0)
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
	let infoOpen = $state(false);

	// ── Tree-sitter parser ───────────────────────────────────────────────────
	/** @type {Parser | null} */
	let parser = $state(null);
	/** @type {import('web-tree-sitter').Tree | null} */
	let smartsTree = $state(null);
	let cursorPos = $state(0);

	onMount(async () => {
		try {
			await Parser.init({ locateFile: () => coreWasmUrl });
			const lang = await Language.load(smartsWasmUrl);
			const p = new Parser();
			p.setLanguage(lang);
			parser = p;
			if (rawSmarts.trim()) smartsTree = p.parse(rawSmarts);
		} catch {
			// parser unavailable — ExplainPanel gracefully shows nothing
		}
	});

	// ── Explain panel ────────────────────────────────────────────────────────
	let explainOpen = $state(false);

	function toggleExplain() {
		explainOpen = !explainOpen;
	}

	// ── Sets sheet ───────────────────────────────────────────────────────────
	let setsSheetOpen = $state(false);

	// ── Grid layout derived from settings ────────────────────────────────────
	const COLS_CLASS = {
		1: 'grid-cols-1',
		2: 'grid-cols-2',
		3: 'grid-cols-3',
		4: 'grid-cols-4',
	};
	const MOL_SIZE = {
		1: { width: 560, height: 380 },
		2: { width: 400, height: 280 },
		3: { width: 280, height: 200 },
		4: { width: 220, height: 160 },
	};

	/**
	 * Effective mol columns = columnsPerRow minus one slot for explain when open.
	 * Minimum 1.
	 */
	let effectiveMolCols = $derived(
		/** @type {1|2|3|4} */ (
			isReaction
				? 1
				: explainOpen
					? Math.max(1, settings.columnsPerRow - 1)
					: settings.columnsPerRow
		),
	);

	/** When only 1 total column and explain open, hide molecules entirely */
	let moleculesHidden = $derived(explainOpen && settings.columnsPerRow === 1 && !isReaction);

	/**
	 * CSS grid-template-columns for the content row.
	 * Explain gets 1fr, molecules get (columnsPerRow-1)fr so proportions match.
	 * When explain closed: just 1fr (molecules full width).
	 */
	let contentRowStyle = $derived(
		explainOpen && !moleculesHidden
			? `grid-template-columns: ${Math.max(1, settings.columnsPerRow - 1)}fr 1fr`
			: '',
	);

	let gridClass = $derived(COLS_CLASS[effectiveMolCols] ?? COLS_CLASS[1]);
	let molSize = $derived(MOL_SIZE[effectiveMolCols] ?? MOL_SIZE[1]);

	/** Columns for the Generate tab — reaction mode doesn't collapse it to 1 */
	let genMolCols = $derived(
		/** @type {1|2|3|4} */ (
			explainOpen ? Math.max(1, settings.columnsPerRow - 1) : settings.columnsPerRow
		),
	);
	let genGridClass = $derived(COLS_CLASS[genMolCols] ?? COLS_CLASS[1]);
	let genMolSize = $derived(MOL_SIZE[genMolCols] ?? MOL_SIZE[1]);

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

	/** Molecules produced by the Generate tab — separate from the main grid list */
	let generatedMolecules = $state(
		/** @type {{ id: number, structureDefinition: string }[]} */ ([]),
	);
	/** @type {boolean[]} */
	let generatedMatchStates = $state([]);

	/** 'grid' shows the molecule cards; 'edit' shows the textarea editor; 'gen' shows the generator */
	let viewMode = $state(/** @type {'grid' | 'edit' | 'gen'} */ ('grid'));

	/** Raw text in the textarea editor — synced from molecules when entering edit mode */
	let textareaValue = $state('');

	let rawSmarts = $state('');
	let smartsError = $state(/** @type {string|null} */ (null));
	/** The validated full SMARTS (plain mode only) */
	let validatedSmarts = $state('');

	/** True when tree-sitter sees a reaction node at root */
	let isReaction = $derived(
		!!smartsTree && smartsTree.rootNode.children.find((c) => c.isNamed)?.type === 'reaction',
	);

	/** Fragment under cursor — used for highlight and part detection */
	let cursorFragment = $derived.by(() => {
		if (!smartsTree || !isReaction || !rawSmarts.trim()) return null;
		try {
			return findFragmentSpanAtCursor(smartsTree.rootNode, rawSmarts, cursorPos);
		} catch {
			return null;
		}
	});

	/** Which reaction part the cursor is on — null means on separator or outside */
	let cursorPart = $derived.by(() => {
		if (!isReaction || !cursorFragment) return null;
		const b = cursorFragment.badge;
		if (b.startsWith('products')) return /** @type {'product'} */ ('product');
		if (b.startsWith('reactants')) return /** @type {'reactant'} */ ('reactant');
		return null;
	});

	/** 0-based reactant fragment index from cursor position */
	let cursorReactantFragmentIndex = $derived.by(() => {
		if (!cursorFragment || !cursorFragment.badge.startsWith('reactants')) return null;
		const m = cursorFragment.badge.match(/fragment (\d+)\/\d+/);
		return m ? parseInt(m[1]) - 1 : 0;
	});

	/** Shared reactant fragment index for all carousels — stays when cursor leaves reactant side */
	let carouselReactantFragmentIndex = $state(0);

	$effect(() => {
		if (cursorReactantFragmentIndex !== null)
			carouselReactantFragmentIndex = cursorReactantFragmentIndex;
	});

	/** 0-based product fragment index from cursor position */
	let cursorProductFragmentIndex = $derived.by(() => {
		if (!cursorFragment || !cursorFragment.badge.startsWith('products')) return null;
		const m = cursorFragment.badge.match(/fragment (\d+)\/\d+/);
		return m ? parseInt(m[1]) - 1 : 0;
	});

	/** Shared product fragment index for all carousels — stays when cursor leaves product side */
	let carouselProductFragmentIndex = $state(0);

	$effect(() => {
		if (cursorProductFragmentIndex !== null)
			carouselProductFragmentIndex = cursorProductFragmentIndex;
	});

	/** Active highlight SMARTS — reactant fragment under cursor only */
	let cursorHighlightSmarts = $derived.by(() => {
		if (!isReaction || !cursorFragment) return '';
		const b = cursorFragment.badge;
		if (b.startsWith('reactants')) return cursorFragment.smarts;
		return '';
	});

	/** The validated SMARTS that gets passed down to renderers */
	let activeSmarts = $derived(isReaction ? cursorHighlightSmarts : validatedSmarts);
	/** @type {import('$lib/structure-renderer/reaction-runner.js').ReactionEntry[]} */
	let reactionResults = $state([]);
	let reactionRunning = $state(false);

	/** @type {ReturnType<typeof setTimeout>|null} */
	let reactionDebounceTimer = null;

	$effect(() => {
		const _rxn = rawSmarts;
		const _mols = molecules;
		const _isReaction = isReaction;
		if (!_isReaction) {
			reactionResults = [];
			return;
		}
		if (reactionDebounceTimer) clearTimeout(reactionDebounceTimer);
		reactionDebounceTimer = setTimeout(() => runReactionMode(_rxn, _mols), 400);
	});

	/**
	 * @param {string} rxn
	 * @param {{ structureDefinition: string }[]} mols
	 */
	async function runReactionMode(rxn, mols) {
		reactionRunning = true;
		try {
			const smilesList = mols.map((m) => m.structureDefinition);
			reactionResults = await runReaction(rxn, smilesList);
		} catch {
			reactionResults = [];
		} finally {
			reactionRunning = false;
		}
	}

	/** Blue that reads well on both light and dark backgrounds */
	let activeSmartsColor = $derived(mode.current === 'dark' ? '#60a5fa' : '#2563eb');
	/** Amber for recursive highlight */
	let recursiveColor = $derived(mode.current === 'dark' ? '#fbbf24' : '#d97706');

	/** Inner SMARTS of the recursive_query node under the cursor, or null */
	let activeRecursiveSmarts = $derived.by(() => {
		if (!smartsTree || !rawSmarts.trim()) return null;
		try {
			return findRecursiveAtCursor(smartsTree.rootNode, rawSmarts, cursorPos);
		} catch {
			return null;
		}
	});

	/**
	 * Character range of the recursive sub-SMARTS in the raw input, for CM decoration.
	 * @type {{ from: number, to: number } | null}
	 */
	let recursiveRange = $derived.by(() => {
		if (!settings.highlightRecursive || !smartsTree || !activeRecursiveSmarts) return null;
		try {
			const src = rawSmarts;
			/** @param {import('web-tree-sitter').SyntaxNode} node @returns {{ from: number, to: number } | null} */
			function findRange(node) {
				if (node.type === 'recursive_query') {
					const child = node.namedChildren.find((c) => c.type === 'smarts');
					if (child && src.slice(child.startIndex, child.endIndex) === activeRecursiveSmarts) {
						return { from: node.startIndex, to: node.endIndex };
					}
				}
				for (const child of node.namedChildren) {
					const r = findRange(child);
					if (r) return r;
				}
				return null;
			}
			return findRange(smartsTree.rootNode);
		} catch {
			return null;
		}
	});

	/**
	 * Unified editor dim+highlight range with priority:
	 * 1. Inner recursive $(...) under cursor → amber
	 * 2. Reaction fragment under cursor → blue (reactant) / green (product)
	 * @type {{ from: number, to: number, color: 'recursive' | 'reactant' | 'product' } | null}
	 */
	let focusOnSection = $derived.by(() => {
		// Priority 1: recursive
		if (settings.highlightRecursive && recursiveRange) {
			return {
				from: recursiveRange.from,
				to: recursiveRange.to,
				color: /** @type {'recursive'} */ ('recursive'),
			};
		}
		// Priority 2: reaction fragment
		if (isReaction && cursorFragment && cursorPart) {
			return { from: cursorFragment.from, to: cursorFragment.to, color: cursorPart };
		}
		return null;
	});

	/**
	 * Highlight range pushed from ExplainPanel hover.
	 * @type {{ from: number, to: number } | null}
	 */
	let explainHighlightRange = $state(null);

	/** @type {{ from: number, to: number }[]} */
	let errorRanges = $derived.by(() => {
		if (!smartsTree || !rawSmarts.trim()) return [];
		try {
			/** @param {import('$lib/grammar-smarts/smarts-docs.js').ExplainerEntry} e @returns {{ from: number, to: number }[]} */
			const flatten = (e) => [
				...(e.type === 'ERROR' ? [{ from: e.startIndex, to: e.endIndex }] : []),
				...(e.children ?? []).flatMap(flatten),
			];
			return buildExplainer(smartsTree.rootNode, rawSmarts).flatMap(flatten);
		} catch {
			return [];
		}
	});

	let highlights = $derived.by(() => {
		/** @type {{ smarts: string, color: string, id: string, name: string }[]} */
		const defs = [];
		if (activeSmarts)
			defs.push({ smarts: activeSmarts, color: activeSmartsColor, id: 'query', name: 'Query' });
		if (settings.highlightRecursive && activeRecursiveSmarts) {
			defs.push({
				smarts: activeRecursiveSmarts,
				color: recursiveColor,
				id: 'recursive',
				name: 'Recursive',
			});
		}
		return { definitions: defs, outline: true, fill: false };
	});

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
		else if (v === 'gen') viewMode = 'gen';
	}

	/** @param {string[]} smiles */
	function copyGenerated(smiles) {
		if (smiles.length === 0) return;
		const list = withIds(smiles.map((s) => ({ structureDefinition: s })));
		molecules = list;
		matchStates = list.map(() => false);
		textareaValue = toTextarea(list);
		viewMode = 'grid';
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

	async function validateAndApply(/** @type {string} */ smarts) {
		const trimmed = smarts.trim();
		if (!trimmed) {
			smartsError = null;
			validatedSmarts = '';
			return;
		}
		// In reaction mode, don't validate the full rxnSMARTS as a plain SMARTS
		if (isReaction) {
			smartsError = null;
			validatedSmarts = '';
			return;
		}
		const { valid, errors } = await validateSmarts(trimmed);
		if (valid) {
			smartsError = null;
			validatedSmarts = trimmed;
		} else {
			const raw = errors[0] ?? '';
			const posMatch = raw.match(/position\s+(\d+)/i);
			smartsError = posMatch
				? `Check for mistakes around position ${posMatch[1]}`
				: 'Invalid SMARTS';
			validatedSmarts = '';
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

<div class="flex flex-col gap-4 py-2">
	<!-- SMARTS input — full width -->
	<section class="sticky top-16 z-10 w-full bg-background/95 pt-2 pb-2 backdrop-blur-sm">
		<SmartsEditor
			bind:value={rawSmarts}
			onchange={(v) => {
				if (debounceTimer) clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					if (parser) smartsTree = rawSmarts.trim() ? parser.parse(rawSmarts) : null;
					validateAndApply(rawSmarts);
				}, 350);
			}}
			oncursorchange={(pos) => {
				cursorPos = pos;
			}}
			{focusOnSection}
			highlightRange={explainHighlightRange}
			{errorRanges}
			invalid={!!smartsError}
		/>
	</section>

	<!-- Content row: CSS grid so explain takes exactly 1 column-unit -->
	<div class={explainOpen && !moleculesHidden ? 'grid gap-4' : 'flex'} style={contentRowStyle}>
		<!-- Molecules column -->
		{#if !moleculesHidden}
			<div class="flex min-w-0 flex-1 flex-col gap-3">
				<Tabs.Root value={viewMode} onValueChange={onViewModeChange}>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-1">
							<Tooltip.Provider delayDuration={0}>
								<Tabs.List>
									<Tooltip.Root>
										<Tooltip.Trigger>
											{#snippet child({ props })}
												<Tabs.Trigger value="grid" {...props}>View Results</Tabs.Trigger>
											{/snippet}
										</Tooltip.Trigger>
										<Tooltip.Content side="top">View SMARTS matches</Tooltip.Content>
									</Tooltip.Root>

									<Tooltip.Root>
										<Tooltip.Trigger>
											{#snippet child({ props })}
												<Tabs.Trigger value="edit" {...props}>Edit Molecules</Tabs.Trigger>
											{/snippet}
										</Tooltip.Trigger>
										<Tooltip.Content side="top">Edit target SMILES/SDF molecules</Tooltip.Content>
									</Tooltip.Root>

									<Tooltip.Root>
										<Tooltip.Trigger>
											{#snippet child({ props })}
												<Tabs.Trigger value="gen" {...props}>Generate Molecules</Tabs.Trigger>
											{/snippet}
										</Tooltip.Trigger>
										<Tooltip.Content side="top">
											Use Smarter SMARTS<sup>tm</sup> to find matching molecules
										</Tooltip.Content>
									</Tooltip.Root>
								</Tabs.List>
							</Tooltip.Provider>
							<Button
								variant="outline"
								size="icon-sm"
								aria-label="Settings"
								onclick={() => (settingsOpen = true)}
							>
								<SettingsIcon size={16} />
							</Button>
							<Button
								variant="outline"
								size="icon-sm"
								aria-label="Info"
								onclick={() => (infoOpen = true)}
							>
								<CircleQuestionMarkIcon size={16} />
							</Button>
						</div>
						<div class="flex items-center gap-1">
							{#if !explainOpen || moleculesHidden}
								<Button
									variant="outline"
									size="sm"
									aria-label="Toggle explain"
									onclick={toggleExplain}
								>
									{#if explainOpen}
										<PanelRightClose size={16} />
									{:else}
										<PanelRightOpen size={16} />
									{/if}
									Explain
								</Button>
							{/if}
						</div>
					</div>

					<Tabs.Content value="grid">
						<div class="grid gap-4 {gridClass}">
							{#if isReaction}
								{#each reactionResults as entry (entry.smarts)}
									<ReactionCard
										slides={entry.slides}
										{highlights}
										width={molSize.width}
										height={molSize.height}
										bind:reactantFragmentIndex={carouselReactantFragmentIndex}
										bind:productFragmentIndex={carouselProductFragmentIndex}
									/>
								{/each}
								{#if reactionRunning}
									<p class="col-span-full animate-pulse text-xs text-muted-foreground">running…</p>
								{:else if reactionResults.length === 0}
									<p class="col-span-full text-xs text-muted-foreground">
										No results — molecules must match all reactant fragments.
									</p>
								{/if}
							{:else}
								{#each molecules as mol, i (mol.id)}
									<div
										class={settings.filterMatchesOnly && activeSmarts && !matchStates[i]
											? 'hidden'
											: ''}
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
							{/if}
						</div>
					</Tabs.Content>

					<Tabs.Content value="edit">
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
							{#if isMediumScreen.value}
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
								<Button variant="outline" size="sm" onclick={() => (setsSheetOpen = true)}>
									<ListFilter size={16} />
									Start from…
								</Button>
							{/if}
						</div>
					</Tabs.Content>

					<Tabs.Content value="gen">
						<div class="flex flex-col gap-3">
							<GeneratePanel
								smarts={rawSmarts}
								active={viewMode === 'gen'}
								onresults={(smiles) => {
									const list = withIds(smiles.map((s) => ({ structureDefinition: s })));
									generatedMolecules = list;
									generatedMatchStates = list.map(() => false);
								}}
							/>

							{#if generatedMolecules.length > 0}
								<div class="flex items-center justify-between">
									<div class="text-sm text-muted-foreground">
										Showing {generatedMolecules.length} matches
									</div>
									<Button
										variant="outline"
										size="sm"
										onclick={() =>
											copyGenerated(generatedMolecules.map((m) => m.structureDefinition))}
									>
										<CopyIcon size={16} />
										Copy to View/Edit
									</Button>
								</div>
							{/if}

							<div class="grid gap-4 {genGridClass}">
								{#each generatedMolecules as mol, i (mol.id)}
									<MoleculeBox
										structureDefinition={mol.structureDefinition}
										{highlights}
										width={genMolSize.width}
										height={genMolSize.height}
										useCoordgen={settings.useCoordgen}
										explicitHydrogens={settings.explicitHydrogens}
										bind:hasMatch={generatedMatchStates[i]}
									/>
								{/each}
							</div>
						</div>
					</Tabs.Content>
				</Tabs.Root>
			</div>
		{/if}

		<!-- Explain panel column -->
		{#if explainOpen}
			<div class="flex min-w-0 flex-1 flex-col gap-2">
				<div class="flex items-center justify-between">
					<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase"
						>Explanation</span
					>
					<div class="flex items-center gap-1">
						<Button variant="outline" size="sm" aria-label="Toggle explain" onclick={toggleExplain}>
							<PanelRightClose size={16} />
							Explain
						</Button>
					</div>
				</div>
				<ExplainPanel
					smarts={rawSmarts}
					tree={smartsTree}
					{cursorPos}
					onhover={(r) => (explainHighlightRange = r)}
				/>
			</div>
		{/if}
	</div>
</div>

<!-- Sets sheet (mobile) -->
<Sheet.Root bind:open={setsSheetOpen}>
	<Sheet.Content side="left" class="" portalProps={{}}>
		<Sheet.Header class="">
			<Sheet.Title class="">Start from…</Sheet.Title>
		</Sheet.Header>
		<div class="flex flex-col gap-2 p-4">
			{#each Object.entries(SETS) as [key, set]}
				<Button
					variant="outline"
					onclick={() => {
						loadSet(/** @type {keyof typeof SETS} */ (key));
						setsSheetOpen = false;
					}}
				>
					{set.label}
				</Button>
			{/each}
		</div>
	</Sheet.Content>
</Sheet.Root>

<!-- Settings dialog -->
<Dialog.Root bind:open={settingsOpen}>
	<Dialog.Content class="sm:max-w-md" portalProps={{}}>
		<Dialog.Header class="">
			<Dialog.Title class="">Settings</Dialog.Title>
		</Dialog.Header>

		<div class="flex flex-col gap-6 py-2">
			<!-- Number of columns -->
			<div class="flex flex-col gap-2">
				<Label class="text-sm font-medium">Number of columns</Label>
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
					<ToggleGroup.Item value="4" variant="outline" size="sm" class="w-10">4</ToggleGroup.Item>
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

			<!-- Highlight recursive SMARTS -->
			<div class="flex items-center gap-3">
				<Checkbox class="" id="highlight-recursive" bind:checked={settings.highlightRecursive} />
				<div class="flex flex-col gap-0.5">
					<Label class="" for="highlight-recursive">Highlight active recursive SMARTS</Label>
					<p class="text-xs text-muted-foreground">
						Highlights the inner pattern of <code>$(...)</code> under the cursor in molecule views.
					</p>
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- Info dialog -->
<Dialog.Root bind:open={infoOpen}>
	<Dialog.Content class="sm:max-w-lg" portalProps={{}}>
		<Dialog.Header class="">
			<Dialog.Title class="">Usage</Dialog.Title>
		</Dialog.Header>

		<div class="flex flex-col gap-5 py-2 text-sm">
			<section class="flex flex-col gap-2">
				<p class="">
					Enter a SMARTS pattern in the editor at the top of the page. Matching substructures are
					highlighted in the molecule grid below as you type.
				</p>
				<ul class="ml-4 list-disc">
					<li><strong>View</strong> — see which molecules match the current SMARTS.</li>
					<li>
						<strong>Edit</strong> — edit the target molecules in either SMILES list or SDF format.
					</li>
					<li>
						<strong>Generate</strong> — Find example molecules from your SMARTS pattern, using Smarter
						SMARTS.
					</li>
				</ul>
			</section>

			<section class="flex flex-col gap-2">
				<h3 class="font-semibold">Reactions</h3>
				<p class="">
					You can use <code>>></code> SMARTS reaction syntax in "view" and you will see the target
					transform. Note that if you have multiple reactants with <code>.</code> you will need the same
					amount of SMILES in your "Edit" molecules.
				</p>
			</section>

			<section class="flex flex-col gap-2">
				<h3 class="font-semibold">What is Smarter SMARTS?</h3>
				<p class="">
					Smarter SMARTS is a tool that helps you write accurate SMARTS patterns by showing the
					distinct molecules your pattern actually matches, filtered for unique atom environments in
					the 100K smallest Chembl molecules and stopping with 200 results. Developed by Noel
					O'Boyle as described in
					<a
						href="https://baoilleach.blogspot.com/2018/11/smarts-for-dummies.html"
						target="_blank"
						class="underline">SMARTS for dummies</a
					>.
				</p>
			</section>
		</div>
	</Dialog.Content>
</Dialog.Root>
