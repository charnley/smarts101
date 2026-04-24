/**
 * SMARTS node documentation and tree-walker for the regex101-style explainer.
 *
 * Exports:
 *   NODE_DOCS   – human-readable docs for every grammar node type
 *   buildExplainer(rootNode, src) – builds an ExplainerEntry[] from a parsed tree
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types (JSDoc only, no runtime cost)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   title: string,
 *   description: string,
 *   example?: string
 * }} NodeDoc
 */

/**
 * @typedef {{
 *   type: string,
 *   subtype?: string,
 *   text: string,
 *   startIndex: number,
 *   endIndex: number,
 *   doc: NodeDoc,
 *   children?: ExplainerEntry[]
 * }} ExplainerEntry
 */

// ─────────────────────────────────────────────────────────────────────────────
// NODE_DOCS
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, NodeDoc>} */
export const NODE_DOCS = {
	// ── Top-level ────────────────────────────────────────────────────────────
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

	// ── Structure ────────────────────────────────────────────────────────────
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
			'Zero-level parentheses that restrict all contained atoms to match within the same molecular component.',
		example: '(C.C)',
	},

	// ── Simple atoms (outside brackets) ──────────────────────────────────────
	simple_atom: {
		title: 'Simple atom',
		description:
			'An unbracketed atom from the organic subset or a query primitive (*, A, a). Matches any atom of that element regardless of charge or hydrogen count.',
		example: 'C  c  Cl  *',
	},
	// subtypes — used by buildExplainer to give a finer title
	simple_atom_aliphatic: {
		title: 'Aliphatic atom',
		description:
			'Unbracketed aliphatic organic-subset atom (B C N O P S F Cl Br I). Matches any atom of that element regardless of charge or hydrogen count.',
		example: 'C  Cl  Br',
	},
	simple_atom_aromatic: {
		title: 'Aromatic atom',
		description:
			'Unbracketed aromatic organic-subset atom (b c n o p s). Matches any aromatic atom of that element.',
		example: 'c  n  o',
	},
	simple_atom_wildcard: {
		title: 'Wildcard atom (*)',
		description: 'Matches any atom of any element.',
		example: '*',
	},
	simple_atom_query_A: {
		title: 'Aliphatic query (A)',
		description: 'Matches any aliphatic (non-aromatic) atom.',
		example: 'A',
	},
	simple_atom_query_a: {
		title: 'Aromatic query (a)',
		description: 'Matches any aromatic atom.',
		example: 'a',
	},

	// ── Bracketed atom ────────────────────────────────────────────────────────
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

	// ── Atom expression combinators ───────────────────────────────────────────
	atom_expr_and_im: {
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

	// ── Atom primitives ───────────────────────────────────────────────────────
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
		example: '[Si]  [Fe]  [as]  [se]',
	},
	primitive_atomic_num: {
		title: 'Atomic number (#n)',
		description: 'Matches an atom by its atomic number.',
		example: '[#6]  — any carbon (atomic number 6)',
	},
	primitive_hybridization: {
		title: 'Hybridization (^n)',
		description: 'Matches atoms with a specific hybridization state (0=s, 1=sp, 2=sp2, 3=sp3…).',
		example: '[^2]  — sp2 atom',
	},
	primitive_degree: {
		title: 'Degree (Dn)',
		description:
			'Matches atoms with exactly n explicit connections (implicit H not counted). D alone means exactly 1.',
		example: '[D3]  — atom with 3 explicit bonds',
	},
	primitive_nonH_degree: {
		title: 'Non-H degree (dn)',
		description: 'Matches atoms with exactly n non-hydrogen connections. d alone means exactly 1.',
		example: '[d2]  — 2 non-H neighbours',
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
	primitive_ring_size_ex: {
		title: 'Exact ring size (kn)',
		description: 'Matches an atom whose exact ring size is n. k alone matches any ring atom.',
		example: '[k6]  — in exactly a 6-membered ring',
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
	primitive_ring_bond: {
		title: 'Ring bond count (xn)',
		description: 'Matches atoms with exactly n ring bonds. x alone means at least 1 ring bond.',
		example: '[x2]  — 2 ring bonds (typical ring atom)',
	},
	primitive_hetero_nbr: {
		title: 'Heteroatom neighbours (zn)',
		description:
			'Matches atoms with exactly n heteroatom (non-C, non-H) neighbours. z alone means at least 1.',
		example: '[z1]  — one heteroatom neighbour',
	},
	primitive_aliph_hetero_nbr: {
		title: 'Aliphatic heteroatom neighbours (Zn)',
		description: 'Matches atoms with exactly n aliphatic heteroatom neighbours.',
		example: '[Z1]',
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

	// ── Bonds ─────────────────────────────────────────────────────────────────
	bond_primitive: {
		title: 'Bond',
		description:
			'Specifies the bond type between two atoms. ' +
			'- single  |  = double  |  # triple  |  : aromatic  |  ~ any  |  @ any ring bond  |  / up  |  \\ down  |  /? up-or-unspecified  |  \\? down-or-unspecified.',
		example: 'C=O  C:C  C~N',
	},
	bond_expr_and_lo: {
		title: 'Bond low-AND (;)',
		description: 'Bond must satisfy both conditions. Low precedence.',
		example: 'C-;@C  — single ring bond',
	},
	bond_expr_or: {
		title: 'Bond OR (,)',
		description: 'Bond must satisfy either condition.',
		example: 'C-,=C',
	},
	bond_expr_and_hi: {
		title: 'Bond high-AND (&)',
		description: 'Bond must satisfy both conditions. High precedence.',
		example: 'C=&@C',
	},
	bond_expr_not: {
		title: 'Bond NOT (!)',
		description: 'Negation of the following bond condition.',
		example: 'C!=C',
	},
	bond_expr_and_im: {
		title: 'Bond implicit AND',
		description: 'Two bond primitives written next to each other — implicit high-precedence AND.',
		example: 'C-@C',
	},

	// ── Ring closure ──────────────────────────────────────────────────────────
	ring_closure: {
		title: 'Ring closure',
		description:
			'A digit (1–9) or %nn (10–99) that opens or closes a ring. Two atoms sharing the same label are bonded together. An optional bond symbol before the digit specifies the ring bond type.',
		example: 'c1ccccc1  — benzene ring  |  C%12CC%12',
	},

	// ── Recursive SMARTS ──────────────────────────────────────────────────────
	recursive_query: {
		title: 'Recursive SMARTS $(...)',
		description:
			'Matches atoms that belong to a substructure defined by the inner SMARTS pattern. ' +
			'The query atom must be part of a match of the inner pattern within the molecule. ' +
			'Expand to inspect the inner pattern.',
		example: '[$(c1ccccc1)]  — atom that is part of a benzene ring',
	},

	// ── Separators ────────────────────────────────────────────────────────────
	fragment_separator: {
		title: 'Fragment separator (.)',
		description:
			'Separates two disconnected fragments. Both fragments must be present in the same molecule (unless inside component groups).',
		example: 'C.O  — molecule containing both a carbon and an oxygen fragment',
	},
	reaction_separator_gt: {
		title: 'Reaction arrow (>)',
		description:
			'Separates reactants, agents, and products in a reaction SMARTS. The format is reactants > agents > products.',
		example: 'C>>O',
	},

	// ── Error ─────────────────────────────────────────────────────────────────
	ERROR: {
		title: 'Parse error',
		description:
			'This part of the input could not be parsed. Check for invalid characters or incomplete expressions.',
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// Subtype helpers
// ─────────────────────────────────────────────────────────────────────────────

const AROMATIC_SIMPLE = new Set(['b', 'c', 'n', 'o', 'p', 's']);
const ALIPHATIC_SIMPLE = new Set(['B', 'C', 'N', 'O', 'P', 'S', 'F', 'I', 'Cl', 'Br']);

/**
 * Given the matched text of a `simple_atom` node, return the subtype key.
 * @param {string} text
 * @returns {string}
 */
function simpleAtomSubtype(text) {
	if (text === '*') return 'simple_atom_wildcard';
	if (text === 'A') return 'simple_atom_query_A';
	if (text === 'a') return 'simple_atom_query_a';
	if (AROMATIC_SIMPLE.has(text)) return 'simple_atom_aromatic';
	if (ALIPHATIC_SIMPLE.has(text)) return 'simple_atom_aliphatic';
	return 'simple_atom';
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-bond-primitive docs
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, NodeDoc>} */
const BOND_DOCS = {
	'-': {
		title: 'Single bond (-)',
		description:
			'Matches an explicit single bond only. Note: an implicit bond (no symbol) matches single OR aromatic, so - is stricter — it will not match aromatic bonds.',
		example: 'C-C  — explicit single bond between two aliphatic carbons',
	},
	'=': {
		title: 'Double bond (=)',
		description: 'Matches a double bond.',
		example: 'C=O  — carbonyl',
	},
	'#': {
		title: 'Triple bond (#)',
		description: 'Matches a triple bond.',
		example: 'C#N  — nitrile',
	},
	':': {
		title: 'Aromatic bond (:)',
		description:
			'Matches an aromatic bond. Use between aromatic atoms inside or outside brackets. Also used as the ring-bond type prefix in ring closures.',
		example: 'c:c  — aromatic C–C bond',
	},
	'~': {
		title: 'Any bond (~)',
		description: 'Wildcard — matches any bond type (single, double, triple, aromatic, etc.).',
		example: 'C~N  — carbon connected to nitrogen by any bond',
	},
	'@': {
		title: 'Ring bond (@)',
		description: 'Matches any bond that is part of a ring (i.e. a ring bond).',
		example: 'C@C  — two ring atoms connected by a ring bond',
	},
	'/': {
		title: 'Directional bond up (/)',
		description:
			'Matches a bond with up (/) stereodirection. Used for E/Z double-bond stereo queries.',
		example: 'F/C=C/F  — E-difluoroethylene',
	},
	'\\': {
		title: 'Directional bond down (\\)',
		description:
			'Matches a bond with down (\\) stereodirection. Used for E/Z double-bond stereo queries.',
		example: 'F/C=C\\F  — Z-difluoroethylene',
	},
	'/?': {
		title: 'Directional bond up or unspecified (/?)',
		description:
			'Matches a bond with up (/) stereodirection OR with unspecified direction. Useful when stereo may or may not be defined.',
		example: 'F/?C=C/?F',
	},
	'\\?': {
		title: 'Directional bond down or unspecified (\\?)',
		description: 'Matches a bond with down (\\) stereodirection OR with unspecified direction.',
		example: 'F\\?C=C\\?F',
	},
	$: {
		title: 'Quadruple bond ($)',
		description: 'Matches a quadruple bond (rare; used for metal complexes).',
		example: '[Mo]$[Mo]',
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// Tree walker
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Node types whose children we want to recurse into at the top level.
 * Everything else is treated as a leaf or handled specially.
 */
const RECURSE_TYPES = new Set([
	'source_file',
	'smarts',
	'reaction',
	'chain',
	'atom',
	'component_group',
]);

/**
 * Node types that produce a leaf ExplainerEntry directly.
 */
const LEAF_TYPES = new Set([
	'simple_atom',
	'ring_closure',
	'bond_primitive',
	'bond_expr',
	'bond_expr_and_lo',
	'bond_expr_or',
	'bond_expr_and_hi',
	'bond_expr_not',
	'bond_expr_and_im',
	'ERROR',
]);

/**
 * Return an ERROR ExplainerEntry for a node, or null if not an error.
 * @param {import('web-tree-sitter').Node} node
 * @param {string} src
 * @returns {ExplainerEntry | null}
 */
function errorEntry(node, src) {
	if (node.type !== 'ERROR' && !node.isMissing) return null;
	return {
		type: 'ERROR',
		text: src.slice(node.startIndex, node.endIndex) || '?',
		startIndex: node.startIndex,
		endIndex: node.endIndex,
		doc: NODE_DOCS['ERROR'],
	};
}

/**
 * Walk the children of a bracketed_atom to produce child ExplainerEntries
 * (isotope, atom expression primitives, atom_map).
 *
 * @param {import('web-tree-sitter').Node} bracketedNode
 * @param {string} src
 * @returns {ExplainerEntry[]}
 */
function walkBracketedAtomChildren(bracketedNode, src) {
	/** @type {ExplainerEntry[]} */
	const entries = [];
	for (const child of bracketedNode.children) {
		if (!child.isNamed) continue; // skip '[', ']' punctuation
		const childText = src.slice(child.startIndex, child.endIndex);
		const entry = nodeToEntry(child, childText, src);
		if (entry) entries.push(entry);
	}
	return entries;
}

/**
 * Convert a single tree-sitter node to an ExplainerEntry (or null if we
 * should skip it).
 *
 * @param {import('web-tree-sitter').Node} node
 * @param {string} text
 * @param {string} src
 * @returns {ExplainerEntry | null}
 */
function nodeToEntry(node, text, src) {
	const type = node.type;

	// ── simple_atom: classify subtype ──────────────────────────────────────
	if (type === 'simple_atom') {
		const subtype = simpleAtomSubtype(text);
		const doc = NODE_DOCS[subtype] ?? NODE_DOCS['simple_atom'];
		return { type, subtype, text, startIndex: node.startIndex, endIndex: node.endIndex, doc };
	}

	// ── bracketed_atom: recurse for children ───────────────────────────────
	if (type === 'bracketed_atom') {
		const doc = NODE_DOCS['bracketed_atom'];
		const children = walkAtomExprChildren(node, src);
		return {
			type,
			text,
			startIndex: node.startIndex,
			endIndex: node.endIndex,
			doc,
			children: children.length ? children : undefined,
		};
	}

	// ── bond_primitive: use per-bond doc ───────────────────────────────────
	if (type === 'bond_primitive') {
		const doc = BOND_DOCS[text] ?? NODE_DOCS['bond_primitive'];
		return { type, text, startIndex: node.startIndex, endIndex: node.endIndex, doc };
	}

	// ── bond_expr_*: flatten to children if possible ───────────────────────
	if (type.startsWith('bond_expr')) {
		const doc = NODE_DOCS[type] ?? NODE_DOCS['bond_primitive'];
		// If this is a simple wrapper around a single bond_primitive, just show
		// the primitive to avoid redundant nesting.
		const namedChildren = node.children.filter(
			(/** @type {import('web-tree-sitter').Node} */ c) => c.isNamed,
		);
		if (namedChildren.length === 1 && namedChildren[0].type === 'bond_primitive') {
			return nodeToEntry(
				namedChildren[0],
				src.slice(namedChildren[0].startIndex, namedChildren[0].endIndex),
				src,
			);
		}
		return { type, text, startIndex: node.startIndex, endIndex: node.endIndex, doc };
	}

	// ── ring_closure ────────────────────────────────────────────────────────
	if (type === 'ring_closure') {
		const doc = NODE_DOCS['ring_closure'];
		return { type, text, startIndex: node.startIndex, endIndex: node.endIndex, doc };
	}

	// ── recursive_query ─────────────────────────────────────────────────────
	if (type === 'recursive_query') {
		const doc = NODE_DOCS['recursive_query'];
		// Walk the inner smarts node fully so its atoms/bonds/branches appear
		// as indented children in the explainer panel.
		const smartsChild = node.children.find((c) => c.isNamed && c.type === 'smarts');
		const children = smartsChild ? walkChainChildren(smartsChild, src) : [];
		return {
			type,
			text,
			startIndex: node.startIndex,
			endIndex: node.endIndex,
			doc,
			children: children.length ? children : undefined,
		};
	}

	// ── branch: recurse into inner chain ───────────────────────────────────
	if (type === 'branch') {
		const doc = NODE_DOCS['branch'];
		const children = walkChainChildren(node, src);
		return {
			type,
			text,
			startIndex: node.startIndex,
			endIndex: node.endIndex,
			doc,
			children: children.length ? children : undefined,
		};
	}

	// ── isotope, atom_map ────────────────────────────────────────────────────
	if (type === 'isotope' || type === 'atom_map') {
		const doc = NODE_DOCS[type];
		if (doc) return { type, text, startIndex: node.startIndex, endIndex: node.endIndex, doc };
	}

	// ── atom_expr_* combinators ──────────────────────────────────────────────
	if (type.startsWith('atom_expr')) {
		const doc = NODE_DOCS[type];
		if (doc) {
			const children = walkAtomExprChildren(node, src);
			return {
				type,
				text,
				startIndex: node.startIndex,
				endIndex: node.endIndex,
				doc,
				children: children.length ? children : undefined,
			};
		}
	}

	// ── named primitives ─────────────────────────────────────────────────────
	if (type.startsWith('primitive_')) {
		const doc = NODE_DOCS[type];
		if (doc) return { type, text, startIndex: node.startIndex, endIndex: node.endIndex, doc };
	}

	// ── ERROR ────────────────────────────────────────────────────────────────
	if (type === 'ERROR' || node.isMissing) {
		return {
			type: 'ERROR',
			text,
			startIndex: node.startIndex,
			endIndex: node.endIndex,
			doc: NODE_DOCS['ERROR'],
		};
	}

	return null;
}

/**
 * Walk the children of an atom_expr node, producing flat ExplainerEntries.
 * For compound expressions (and/or/not) we flatten into a list of primitives
 * at this stage to keep the display simple; we iterate later if nesting is needed.
 *
 * @param {import('web-tree-sitter').Node} node
 * @param {string} src
 * @returns {ExplainerEntry[]}
 */
function walkAtomExprChildren(node, src) {
	/** @type {ExplainerEntry[]} */
	const entries = [];

	for (const child of node.children) {
		// Always surface ERROR nodes, even unnamed ones
		const err = errorEntry(child, src);
		if (err) {
			entries.push(err);
			continue;
		}

		if (!child.isNamed) continue; // skip '[', ']', punctuation operators
		const childText = src.slice(child.startIndex, child.endIndex);

		// Recurse into nested atom_expr combinators to flatten primitives
		if (child.type.startsWith('atom_expr')) {
			entries.push(...walkAtomExprChildren(child, src));
			continue;
		}

		const entry = nodeToEntry(child, childText, src);
		if (entry) entries.push(entry);
	}
	return entries;
}

/**
 * Walk the children of a chain/branch/atom node, returning top-level entries
 * for each bond, simple_atom, bracketed_atom, ring_closure, and branch.
 *
 * @param {import('web-tree-sitter').Node} node
 * @param {string} src
 * @returns {ExplainerEntry[]}
 */
function walkChainChildren(node, src) {
	/** @type {ExplainerEntry[]} */
	const entries = [];

	for (const child of node.children) {
		// Always surface ERROR nodes first
		const err = errorEntry(child, src);
		if (err) {
			entries.push(err);
			continue;
		}

		// Dot fragment separator inside a smarts node
		if (!child.isNamed && child.type === '.' && node.type === 'smarts') {
			entries.push({
				type: 'fragment_separator',
				text: '.',
				startIndex: child.startIndex,
				endIndex: child.endIndex,
				doc: NODE_DOCS['fragment_separator'],
			});
			continue;
		}

		if (!child.isNamed) continue;
		const childText = src.slice(child.startIndex, child.endIndex);

		if (child.type === 'atom') {
			entries.push(...walkAtomChildren(child, src));
			continue;
		}
		if (RECURSE_TYPES.has(child.type)) {
			entries.push(...walkChainChildren(child, src));
			continue;
		}

		const entry = nodeToEntry(child, childText, src);
		if (entry) entries.push(entry);
	}
	return entries;
}

/**
 * Walk the children of an `atom` node: its _atom_core (simple or bracketed),
 * plus any ring_closures and branches.
 *
 * @param {import('web-tree-sitter').Node} atomNode
 * @param {string} src
 * @returns {ExplainerEntry[]}
 */
function walkAtomChildren(atomNode, src) {
	/** @type {ExplainerEntry[]} */
	const entries = [];

	for (const child of atomNode.children) {
		// Always surface ERROR nodes first
		const err = errorEntry(child, src);
		if (err) {
			entries.push(err);
			continue;
		}

		if (!child.isNamed) continue;
		const childText = src.slice(child.startIndex, child.endIndex);
		const entry = nodeToEntry(child, childText, src);
		if (entry) entries.push(entry);
	}
	return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a flat-ish list of ExplainerEntry objects from a parsed tree.
 * Entries are in source order. Grouped nodes (bracketed_atom, branch) carry
 * a `children` array.
 *
 * @param {import('web-tree-sitter').Node} rootNode
 * @param {string} src
 * @returns {ExplainerEntry[]}
 */
export function buildExplainer(rootNode, src) {
	if (!src.trim()) return [];

	/** @type {ExplainerEntry[]} */
	const entries = [];

	// Handle reaction vs plain smarts at the top level
	for (const child of rootNode.children) {
		// Surface ERROR nodes at the top level (e.g. "CH" → C parses fine, H is an ERROR sibling)
		const err = errorEntry(child, src);
		if (err) {
			entries.push(err);
			continue;
		}
		if (!child.isNamed) continue;

		if (child.type === 'reaction') {
			// Walk reactants / agents / products, emitting > separators between them
			for (const part of child.children) {
				if (!part.isNamed) {
					// unnamed '>' separator
					if (part.type === '>') {
						entries.push({
							type: 'reaction_separator_gt',
							text: '>',
							startIndex: part.startIndex,
							endIndex: part.endIndex,
							doc: NODE_DOCS['reaction_separator_gt'],
						});
					}
					continue;
				}
				entries.push(...walkChainChildren(part, src));
			}
		} else if (child.type === 'smarts') {
			entries.push(...walkChainChildren(child, src));
		} else {
			entries.push(...walkChainChildren(child, src));
		}
	}

	return entries;
}
