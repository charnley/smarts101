import { aromaticElementName, elementNameByNumber, elementNameBySymbol } from './elements.js';

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
	bond_expr: { title: 'Bond query' },
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
// Value-aware titles
//
// Titles spell out what the primitive means, e.g. "Aliphatic Carbon" or
// "Atom in exactly 6-sized ring", instead of a generic label per node type.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ kind: 'exact', n: number }
 *   | { kind: 'range', lo: number | null, hi: number | null }} Quantity
 */

/** @type {Quantity} */
const EXACTLY_ONE = { kind: 'exact', n: 1 };
/** @type {Quantity} */
const AT_LEAST_ONE = { kind: 'range', lo: 1, hi: null };

/**
 * Meaning of a primitive written without a number (e.g. `D`, `R`, `+`).
 * Keep in sync with the how-to-smarts page (src/routes/how-to-smarts/+page.svelte):
 * Hydrogen Count, Degree and Connectivity, Ring Membership, Formal Charge,
 * Heteroatom Neighbors.
 *
 * @type {Record<string, Quantity>}
 */
export const BARE_DEFAULTS = {
	primitive_degree: EXACTLY_ONE, // D
	primitive_nonH_degree: EXACTLY_ONE, // d
	primitive_connectivity: EXACTLY_ONE, // X
	primitive_valence: EXACTLY_ONE, // v
	primitive_total_h: EXACTLY_ONE, // H
	primitive_implicit_h: AT_LEAST_ONE, // h
	primitive_ring_membership: AT_LEAST_ONE, // R
	primitive_ring_size: AT_LEAST_ONE, // r
	primitive_ring_size_ex: AT_LEAST_ONE, // k
	primitive_ring_bond: AT_LEAST_ONE, // x
	primitive_hetero_nbr: AT_LEAST_ONE, // z
	primitive_aliph_hetero_nbr: AT_LEAST_ONE, // Z
	primitive_charge_pos: EXACTLY_ONE, // +
	primitive_charge_neg: EXACTLY_ONE, // -
};

/**
 * Parse the value part of a numeric primitive.
 * `rest` is the text after the leading letter: '', '3', '{2-4}', '{2-}', '{-4}'.
 *
 * @param {string} rest
 * @param {Quantity | undefined} bareDefault
 * @returns {Quantity | null}
 */
function parseQuantity(rest, bareDefault) {
	if (rest === '') return bareDefault ?? null;
	if (/^[0-9]+$/.test(rest)) return { kind: 'exact', n: Number(rest) };
	const m = /^\{([0-9]*)-([0-9]*)\}$/.exec(rest);
	if (!m || (m[1] === '' && m[2] === '')) return null;
	return {
		kind: 'range',
		lo: m[1] === '' ? null : Number(m[1]),
		hi: m[2] === '' ? null : Number(m[2]),
	};
}

/** @param {Quantity} q */
function isAny(q) {
	return q.kind === 'range' && q.lo === 1 && q.hi === null;
}

/**
 * "exactly 3 explicit connections", "between 2 and 4 ...", "at least 2 ...", "at most 3 ...".
 *
 * @param {Quantity} q
 * @param {[string, string]} [unit]  singular and plural noun
 * @returns {string}
 */
function quantityPhrase(q, unit) {
	/** @param {number} n */
	const noun = (n) => (unit ? ` ${n === 1 ? unit[0] : unit[1]}` : '');
	if (q.kind === 'exact') return `exactly ${q.n}${noun(q.n)}`;
	if (q.lo !== null && q.hi !== null) return `between ${q.lo} and ${q.hi}${noun(q.hi)}`;
	if (q.lo !== null) return `at least ${q.lo}${noun(q.lo)}`;
	return `at most ${q.hi}${noun(/** @type {number} */ (q.hi))}`;
}

/**
 * Like quantityPhrase, but an exact value is written bare ("5", not "exactly 5").
 * @param {Quantity} q
 */
