/**
 * @typedef {{
 *   title: string,
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

/** @type {Record<string, NodeDoc>} */
export const NODE_DOCS = {
	// ── Top-level ────────────────────────────────────────────────────────────
	source_file: { title: 'Source file' },
	smarts: { title: 'expression' },
	reaction: { title: 'Reaction' },

	// ── Structure ────────────────────────────────────────────────────────────
	chain: { title: 'Chain' },
	atom: { title: 'Atom' },
	branch: { title: 'Branch' },
	component_group: { title: 'Component group' },

	// ── Simple atoms (outside brackets) ──────────────────────────────────────
	simple_atom: { title: 'Simple atom' },
	simple_atom_aliphatic: { title: 'Aliphatic atom' },
	simple_atom_aromatic: { title: 'Aromatic atom' },
	simple_atom_wildcard: { title: 'Wildcard' },
	simple_atom_query_A: { title: 'Aliphatic wildcard' },
	simple_atom_query_a: { title: 'Aromatic wildcard' },

	// ── Bracketed atom ────────────────────────────────────────────────────────
	bracketed_atom: { title: 'Atom' },
	isotope: { title: 'Isotope' },
	atom_map: { title: 'Atom map' },

	// ── Atom expression combinators ───────────────────────────────────────────
	atom_expr_and_im: { title: 'Implicit AND (adjacency)' },
	atom_expr_and_hi: { title: 'High-precedence AND' },
	atom_expr_and_lo: { title: 'Low-precedence AND' },
	atom_expr_or: { title: 'OR' },
	atom_expr_not: { title: 'NOT' },

	// ── Atom primitives ───────────────────────────────────────────────────────
	primitive_element: { title: 'Element symbol' },
	primitive_atomic_num: { title: 'Atomic number' },
	primitive_hybridization: { title: 'Hybridization' },
	primitive_degree: { title: 'Degree' },
	primitive_nonH_degree: { title: 'Non-H degree' },
	primitive_total_h: { title: 'Total H count' },
	primitive_implicit_h: { title: 'Implicit H count' },
	primitive_ring_membership: { title: 'Ring membership' },
	primitive_ring_size: { title: 'Ring size' },
	primitive_ring_size_ex: { title: 'Exact ring size' },
	primitive_valence: { title: 'Valence' },
	primitive_connectivity: { title: 'Connectivity' },
	primitive_ring_bond: { title: 'Ring bond count' },
	primitive_hetero_nbr: { title: 'Heteroatom neighbours' },
	primitive_aliph_hetero_nbr: { title: 'Aliphatic heteroatom neighbours' },
	primitive_charge_pos: { title: 'Positive charge' },
	primitive_charge_neg: { title: 'Negative charge' },
	primitive_chirality: { title: 'Chirality' },

	// ── Bonds ─────────────────────────────────────────────────────────────────
	bond_primitive: { title: 'Bond' },
	bond_expr_and_lo: { title: 'Bond low-AND' },
	bond_expr_or: { title: 'Bond OR' },
	bond_expr_and_hi: { title: 'Bond high-AND' },
	bond_expr_not: { title: 'Bond NOT' },
	bond_expr_and_im: { title: 'Bond implicit AND' },

	// ── Ring closure ──────────────────────────────────────────────────────────
	ring_closure: { title: 'Ring closure' },

	// ── Recursive SMARTS ──────────────────────────────────────────────────────
	recursive_query: { title: 'Recursive' },

	// ── Separators ────────────────────────────────────────────────────────────
	fragment_separator: { title: 'Fragment' },
	reaction_separator_gt: { title: 'Reaction' },

	// ── Error ─────────────────────────────────────────────────────────────────
	ERROR: { title: 'Parse error' },
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
	'-': { title: 'Single bond' },
	'=': { title: 'Double bond' },
	'#': { title: 'Triple bond' },
	':': { title: 'Aromatic bond' },
	'~': { title: 'Any bond' },
	'@': { title: 'Ring bond' },
	'/': { title: 'Directional bond up' },
	'\\': { title: 'Directional bond down' },
	$: { title: 'Quadruple bond' },
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
		} else {
			entries.push(...walkChainChildren(child, src));
		}
	}

	return entries;
}
