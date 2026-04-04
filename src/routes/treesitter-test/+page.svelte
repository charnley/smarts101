<script>
	import { onMount } from 'svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import SmartsQueryRenderer from '$lib/components/SmartsQueryRenderer.svelte';
	import { validateSmarts } from '$lib/rdkit/utils.js';
	import { Parser, Language } from 'web-tree-sitter';
	import smartsWasmUrl from '$lib/grammar-smarts/tree-sitter-smarts.wasm?url';
	import coreWasmUrl from 'web-tree-sitter/web-tree-sitter.wasm?url';

	/**
	 * @typedef {{ text: string, nodeStart: number, nodeEnd: number, isError: boolean }} TreeLine
	 */

	/**
	 * @typedef {{ title: string, description: string, example?: string }} NodeDoc
	 */

	// ── Node documentation map ─────────────────────────────────────────────
	/** @type {Record<string, NodeDoc>} */
	const NODE_DOCS = {
		// Top-level
		source_file: {
			title: 'Source file',
			description:
				'The root of the parse tree. Contains either a plain SMARTS expression or a reaction SMARTS.',
		},
		smarts: {
			title: 'SMARTS expression',
			description: 'A molecular pattern made of one or more dot-separated fragments.',
			example: '[OH]c1ccccc1',
		},
		reaction: {
			title: 'Reaction SMARTS',
			description: 'A reaction query with reactants, agents, and products separated by >.',
			example: 'C(=O)O.OCC>>C(=O)OCC.O',
		},

		// Structure
		chain: {
			title: 'Chain',
			description: 'A linear sequence of atoms connected by explicit or implicit bonds.',
			example: 'CCO',
		},
		atom: {
			title: 'Atom',
			description: 'An atom with optional ring-closure digits and branches attached to it.',
			example: 'C(=O)',
		},
		branch: {
			title: 'Branch',
			description:
				'A sub-chain in parentheses that diverges from the main chain and reconnects at the same atom.',
			example: 'C(=O)O',
		},
		component_group: {
			title: 'Component group',
			description:
				'Zero-level parentheses that restrict all contained atoms to match within the same molecular component (used in reaction queries to distinguish inter- vs intramolecular matches).',
			example: '(C.C)',
		},

		// Atoms
		organic_atom: {
			title: 'Organic atom',
			description:
				'An unbracketed atom from the organic subset (B C N O P S F Cl Br I and their aromatic equivalents b c n o p s). Matches any atom of that element regardless of charge or hydrogen count.',
			example: 'C  c  Cl',
		},
		wildcard_atom: {
			title: 'Wildcard atom',
			description: 'Matches any atom of any element.',
			example: '*',
		},
		bracketed_atom: {
			title: 'Bracketed atom',
			description:
				'An atom expression enclosed in [ ] that can specify multiple properties with logical operators.',
			example: '[C@@H]  [#6]  [n;H1]',
		},
		isotope: {
			title: 'Isotope',
			description:
				'An integer mass prefix inside brackets that restricts the match to a specific isotope.',
			example: '[35Cl]  [2H]',
		},
		atom_map: {
			title: 'Atom map',
			description:
				'A :n label inside brackets that associates an atom across a reaction SMARTS, linking a reactant atom to the corresponding product atom.',
			example: '[C:1]>>[C:1]O',
		},

		// Atom expressions (logical combinators)
		atom_expr_implicit_and: {
			title: 'Implicit AND (adjacency)',
			description:
				'Two primitives written next to each other are combined with a high-precedence AND. Both conditions must be true.',
			example: '[CH2]  — C with exactly 2 hydrogens',
		},
		atom_expr_and_hi: {
			title: 'High-precedence AND (&)',
			description:
				'Explicit & operator. Both conditions must be true. Binds more tightly than , and ;.',
			example: '[X3&H0]  — 3 connections and no hydrogens',
		},
		atom_expr_and_lo: {
			title: 'Low-precedence AND (;)',
			description:
				'Semicolon AND operator. Both conditions must be true. Binds less tightly than , so it groups across OR expressions.',
			example: '[c,n;H1]  — (aromatic C or aromatic N) with exactly 1 H',
		},
		atom_expr_or: {
			title: 'OR (,)',
			description: 'Comma OR operator. The atom matches if either condition is true.',
			example: '[C,N]  — aliphatic carbon or aliphatic nitrogen',
		},
		atom_expr_not: {
			title: 'NOT (!)',
			description: 'Negation. The atom matches only if the following condition is false.',
			example: '[!C;R]  — not an aliphatic carbon, and in a ring',
		},

		// Atomic primitives
		primitive_wildcard: {
			title: 'Wildcard primitive (*)',
			description: 'Matches any atom inside a bracketed expression.',
			example: '[*H2]  — any atom with exactly 2 hydrogens',
		},
		primitive_aromatic: {
			title: 'Aromatic primitive (a)',
			description: 'Matches any aromatic atom.',
			example: '[a]',
		},
		primitive_aliphatic: {
			title: 'Aliphatic primitive (A)',
			description: 'Matches any aliphatic (non-aromatic) atom.',
			example: '[A]',
		},
		primitive_element: {
			title: 'Element symbol',
			description: 'Matches a specific element. Uppercase = aliphatic, lowercase = aromatic.',
			example: '[C]  [c]  [Ca]',
		},
		primitive_atomic_num: {
			title: 'Atomic number (#n)',
			description: 'Matches an atom by its atomic number.',
			example: '[#6]  — any carbon (atomic number 6)',
		},
		primitive_degree: {
			title: 'Degree (Dn)',
			description:
				'Matches atoms with exactly n explicit connections (implicit H not counted). D alone means exactly 1.',
			example: '[D3]  — atom with 3 explicit bonds',
		},
		primitive_total_h: {
			title: 'Total H count (Hn)',
			description:
				'Matches atoms with exactly n attached hydrogens (explicit + implicit). H alone means exactly 1.',
			example: '[H2]  — atom with 2 hydrogens',
		},
		primitive_implicit_h: {
			title: 'Implicit H count (hn)',
			description: 'Matches atoms with exactly n implicit hydrogens. h alone means at least 1.',
			example: '[h1]  — atom with 1 implicit hydrogen',
		},
		primitive_ring_membership: {
			title: 'Ring membership (Rn)',
			description:
				'R alone matches any ring atom. Rn matches an atom that is in exactly n SSSR rings.',
			example: '[R]  — in any ring  |  [R2]  — at a ring fusion',
		},
		primitive_ring_size: {
			title: 'Ring size (rn)',
			description:
				'Matches an atom whose smallest containing ring has exactly n members. r alone matches any ring atom.',
			example: '[r5]  — in a 5-membered ring',
		},
		primitive_valence: {
			title: 'Valence (vn)',
			description:
				'Matches atoms whose total bond order equals n (including implicit H bonds). v alone means exactly 1.',
			example: '[v4]  — sp3 carbon',
		},
		primitive_connectivity: {
			title: 'Connectivity (Xn)',
			description:
				'Matches atoms with exactly n total connections (explicit bonds + implicit H). X alone means exactly 1.',
			example: '[X4]  — 4 total connections',
		},
		primitive_ring_connectivity: {
			title: 'Ring connectivity (xn)',
			description: 'Matches atoms with exactly n ring bonds. x alone means at least 1 ring bond.',
			example: '[x2]  — 2 ring bonds (typical ring atom)',
		},
		primitive_charge_pos: {
			title: 'Positive charge (+)',
			description: '+n matches a specific positive charge; ++ means +2, etc. + alone means +1.',
			example: '[+]  — charge +1  |  [+2]  — charge +2',
		},
		primitive_charge_neg: {
			title: 'Negative charge (-)',
			description: '-n matches a specific negative charge; -- means -2, etc. - alone means -1.',
			example: '[-]  — charge -1  |  [--]  — charge -2',
		},
		primitive_chirality: {
			title: 'Chirality (@ / @@)',
			description:
				'@ means anticlockwise (S-like) and @@ means clockwise (R-like) chirality. Append ? to also accept unspecified chirality.',
			example: '[C@@H]  [C@?H]',
		},

		// Bond
		bond: {
			title: 'Bond',
			description:
				'Specifies the bond type between two atoms. ' +
				'- single  |  = double  |  # triple  |  : aromatic  |  ~ any  |  @ any ring bond  |  / up  |  \\ down  |  /? up-or-unspecified  |  \\? down-or-unspecified. ' +
				'A missing bond between two atoms matches single or aromatic.',
			example: 'C=O  C:C  C~N',
		},

		// Ring closure
		ring_closure: {
			title: 'Ring closure',
			description:
				'A digit (1–9) or %nn (10–99) that opens or closes a ring. Two atoms sharing the same label are bonded together. An optional bond symbol before the digit specifies the ring bond type.',
			example: 'c1ccccc1  — benzene ring  |  C%12CC%12',
		},

		// Recursive SMARTS
		recursive_smarts: {
			title: 'Recursive SMARTS $(...)',
			description:
				'Defines an atomic environment as a sub-SMARTS starting from the atom of interest. Can be nested and combined with other primitives using logical operators.',
			example: '[$([OH]c1ccccc1)]  — phenolic OH',
		},

		// Error
		ERROR: {
			title: 'Parse error',
			description:
				'This part of the input could not be parsed. Check for invalid characters or incomplete expressions.',
		},
	};

	/**
	 * Walk up the ancestor chain of a node and return a flat array from root → node.
	 * @param {import('web-tree-sitter').SyntaxNode} node
	 * @returns {import('web-tree-sitter').SyntaxNode[]}
	 */
	function ancestors(node) {
		const path = [];
		/** @type {import('web-tree-sitter').SyntaxNode | null} */
		let cur = node;
		while (cur) {
			path.unshift(cur);
			cur = cur.parent;
		}
		return path;
	}

	/**
	 * Given the active node, derive the explanation to show.
	 * Walk up to find the first ancestor that has docs, so even anonymous
	 * punctuation nodes get a useful explanation from their named parent.
	 * @param {import('web-tree-sitter').SyntaxNode | null} node
	 * @param {string} src
	 * @returns {{ doc: NodeDoc, node: import('web-tree-sitter').SyntaxNode, src: string, breadcrumb: string[] } | null}
	 */
	function explain(node, src) {
		if (!node) return null;
		// Walk from the node upward until we find a doc entry
		/** @type {import('web-tree-sitter').SyntaxNode | null} */
		let cur = node;
		while (cur) {
			const doc = NODE_DOCS[cur.type];
			if (doc) {
				const crumb = ancestors(cur)
					.filter((n) => n.isNamed)
					.map((n) => n.type);
				return {
					doc,
					node: cur,
					src: src.slice(cur.startIndex, cur.endIndex),
					breadcrumb: crumb,
				};
			}
			cur = cur.parent;
		}
		return null;
	}

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

	let activeNode = $derived.by(() => {
		if (!tree) return null;
		try {
			return tree.rootNode.descendantForIndex(cursorPos);
		} catch {
			return null;
		}
	});

	let explanation = $derived(explain(activeNode, smarts));

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
		const lines = /** @type {TreeLine[]} */ ([]);
		if (input.trim()) walkNode(t.rootNode, 0, lines, input);
		return { tree: t, treeLines: lines };
	}

	/**
	 * @param {import('web-tree-sitter').SyntaxNode} node
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

<div class="mx-auto flex max-w-[1200px] flex-col gap-4">
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

	{#if !parser && !loadError}
		<p class="text-sm text-muted-foreground">Loading parser…</p>
	{/if}

	{#if treeLines.length > 0}
		<!-- Two-column layout on wide screens: tree left, structure right -->
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start">
			<!-- Parse tree -->
			<pre
				class="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-muted px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre">{#each treeLines as line}<div
						class={[
							'-mx-1 rounded-sm px-1',
							line.isError && 'text-destructive',
							isActive(line) && 'bg-primary/15 font-semibold text-primary',
						]
							.filter(Boolean)
							.join(' ')}>{line.text}</div>{/each}</pre>

			<!-- SMARTS structure visualisation -->
			<div class="flex shrink-0 flex-col items-center gap-1 lg:w-[300px]">
				<span class="text-xs text-muted-foreground">Query structure</span>
				<div class="rounded-md border border-border bg-card">
					<SmartsQueryRenderer {smarts} width={300} height={220} />
				</div>
				{#if smartsCheck && !smartsCheck.valid && smartsCheck.errors.length}
					<p class="w-full font-mono text-xs text-destructive">{smartsCheck.errors[0]}</p>
				{/if}
			</div>
		</div>

		<!-- Explanation box -->
		<div class="rounded-md border border-border bg-card px-4 py-3 text-sm">
			{#if explanation}
				{@const { doc, node, src: nodeSrc, breadcrumb } = explanation}

				<!-- Breadcrumb -->
				<div class="mb-2 flex flex-wrap items-center gap-1 font-mono text-xs text-muted-foreground">
					{#each breadcrumb as crumb, i}
						{#if i > 0}<span class="opacity-40">›</span>{/if}
						<span class={crumb === node.type ? 'font-semibold text-foreground' : ''}>{crumb}</span>
					{/each}
				</div>

				<!-- Title + matched text -->
				<div class="mb-1 flex flex-wrap items-baseline gap-2">
					<span class="font-semibold text-foreground">{doc.title}</span>
					<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary"
						>{nodeSrc}</code
					>
				</div>

				<!-- Description -->
				<p class="text-muted-foreground">{doc.description}</p>

				<!-- Example -->
				{#if doc.example}
					<p class="mt-1.5 text-xs text-muted-foreground">
						<span class="font-medium text-foreground">Example:</span>
						<code class="font-mono">{doc.example}</code>
					</p>
				{/if}
			{:else}
				<p class="text-muted-foreground">
					Move the cursor into the SMARTS string to see an explanation of the token under the
					cursor.
				</p>
			{/if}
		</div>
	{/if}
</div>