function sizePhrase(q) {
	return q.kind === 'exact' ? String(q.n) : quantityPhrase(q);
}

/**
 * Title builders for numeric primitives, keyed by node type.
 * @type {Record<string, (q: Quantity) => string>}
 */
const COUNT_TITLES = {
	primitive_degree: (q) =>
		`Atom with ${quantityPhrase(q, ['explicit connection', 'explicit connections'])}`,
	primitive_nonH_degree: (q) =>
		`Atom with ${quantityPhrase(q, ['heavy-atom neighbor', 'heavy-atom neighbors'])}`,
	primitive_connectivity: (q) =>
		`Atom with ${quantityPhrase(q, ['total connection', 'total connections'])}`,
	primitive_valence: (q) => `Atom with total valence of ${quantityPhrase(q)}`,
	primitive_total_h: (q) => `Atom with ${quantityPhrase(q, ['total hydrogen', 'total hydrogens'])}`,
	primitive_implicit_h: (q) =>
		`Atom with ${quantityPhrase(q, ['implicit hydrogen', 'implicit hydrogens'])}`,
	primitive_ring_membership: (q) =>
		isAny(q) ? 'Atom in any ring' : `Atom in ${quantityPhrase(q, ['ring', 'rings'])}`,
	primitive_ring_size: (q) =>
		isAny(q) ? 'Atom in any ring' : `Atom in smallest ring of size ${sizePhrase(q)}`,
	primitive_ring_size_ex: (q) => {
		if (isAny(q)) return 'Atom in any ring';
		if (q.kind === 'exact') return `Atom in exactly ${q.n}-sized ring`;
		return `Atom in ring of size ${quantityPhrase(q)}`;
	},
	primitive_ring_bond: (q) => `Atom with ${quantityPhrase(q, ['ring bond', 'ring bonds'])}`,
	primitive_hetero_nbr: (q) =>
		`Atom with ${quantityPhrase(q, ['heteroatom neighbor', 'heteroatom neighbors'])}`,
	primitive_aliph_hetero_nbr: (q) =>
		`Atom with ${quantityPhrase(q, ['aliphatic heteroatom neighbor', 'aliphatic heteroatom neighbors'])}`,
};

/** Leading letter of each numeric primitive's text. */
const COUNT_LETTER = {
	primitive_degree: 'D',
	primitive_nonH_degree: 'd',
	primitive_connectivity: 'X',
	primitive_valence: 'v',
	primitive_total_h: 'H',
	primitive_implicit_h: 'h',
	primitive_ring_membership: 'R',
	primitive_ring_size: 'r',
	primitive_ring_size_ex: 'k',
	primitive_ring_bond: 'x',
	primitive_hetero_nbr: 'z',
	primitive_aliph_hetero_nbr: 'Z',
};

const HYBRIDIZATION = ['S', 'SP', 'SP2', 'SP3', 'SP3D', 'SP3D2'];

/**
 * Title for a formal charge primitive: `+`, `++`, `+2`, `-`, `--`, `-2`, `+{1-2}`.
 *
 * @param {string} text
 * @returns {string | null}
 */
function chargeTitle(text) {
	const sign = text.charAt(0);
	const rest = text.slice(1);
	const word = sign === '+' ? 'Positive' : 'Negative';
	// '+' / '++' / '+++' (or the '-' equivalents): the sign repeated n times means charge n
	if (/^[+-]*$/.test(rest)) return `Charge ${sign}${text.length}`;
	const q = parseQuantity(rest, undefined);
	if (!q) return null;
	if (q.kind === 'exact') return `Charge ${sign}${q.n}`;
	return `${word} charge ${quantityPhrase(q)}`;
}

/**
 * Explicit title for a node, or null when the generic NODE_DOCS title should be used.
 *
 * @param {string} type  tree-sitter node type
 * @param {string} text  matched source text
 * @returns {string | null}
 */
