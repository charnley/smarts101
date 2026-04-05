<script>
	import { onMount } from 'svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import SmartsQueryRenderer from '$lib/components/SmartsQueryRenderer.svelte';
	import ExplainPanel from '$lib/components/ExplainPanel.svelte';
	import { validateSmarts } from '$lib/rdkit/utils.js';
	import { Parser, Language } from 'web-tree-sitter';
	import smartsWasmUrl from '$lib/grammar-smarts/tree-sitter-smarts.wasm?url';
	import coreWasmUrl from 'web-tree-sitter/web-tree-sitter.wasm?url';

	/**
	 * @typedef {{ text: string, nodeStart: number, nodeEnd: number, isError: boolean }} TreeLine
	 */

	// ── State ──────────────────────────────────────────────────────────────
	/** @type {Parser | null} */
	let parser = $state(null);
	/** @type {import('web-tree-sitter').Tree | null} */
	let tree = $state(null);

	let smarts = $state('[OH]c1ccccc1');
	/** @type {TreeLine[]} */
	let treeLines = $state([]);
	let loadError = $state(/** @type {string|null} */ (null));

	let cursorPos = $state(0);
	/** @type {{ valid: boolean, errors: string[] } | null} */
	let smartsCheck = $state(null);

	let showExplain = $state(true);

	let activeNode = $derived.by(() => {
		if (!tree) return null;
		try {
			return tree.rootNode.descendantForIndex(cursorPos);
		} catch {
			return null;
		}
	});

	// ── Parser initialisation ──────────────────────────────────────────────
	onMount(async () => {
		try {
			await Parser.init({ locateFile: () => coreWasmUrl });
			const lang = await Language.load(smartsWasmUrl);
			const p = new Parser();
			p.setLanguage(lang);
			parser = p;
			({ tree, treeLines } = parse(p, smarts));
			validateSmarts(smarts).then((r) => {
				smartsCheck = r;
			});
		} catch (/** @type {any} */ err) {
			loadError = err?.message ?? String(err);
		}
	});

	// ── Input handlers ─────────────────────────────────────────────────────
	/** @type {ReturnType<typeof setTimeout> | null} */
	let debounce = null;

	/** @param {Event} e */
	function onInput(e) {
		const el = /** @type {HTMLInputElement} */ (e.currentTarget);
		cursorPos = el.selectionStart ?? 0;
		if (debounce) clearTimeout(debounce);
		debounce = setTimeout(() => {
			if (parser) ({ tree, treeLines } = parse(parser, smarts));
			validateSmarts(smarts).then((r) => {
				smartsCheck = r;
			});
		}, 150);
	}

	/** @param {Event} e */
	function onCursorMove(e) {
		const el = /** @type {HTMLInputElement} */ (e.currentTarget);
		cursorPos = el.selectionStart ?? 0;
	}

	// ── Parser + tree builder ──────────────────────────────────────────────
	/**
	 * @param {Parser} p
	 * @param {string} input
	 * @returns {{ tree: import('web-tree-sitter').Tree, treeLines: TreeLine[] }}
	 */
	function parse(p, input) {
		const t = p.parse(input);
		if (!t) return { tree: /** @type {any} */ (null), treeLines: [] };
		const lines = /** @type {TreeLine[]} */ ([]);
		if (input.trim()) walkNode(t.rootNode, 0, lines, input);
		return { tree: t, treeLines: lines };
	}

	/**
	 * @param {import('web-tree-sitter').Node} node
	 * @param {number} depth
	 * @param {TreeLine[]} lines
	 * @param {string} src
	 */
	function walkNode(node, depth, lines, src) {
		const indent = '  '.repeat(depth);
		const text = src.slice(node.startIndex, node.endIndex);
		const range = `[${node.startPosition.row}:${node.startPosition.column}–${node.endPosition.column}]`;
		const isError = node.type === 'ERROR' || node.isMissing;

		let label;
		if (node.childCount === 0) {
			const marker = isError ? '⚠ ' : node.isNamed ? '' : '· ';
			label = `${indent}${marker}${node.isNamed ? node.type : JSON.stringify(text)} ${range} ${JSON.stringify(text)}`;
		} else {
			label = `${indent}${isError ? '⚠ ' : ''}${node.type} ${range}`;
		}

		lines.push({ text: label, nodeStart: node.startIndex, nodeEnd: node.endIndex, isError });

		for (const child of node.children) {
			walkNode(child, depth + 1, lines, src);
		}
	}

	/** @param {TreeLine} line */
	function isActive(line) {
		if (!activeNode) return false;
		return line.nodeStart === activeNode.startIndex && line.nodeEnd === activeNode.endIndex;
	}
</script>

<svelte:head>
	<title>SMARTS101 — Tree-sitter Test</title>
</svelte:head>

<div class="mx-auto flex max-w-[1400px] flex-col gap-4">
	<div class="flex flex-col gap-1">
		<h1 class="text-lg font-semibold">Tree-sitter Parse Test</h1>
		<p class="text-sm text-muted-foreground">
			Type a SMARTS string and move your cursor to highlight the matching parse-tree node.
		</p>
	</div>

	{#if loadError}
		<p
			class="rounded border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive"
		>
			Failed to load parser: {loadError}
		</p>
	{/if}

	<div class="flex items-center gap-2">
		<Input
			class="font-mono text-base"
			type="text"
			placeholder="e.g. [OH]c1ccccc1"
			bind:value={smarts}
			oninput={onInput}
			onclick={onCursorMove}
			onkeyup={onCursorMove}
			spellcheck={false}
			autocomplete="off"
			disabled={!parser && !loadError}
		/>
		{#if !showExplain}
			<button
				class="shrink-0 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
				onclick={() => (showExplain = true)}
			>
				Explain
			</button>
		{/if}
	</div>

	{#if !parser && !loadError}
		<p class="text-sm text-muted-foreground">Loading parser…</p>
	{/if}

	{#if treeLines.length > 0}
		<!-- Three-column layout: raw tree | explainer | structure SVG -->
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start">
			<!-- 1. Raw parse tree -->
			<pre
				class="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-muted px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre">{#each treeLines as line}<div
						class={[
							'-mx-1 rounded-sm px-1',
							line.isError && 'text-destructive',
							isActive(line) && 'bg-primary/15 font-semibold text-primary',
						]
							.filter(Boolean)
							.join(' ')}>{line.text}</div>{/each}</pre>

			<!-- 2. Explainer panel -->
			{#if showExplain}
				<ExplainPanel {smarts} {tree} {cursorPos} onclose={() => (showExplain = false)} />
			{/if}

			<!-- 3. SMARTS structure visualisation -->
			<div class="flex shrink-0 flex-col items-center gap-1 lg:w-[300px]">
				<span class="text-xs text-muted-foreground">Query structure</span>
				<div class="rounded-md border border-border bg-card">
					<SmartsQueryRenderer {smarts} width={300} height={220} />
				</div>
				{#if smartsCheck && !smartsCheck.valid && smartsCheck.errors.length}
					<pre class="w-full font-mono text-xs whitespace-pre-wrap text-destructive">{smartsCheck
							.errors[0]}</pre>
				{/if}
			</div>
		</div>
	{/if}
</div>
