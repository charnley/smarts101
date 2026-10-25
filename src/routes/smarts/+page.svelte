<script>
	import { onMount } from 'svelte';
	import MoleculeBox from '$lib/components/MoleculeBox.svelte';
	import ReactionCard from '$lib/components/ReactionCard.svelte';
	import { runReaction } from '$lib/structure-renderer/reaction-runner.js';
	import { mode } from 'mode-watcher';
	import { SMARTS_INPUT_DEBOUNCE_MS, REACTION_DEBOUNCE_MS } from '$lib/constants.js';
	import SmartsEditor from '$lib/components/SmartsEditor.svelte';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import CircleQuestionMarkIcon from '@lucide/svelte/icons/circle-question-mark';
	import LockIcon from '@lucide/svelte/icons/lock';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import WandSparklesIcon from '@lucide/svelte/icons/wand-sparkles';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import ListFilter from '@lucide/svelte/icons/list-filter';
	import PanelRightOpen from '@lucide/svelte/icons/panel-right-open';
	import PanelRightClose from '@lucide/svelte/icons/panel-right-close';
	import ExplainPanel from '$lib/components/ExplainPanel.svelte';
	import GeneratePanel from '$lib/components/GeneratePanel.svelte';
	import { settings } from '$lib/settings.svelte.js';
	import { isMediumScreen } from '$lib/breakpoints.svelte.js';
	import { validateSmarts, findMcsSmarts } from '$lib/rdkit/utils.js';
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
	const AUTO_MOL_SIZE = { width: 400, height: 280 };
	const AUTO_GRID_STYLE =
		'grid-template-columns: repeat(auto-fill, minmax(min(100%, max(280px, calc((100% - 3rem) / 4))), 1fr))';

	let isAuto = $derived(settings.columnsPerRow === 'auto');
	let fixedCols = $derived(isAuto ? 3 : Number(settings.columnsPerRow));

	let effectiveMolCols = $derived(
		/** @type {1|2|3|4} */ (isReaction ? 1 : explainOpen ? Math.max(1, fixedCols - 1) : fixedCols),
	);

	let moleculesHidden = $derived(!isAuto && explainOpen && fixedCols === 1 && !isReaction);

	let contentRowClass = $derived(
		explainOpen && !moleculesHidden
			? isAuto
				? 'grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]'
				: 'grid gap-4'
			: 'flex',
	);
	let contentRowStyle = $derived(
		explainOpen && !moleculesHidden && !isAuto
			? `grid-template-columns: ${Math.max(1, fixedCols - 1)}fr 1fr`
			: '',
	);

	let gridClass = $derived(
		isReaction || !isAuto ? (COLS_CLASS[effectiveMolCols] ?? 'grid-cols-1') : '',
	);
	let gridStyle = $derived(isAuto && !isReaction ? AUTO_GRID_STYLE : '');
	let molSize = $derived(
		isAuto && !isReaction ? AUTO_MOL_SIZE : (MOL_SIZE[effectiveMolCols] ?? MOL_SIZE[1]),
	);

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

	/** Molecules found by Smarter SMARTS for the current query (used in dynamic targets mode) */
	let generatedMolecules = $state(
		/** @type {{ id: number, structureDefinition: string, name?: string }[]} */ ([]),
	);

	/** With no target molecules, targets are found dynamically from the SMARTS query */
	let isDynamicTargets = $derived(molecules.length === 0);

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
		reactionDebounceTimer = setTimeout(() => runReactionMode(_rxn, _mols), REACTION_DEBOUNCE_MS);
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

	// ── Edit targets dialog ──────────────────────────────────────────────────
	let editOpen = $state(false);

	function openEdit() {
		textareaValue = toTextarea(molecules);
		editOpen = true;
	}

	/** Apply the edited text to the molecule list when the dialog closes. */
	function applyEdit() {
		const parsed = fromTextarea(textareaValue);
		molecules = parsed;
		matchStates = parsed.map(() => false);
	}

	/** @param {boolean} open */
	function onEditOpenChange(open) {
		if (!open) applyEdit();
	}

	/** Copy the dynamically found molecules into the targets, switching to static targets. */
	function lockTargets() {
		if (generatedMolecules.length === 0) return;
		const list = withIds(
			generatedMolecules.map(({ structureDefinition, name }) => ({ structureDefinition, name })),
		);
		molecules = list;
		matchStates = list.map(() => false);
		textareaValue = toTextarea(list);
	}

	/** Clear the targets so they are found dynamically from the SMARTS query. */
	function loadDynamic() {
		molecules = [];
		matchStates = [];
		textareaValue = '';
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

	/** Re-parse and validate after rawSmarts changed (debounced when typing). */
	function applySmartsChange() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (parser) smartsTree = rawSmarts.trim() ? parser.parse(rawSmarts) : null;
			validateAndApply(rawSmarts);
		}, SMARTS_INPUT_DEBOUNCE_MS);
	}

	// ── Generate SMARTS from targets (maximum common substructure) ───────────
	let generating = $state(false);
	let generateFailedOpen = $state(false);
	let generateFailedReason = $state('');

	async function generateSmarts() {
		if (generating) return;
		generating = true;
		// Let the spinner paint before the synchronous MCS call blocks the main thread
		await new Promise((resolve) => setTimeout(resolve, 50));
		try {
			const result = await findMcsSmarts(
				molecules.map((m) => m.structureDefinition),
				{ explicitHydrogens: settings.explicitHydrogens },
			);
			console.log(
				`[MCS] ${molecules.length} molecules, ${result.numAtoms} atoms, ` +
					`${result.ms.toFixed(0)} ms${result.canceled ? ' (timed out)' : ''}`,
			);
			if (!result.smarts) {
				generateFailedReason =
					molecules.length - result.skipped < 2
						? 'At least two valid target molecules are needed to find a shared substructure.'
						: 'The target molecules have no substructure in common.';
				generateFailedOpen = true;
				return;
			}
			rawSmarts = result.smarts;
			applySmartsChange();
		} catch (e) {
			generateFailedReason = `Generating a SMARTS failed: ${e instanceof Error ? e.message : e}`;
			generateFailedOpen = true;
		} finally {
			generating = false;
		}
	}

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
	<section
		class="sticky top-16 z-10 flex w-full items-start gap-2 bg-background/95 pt-2 pb-2 backdrop-blur-sm"
	>
		<div class="min-w-0 flex-1">
			<SmartsEditor
				bind:value={rawSmarts}
				onchange={applySmartsChange}
				oncursorchange={(pos) => {
					cursorPos = pos;
				}}
				{focusOnSection}
				highlightRange={explainHighlightRange}
				{errorRanges}
				invalid={!!smartsError}
			/>
		</div>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="icon-lg"
				aria-label="Generate SMARTS from targets"
				title="Generate SMARTS from the target molecules"
				disabled={generating || isDynamicTargets}
				onclick={generateSmarts}
			>
				{#if generating}
					<Spinner />
				{:else}
					<WandSparklesIcon size={16} />
				{/if}
			</Button>
			<Button
				variant="outline"
				size="icon-lg"
				aria-label="Settings"
				onclick={() => (settingsOpen = true)}
			>
				<SettingsIcon size={16} />
			</Button>
			<Button variant="outline" size="icon-lg" aria-label="Info" onclick={() => (infoOpen = true)}>
				<CircleQuestionMarkIcon size={16} />
			</Button>
		</div>
	</section>

	<!-- Content row: CSS grid so explain takes exactly 1 column-unit -->
	<div class={contentRowClass} style={contentRowStyle}>
		<!-- Molecules column -->
		{#if !moleculesHidden}
			<div
				class="flex min-w-0 flex-1 flex-col gap-3 {isAuto && explainOpen ? 'max-sm:hidden' : ''}"
			>
				<!-- Header row -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-1">
						<Button variant="outline" size="sm" onclick={openEdit}>
							<PencilIcon size={16} />
							Edit targets
						</Button>
						{#if isDynamicTargets}
							<Button
								variant="outline"
								size="icon-sm"
								aria-label="Lock found molecules as targets"
								title="Lock found molecules as targets"
								disabled={generatedMolecules.length === 0}
								onclick={lockTargets}
							>
								<LockIcon size={16} />
							</Button>
							<span class="ml-1 text-xs text-muted-foreground">Dynamic targets</span>
						{/if}
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

				<!-- Kept mounted (hidden when not dynamic) so the worker and its results persist -->
				<div class={isDynamicTargets && !isReaction ? '' : 'hidden'}>
					<GeneratePanel
						smarts={rawSmarts}
						active={isDynamicTargets && !isReaction}
						onresults={(items) => {
							generatedMolecules = withIds(
								items.map((it) => ({ structureDefinition: it.smiles, name: it.name })),
							);
						}}
					/>
				</div>

				<div class="grid gap-4 {gridClass}" style={gridStyle}>
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
						{:else if isDynamicTargets}
							<p class="col-span-full text-xs text-muted-foreground">
								Reactions need target molecules — use Edit targets to add some.
							</p>
						{:else if reactionResults.length === 0}
							<p class="col-span-full text-xs text-muted-foreground">
								No results — molecules must match all reactant fragments.
							</p>
						{/if}
					{:else if isDynamicTargets}
						{#each generatedMolecules as mol (mol.id)}
							<MoleculeBox
								structureDefinition={mol.structureDefinition}
								name={mol.name}
								{highlights}
								width={molSize.width}
								height={molSize.height}
								useCoordgen={settings.useCoordgen}
								explicitHydrogens={settings.explicitHydrogens}
							/>
						{/each}
					{:else}
						{#each molecules as mol, i (mol.id)}
							<div
								class="min-w-0 {settings.filterMatchesOnly && activeSmarts && !matchStates[i]
									? 'hidden'
									: ''}"
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
			</div>
		{/if}

		<!-- Explain panel column -->
		{#if explainOpen}
			<div class="flex min-w-0 flex-1 flex-col gap-2">
				<div class="flex items-center justify-between">
					<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase"></span>
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

<!-- Edit targets dialog -->
<Dialog.Root bind:open={editOpen} onOpenChange={onEditOpenChange}>
	<Dialog.Content
		class="max-h-[calc(100dvh-2rem)] min-w-0 overflow-y-auto sm:max-w-[min(64rem,calc(100%-2rem))]"
	>
		<Dialog.Header>
			<Dialog.Title>Edit targets</Dialog.Title>
		</Dialog.Header>
		<div class="flex min-w-0 flex-col gap-2">
			<p class="m-0 text-sm text-muted-foreground">
				<strong>Format:</strong> SMILES per line or multi-SDF input. Leave empty to use
				<strong>Dynamic Targets</strong>: molecules matching your SMARTS are found for you.
			</p>
			{#if isMediumScreen.value}
				<div class="flex flex-wrap items-center gap-1.5">
					<span class="text-sm text-muted-foreground">Start from:</span>
					<Button variant="outline" size="sm" class="rounded-full" onclick={loadDynamic}>
						<SparklesIcon size={14} />
						Dynamic Targets
					</Button>
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
			<Textarea
				class="max-h-[60dvh] w-full max-w-full min-w-0 resize-y overflow-auto font-mono text-sm leading-relaxed whitespace-pre"
				bind:value={textareaValue}
				placeholder="Empty: Dynamic Targets"
				spellcheck={false}
				autocomplete="off"
				rows={Math.max(8, textareaValue.split('\n').length + 2)}
			/>
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- Sets sheet (mobile) -->
<Sheet.Root bind:open={setsSheetOpen}>
	<Sheet.Content side="left">
		<Sheet.Header>
			<Sheet.Title>Start from…</Sheet.Title>
		</Sheet.Header>
		<div class="flex flex-col gap-2 p-4">
			<Button
				variant="outline"
				onclick={() => {
					loadDynamic();
					setsSheetOpen = false;
				}}
			>
				<SparklesIcon size={16} />
				Dynamic Targets
			</Button>
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

<!-- Generate SMARTS failed dialog -->
<Dialog.Root bind:open={generateFailedOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>No SMARTS generated</Dialog.Title>
			<Dialog.Description>{generateFailedReason}</Dialog.Description>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>

<!-- Settings dialog -->
<Dialog.Root bind:open={settingsOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Settings</Dialog.Title>
		</Dialog.Header>

		<div class="flex flex-col gap-6 py-2">
			<!-- Number of columns -->
			<div class="flex flex-col gap-2">
				<Label class="text-sm font-medium">Number of columns</Label>
				<ToggleGroup.Root
					type="single"
					value={String(settings.columnsPerRow)}
					onValueChange={(/** @type {string} */ v) => {
						if (v === 'auto') settings.columnsPerRow = 'auto';
						else if (v) settings.columnsPerRow = /** @type {1|2|3|4} */ (Number(v));
					}}
					class="justify-start"
				>
					<ToggleGroup.Item value="auto" variant="outline" size="sm" class="w-14">
						Auto
					</ToggleGroup.Item>
					<ToggleGroup.Item value="1" variant="outline" size="sm" class="w-10">1</ToggleGroup.Item>
					<ToggleGroup.Item value="2" variant="outline" size="sm" class="w-10">2</ToggleGroup.Item>
					<ToggleGroup.Item value="3" variant="outline" size="sm" class="w-10">3</ToggleGroup.Item>
					<ToggleGroup.Item value="4" variant="outline" size="sm" class="w-10">4</ToggleGroup.Item>
				</ToggleGroup.Root>
			</div>

			<!-- Explicit hydrogens -->
			<div class="flex items-center gap-3">
				<Checkbox id="explicit-h" bind:checked={settings.explicitHydrogens} />
				<div class="flex flex-col gap-0.5">
					<Label for="explicit-h">Keep explicit hydrogens</Label>
					<p class="text-xs text-muted-foreground">Relevant for SDF input with embedded H atoms.</p>
				</div>
			</div>

			<!-- prefer_coordgen -->
			<div class="flex items-center gap-3">
				<Checkbox id="coordgen" bind:checked={settings.useCoordgen} />
				<div class="flex flex-col gap-0.5">
					<Label for="coordgen">Generate Coordinate</Label>
					<p class="text-xs text-muted-foreground">
						Generate new coordinates for molecules (will be slower, but pretty)
					</p>
				</div>
			</div>

			<!-- Filter matches only -->
			<div class="flex items-center gap-3">
				<Checkbox id="filter-matches" bind:checked={settings.filterMatchesOnly} />
				<div class="flex flex-col gap-0.5">
					<Label for="filter-matches">Show only matching molecules</Label>
					<p class="text-xs text-muted-foreground">
						Hides molecules that do not match the active SMARTS pattern.
					</p>
				</div>
			</div>

			<!-- Highlight recursive SMARTS -->
			<div class="flex items-center gap-3">
				<Checkbox id="highlight-recursive" bind:checked={settings.highlightRecursive} />
				<div class="flex flex-col gap-0.5">
					<Label for="highlight-recursive">Highlight active recursive SMARTS</Label>
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
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Usage</Dialog.Title>
		</Dialog.Header>

		<div class="flex flex-col gap-5 py-2 text-sm">
			<section class="flex flex-col gap-2">
				<p>
					Enter a SMARTS pattern in the editor at the top of the page. Matching substructures are
					highlighted in the molecule grid below as you type.
				</p>
				<ul class="ml-4 list-disc">
					<li>
						<strong>Edit targets</strong> — edit the target molecules in either SMILES list or SDF format.
					</li>
					<li>
						<strong>Dynamic Targets</strong> — leave the targets empty and matching example molecules
						are found from your SMARTS pattern, using Smarter SMARTS. Use the lock button to copy them
						into the targets.
					</li>
				</ul>
			</section>

			<section class="flex flex-col gap-2">
				<h3 class="font-semibold">Reactions</h3>
				<p>
					You can use <code>>></code> SMARTS reaction syntax and you will see the target transform.
					Note that if you have multiple reactants with <code>.</code> you will need the same amount of
					SMILES in your targets.
				</p>
			</section>

			<section class="flex flex-col gap-2">
				<h3 class="font-semibold">What is Smarter SMARTS?</h3>
				<p>
					Smarter SMARTS is a tool that helps you write accurate SMARTS patterns by showing the
					distinct molecules your pattern actually matches, filtered for unique atom environments in
					the 100K smallest ChEMBL molecules and stopping with 200 results. Developed by Noel
					O'Boyle as described in
					<a
						href="https://baoilleach.blogspot.com/2018/11/smarts-for-dummies.html"
						target="_blank"
						rel="noopener"
						class="underline">SMARTS for dummies</a
					>.
				</p>
			</section>
		</div>
	</Dialog.Content>
</Dialog.Root>