export function explicitTitle(type, text) {
	if (type === 'simple_atom') {
		if (text === '*') return 'Any atom';
		if (text === 'A') return 'Any aliphatic atom';
		if (text === 'a') return 'Any aromatic atom';
		if (AROMATIC_SIMPLE.has(text)) {
			const name = aromaticElementName(text);
			return name ? `Aromatic ${name}` : null;
		}
		const name = elementNameBySymbol(text);
		return name ? `Aliphatic ${name}` : null;
	}

	if (type === 'primitive_element') {
		// Lowercase bracket-only aromatic atoms: si as se te
		if (text === text.toLowerCase()) {
			const name = aromaticElementName(text);
			return name ? `Aromatic ${name}` : null;
		}
		const name = elementNameBySymbol(text);
		if (!name) return `Element ${text}`;
		return ALIPHATIC_SIMPLE.has(text) ? `Aliphatic ${name}` : name;
	}

	if (type === 'primitive_atomic_num') {
		const n = Number(text.slice(1));
		return elementNameByNumber(n) ?? `Atomic number ${n}`;
	}

	if (type === 'isotope') return `Isotope (mass number) ${text}`;
	if (type === 'atom_map') return `Atom map ${text.slice(1)}`;

	if (type === 'primitive_hybridization') {
		const name = HYBRIDIZATION[Number(text.slice(1))];
		return name ? `${name} hybridized atom` : null;
	}

	if (type === 'primitive_charge_pos' || type === 'primitive_charge_neg') {
		return chargeTitle(text);
	}

	if (type === 'primitive_chirality') {
		// @ is shorthand for @TH1, @@ for @TH2 (tetrahedral is all RDKit supports)
		if (text === '@' || text === '@TH1') return 'Anticlockwise chirality';
		if (text === '@@' || text === '@TH2') return 'Clockwise chirality';
		return null;
	}

	const letter = COUNT_LETTER[/** @type {keyof typeof COUNT_LETTER} */ (type)];
	if (letter !== undefined) {
		const q = parseQuantity(text.slice(letter.length), BARE_DEFAULTS[type]);
		return q ? COUNT_TITLES[type](q) : null;
	}

	return null;
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
	'@': { title: 'Any ring bond' },
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
		const title = explicitTitle(type, text);
		const doc = title ? { title } : (NODE_DOCS[subtype] ?? NODE_DOCS['simple_atom']);
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

	// ── bond_expr_*: delegate to walkBondExprChildren ─────────────────────
	if (type.startsWith('bond_expr') || type === 'bond_expr') {
		const entries = walkBondExprChildren(node, src);
		if (entries.length === 1) return entries[0];
		// multiple entries: a combined bond query, its parts are listed as children
		const doc = NODE_DOCS['bond_expr'];
		return {
			type,
			text,
			startIndex: node.startIndex,
			endIndex: node.endIndex,
			doc,
			children: entries.length ? entries : undefined,
		};
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
		const title = explicitTitle(type, text);
		const doc = title ? { title } : NODE_DOCS[type];
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
		const title = explicitTitle(type, text);
		const doc = title ? { title } : NODE_DOCS[type];
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
 * Walk a bond_expr node, producing flat ExplainerEntries with operator prefixes
 * fused into each leaf — mirroring walkAtomExprChildren for bonds.
 *
 * - bond_expr_and_im: flatten, no prefix
 * - bond_expr_not: fuse opPrefix + '!' into operand text/title
 * - bond_expr_and_hi (&), bond_expr_and_lo (;), bond_expr_or (,):
 *     left inherits incoming prefix, right gets operator prefix
 *
 * @param {import('web-tree-sitter').Node} node
 * @param {string} src
 * @param {string} [opPrefix]
 * @param {string} [opTitle]
 * @returns {ExplainerEntry[]}
 */
function walkBondExprChildren(node, src, opPrefix = '', opTitle = '') {
	/** @type {ExplainerEntry[]} */
	const entries = [];
	const type = node.type;

	// ── bond_expr wrapper (alias node): pass through to actual child ──────────
	if (type === 'bond_expr') {
		const inner = node.children.find((c) => c.isNamed);
		if (!inner) return entries;
		return walkBondExprChildren(inner, src, opPrefix, opTitle);
	}

	// ── bond_primitive leaf ───────────────────────────────────────────────────
	if (type === 'bond_primitive') {
		const text = src.slice(node.startIndex, node.endIndex);
		const doc = BOND_DOCS[text] ?? NODE_DOCS['bond_primitive'];
		entries.push({
			type,
			text: opPrefix + text,
			startIndex: node.startIndex,
			endIndex: node.endIndex,
			doc: opPrefix ? { title: opTitle + doc.title } : doc,
		});
		return entries;
	}

	// ── NOT ───────────────────────────────────────────────────────────────────
	if (type === 'bond_expr_not') {
		const operand = node.children.find((c) => c.isNamed);
		if (!operand) return entries;
		return walkBondExprChildren(operand, src, opPrefix + '!', opTitle + 'NOT ');
	}

	// ── Implicit AND: flatten, pass prefix to first leaf only ────────────────
	if (type === 'bond_expr_and_im') {
		let first = true;
		for (const child of node.children) {
			const err = errorEntry(child, src);
			if (err) {
				entries.push(err);
				continue;
			}
			if (!child.isNamed) continue;
			const sub = walkBondExprChildren(
				child,
				src,
				first && opPrefix ? opPrefix : '',
				first && opTitle ? opTitle : '',
			);
			entries.push(...sub);
			if (sub.length > 0) first = false;
		}
		return entries;
	}

	// ── Binary: and_hi (&), and_lo (;), or (,) ───────────────────────────────
	const OP_TOKEN = { bond_expr_and_hi: '&', bond_expr_and_lo: ';', bond_expr_or: ',' };
	const OP_TITLE = {
		bond_expr_and_hi: 'High-AND ',
		bond_expr_and_lo: 'Low-AND ',
		bond_expr_or: 'OR ',
	};
	const opTok = OP_TOKEN[/** @type {keyof typeof OP_TOKEN} */ (type)];
	const opTit = OP_TITLE[/** @type {keyof typeof OP_TITLE} */ (type)];

	if (opTok !== undefined) {
		const namedChildren = node.children.filter((c) => c.isNamed);
		const left = namedChildren[0];
		if (left) entries.push(...walkBondExprChildren(left, src, opPrefix, opTitle));
		const right = namedChildren[1];
		if (right) entries.push(...walkBondExprChildren(right, src, opTok, opTit));
		return entries;
	}

	// ── Fallback ──────────────────────────────────────────────────────────────
	for (const child of node.children) {
		const err = errorEntry(child, src);
		if (err) {
			entries.push(err);
			continue;
		}
		if (!child.isNamed) continue;
		entries.push(...walkBondExprChildren(child, src));
	}
	return entries;
}

/**
 * Walk the children of an atom_expr node, producing flat ExplainerEntries.
 *
 * - atom_expr_and_im (implicit AND): flatten children, no operator prefix
 * - atom_expr_and_hi (&), atom_expr_and_lo (;), atom_expr_or (,):
 *     left children flat, right-most primitive prefixed with operator token
 * - atom_expr_not (!): fuse '!' + operand text into one entry, title = "NOT <operand title>"
 *
 * @param {import('web-tree-sitter').Node} node
 * @param {string} src
 * @param {string} [opPrefix]   operator token to prepend to the first leaf emitted
 * @param {string} [opTitle]    operator label to prepend to the first leaf's title
 * @returns {ExplainerEntry[]}
 */
function walkAtomExprChildren(node, src, opPrefix = '', opTitle = '') {
	/** @type {ExplainerEntry[]} */
	const entries = [];

	const type = node.type;

	// ── NOT: fuse '!' with immediate operand ─────────────────────────────────
	if (type === 'atom_expr_not') {
		const operand = node.children.find((c) => c.isNamed);
		if (!operand) return entries;
		const operandText = src.slice(operand.startIndex, operand.endIndex);
		if (operand.type.startsWith('atom_expr')) {
			// Recurse, passing fused prefix
			return walkAtomExprChildren(operand, src, opPrefix + '!', opTitle + 'NOT ');
		}
		const inner = nodeToEntry(operand, operandText, src);
		if (inner) {
			entries.push({
				...inner,
				text: opPrefix + '!' + inner.text,
				doc: { title: opTitle + 'NOT ' + inner.doc.title },
			});
		}
		return entries;
	}

	// ── Implicit AND: just flatten, no operator ───────────────────────────────
	if (type === 'atom_expr_and_im') {
		let first = true;
		for (const child of node.children) {
			const err = errorEntry(child, src);
			if (err) {
				entries.push(err);
				continue;
			}
			if (!child.isNamed) continue;
			const childText = src.slice(child.startIndex, child.endIndex);
			if (child.type.startsWith('atom_expr')) {
				const sub = walkAtomExprChildren(child, src, first ? opPrefix : '', first ? opTitle : '');
				entries.push(...sub);
			} else {
				const entry = nodeToEntry(child, childText, src);
				if (entry) {
					if (first && (opPrefix || opTitle)) {
						entries.push({
							...entry,
							text: opPrefix + entry.text,
							doc: { title: opTitle + entry.doc.title },
						});
					} else {
						entries.push(entry);
					}
				}
			}
			if (entries.length > 0) first = false;
		}
		return entries;
	}

	// ── Binary: and_hi (&), and_lo (;), or (,) ───────────────────────────────
	// Tree shape: left _atom_expr  OP  right _atom_expr
	// Emit left flat (inheriting any incoming opPrefix on first leaf),
	// then emit right flat with the operator prefixed on its first leaf.
	const OP_TOKEN = { atom_expr_and_hi: '&', atom_expr_and_lo: ';', atom_expr_or: ',' };
	const OP_TITLE = {
		atom_expr_and_hi: 'High-AND ',
		atom_expr_and_lo: 'Low-AND ',
		atom_expr_or: 'OR ',
	};
	const opTok = OP_TOKEN[/** @type {keyof typeof OP_TOKEN} */ (type)];
	const opTit = OP_TITLE[/** @type {keyof typeof OP_TITLE} */ (type)];

	if (opTok !== undefined) {
		const namedChildren = node.children.filter((c) => c.isNamed);
		// left (inherits incoming prefix)
		const left = namedChildren[0];
		if (left) {
			if (left.type.startsWith('atom_expr')) {
				entries.push(...walkAtomExprChildren(left, src, opPrefix, opTitle));
			} else {
				const e = nodeToEntry(left, src.slice(left.startIndex, left.endIndex), src);
				if (e)
					entries.push(
						opPrefix ? { ...e, text: opPrefix + e.text, doc: { title: opTitle + e.doc.title } } : e,
					);
			}
		}
		// right (gets this node's operator prefix)
		const right = namedChildren[1];
		if (right) {
			if (right.type.startsWith('atom_expr')) {
				entries.push(...walkAtomExprChildren(right, src, opTok, opTit));
			} else {
				const e = nodeToEntry(right, src.slice(right.startIndex, right.endIndex), src);
				if (e) entries.push({ ...e, text: opTok + e.text, doc: { title: opTit + e.doc.title } });
			}
		}
		return entries;
	}

	// ── Fallback: bracketed_atom wrapper, isotope, atom_map, primitives ───────
	for (const child of node.children) {
		const err = errorEntry(child, src);
		if (err) {
			entries.push(err);
			continue;
		}
		if (!child.isNamed) continue;
		const childText = src.slice(child.startIndex, child.endIndex);
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
// Recursive SMARTS cursor finder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walk a node tree and return the deepest `recursive_query` node whose span
 * contains `cursorPos`, or null if none.
 *
 * @param {import('web-tree-sitter').Node} node
 * @param {number} cursorPos
 * @returns {import('web-tree-sitter').Node | null}
 */
function findDeepestRecursive(node, cursorPos) {
	if (cursorPos < node.startIndex || cursorPos > node.endIndex) return null;

	// Depth-first: check children first so deepest wins
	for (const child of node.children) {
		const found = findDeepestRecursive(child, cursorPos);
		if (found) return found;
	}

	if (node.type === 'recursive_query') return node;
	return null;
}

/**
 * Given a parsed tree and cursor position, return the inner SMARTS string of
 * the deepest `recursive_query` node that contains the cursor, or null.
 *
 * @param {import('web-tree-sitter').Node} rootNode
 * @param {string} src
 * @param {number} cursorPos
 * @returns {string | null}
 */
export function findRecursiveAtCursor(rootNode, src, cursorPos) {
	const node = findDeepestRecursive(rootNode, cursorPos);
	if (!node) return null;
	const smartsChild = node.children.find((c) => c.isNamed && c.type === 'smarts');
	if (!smartsChild) return null;
	return src.slice(smartsChild.startIndex, smartsChild.endIndex);
}

/**
 * Split a `smarts` node by '.' separators, return array of {start,end} spans.
 * @param {import('web-tree-sitter').Node} smartsNode
 * @returns {{ start: number, end: number }[]}
 */
function fragmentSpans(smartsNode) {
	/** @type {{ start: number, end: number }[]} */
	const fragments = [];
	let fragStart = smartsNode.startIndex;
	for (const child of smartsNode.children) {
		if (!child.isNamed && child.type === '.') {
			fragments.push({ start: fragStart, end: child.startIndex });
			fragStart = child.endIndex;
		}
	}
	fragments.push({ start: fragStart, end: smartsNode.endIndex });
	return fragments;
}

/**
 * Given a parsed tree and cursor position, return the sub-SMARTS string,
 * badge label, and character span for the fragment/reaction component the
 * cursor is in, or null.
 *
 * For fragment splits (`.`): badge is "fragment N/total".
 * For reaction splits (`>`): badge is "reactant" / "agent" / "product".
 * For reaction part with fragments: badge is e.g. "reactant · fragment 2/3".
 *
 * @param {import('web-tree-sitter').Node} rootNode
 * @param {string} src
 * @param {number} cursorPos
 * @returns {{ smarts: string, badge: string, from: number, to: number } | null}
 */
export function findFragmentSpanAtCursor(rootNode, src, cursorPos) {
	const top = rootNode.children.find((c) => c.isNamed);
	if (!top) return null;

	if (top.type === 'reaction') {
		const FIELDS = /** @type {const} */ (['reactants', 'agents', 'products']);
		for (const field of FIELDS) {
			const p = top.childForFieldName(field);
			if (!p || cursorPos < p.startIndex || cursorPos > p.endIndex) continue;
			const frags = fragmentSpans(p);
			if (frags.length > 1) {
				for (let j = 0; j < frags.length; j++) {
					const { start, end } = frags[j];
					if (cursorPos >= start && cursorPos <= end) {
						return {
							smarts: src.slice(start, end),
							badge: `${field} · fragment ${j + 1}/${frags.length}`,
							from: start,
							to: end,
						};
					}
				}
			}
			return {
				smarts: src.slice(p.startIndex, p.endIndex),
				badge: field,
				from: p.startIndex,
				to: p.endIndex,
			};
		}
		return null;
	}

	if (top.type === 'smarts') {
		const frags = fragmentSpans(top);
		if (frags.length <= 1) return null;
		for (let i = 0; i < frags.length; i++) {
			const { start, end } = frags[i];
			if (cursorPos >= start && cursorPos <= end) {
				return {
					smarts: src.slice(start, end),
					badge: `fragment ${i + 1}/${frags.length}`,
					from: start,
					to: end,
				};
			}
		}
		return null;
	}

	return null;
}

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
