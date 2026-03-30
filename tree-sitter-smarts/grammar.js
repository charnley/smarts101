/**
 * @file SMARTS grammar for Tree-sitter
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
	name: 'smarts',

	// SMARTS has no whitespace — every character is significant.
	// We suppress the default whitespace extra so newlines at EOF don't error.
	extras: (_$) => [],

	rules: {
		// -----------------------------------------------------------------------
		// Top-level
		// -----------------------------------------------------------------------
		source_file: ($) => seq(choice($.reaction, $.smarts), optional('\n')),

		// reaction: reactants > agents > products  (each part is optional)
		reaction: ($) =>
			seq(
				field('reactants', optional($.smarts)),
				'>',
				field('agents', optional($.smarts)),
				'>',
				field('products', optional($.smarts)),
			),

		// A SMARTS expression is one or more dot-separated fragments
		smarts: ($) => seq($._fragment, repeat(seq('.', $._fragment))),

		_fragment: ($) => choice($.component_group, $.chain),

		// Component-level grouping: (frag) or (frag.frag)
		component_group: ($) => seq('(', $.smarts, ')'),

		// -----------------------------------------------------------------------
		// Chain
		// -----------------------------------------------------------------------
		chain: ($) => seq($.atom, repeat(choice(seq($._bond, $.atom), $.atom))),

		// -----------------------------------------------------------------------
		// Atom
		// -----------------------------------------------------------------------
		atom: ($) => seq($._atom_core, repeat($.ring_closure), repeat($.branch)),

		_atom_core: ($) => choice($.bracketed_atom, $.organic_atom, $.wildcard_atom),

		organic_atom: (_$) =>
			token(
				choice('Cl', 'Br', 'b', 'c', 'n', 'o', 'p', 's', 'B', 'C', 'N', 'O', 'P', 'S', 'F', 'I'),
			),

		wildcard_atom: (_$) => '*',

		// -----------------------------------------------------------------------
		// Bracketed atom: [ isotope? atom_expr+ map? ]
		//
		// Adjacent primitives without an explicit operator are high-and (&).
		// We model this by allowing one or more primitives/expressions inside the
		// bracket, which tree-sitter wraps into atom_expr_implicit_and when there
		// is more than one.
		// -----------------------------------------------------------------------
		bracketed_atom: ($) =>
			seq(
				'[',
				optional(field('isotope', $.isotope)),
				field('expression', $._atom_expr),
				optional(field('map', $.atom_map)),
				']',
			),

		isotope: (_$) => /[0-9]+/,

		atom_map: (_$) => token(seq(':', optional('?'), /[0-9]+/)),

		// -----------------------------------------------------------------------
		// Atom expression (inside brackets)
		//
		// Operator precedence (lowest → highest):
		//   ; (low-and)  <  , (or)  <  & (high-and)  <  ! (not)  <  adjacency
		//
		// Implicit adjacency (two primitives next to each other) acts as high-and.
		// We model it with the highest prec so it binds tighter than explicit &.
		// -----------------------------------------------------------------------
		_atom_expr: ($) =>
			choice(
				$.atom_expr_and_lo,
				$.atom_expr_or,
				$.atom_expr_and_hi,
				$.atom_expr_implicit_and,
				$.atom_expr_not,
				$._atom_primitive,
			),

		// low-precedence AND: e1;e2
		atom_expr_and_lo: ($) => prec.left(1, seq($._atom_expr, ';', $._atom_expr)),

		// OR: e1,e2
		atom_expr_or: ($) => prec.left(2, seq($._atom_expr, ',', $._atom_expr)),

		// explicit high-precedence AND: e1&e2
		atom_expr_and_hi: ($) => prec.left(3, seq($._atom_expr, '&', $._atom_expr)),

		// implicit adjacency AND: e1 e2  (e.g. OH, CH2)
		atom_expr_implicit_and: ($) => prec.left(4, seq($._atom_primitive, $._atom_expr)),

		// NOT: !e
		atom_expr_not: ($) => prec(5, seq('!', $._atom_expr)),

		// -----------------------------------------------------------------------
		// Atomic primitives (inside brackets)
		// -----------------------------------------------------------------------
		_atom_primitive: ($) =>
			choice(
				$.primitive_wildcard,
				$.primitive_aromatic,
				$.primitive_aliphatic,
				$.primitive_atomic_num,
				$.primitive_degree,
				$.primitive_total_h,
				$.primitive_implicit_h,
				$.primitive_ring_membership,
				$.primitive_ring_size,
				$.primitive_valence,
				$.primitive_connectivity,
				$.primitive_ring_connectivity,
				$.primitive_charge_pos,
				$.primitive_charge_neg,
				$.primitive_chirality,
				$.primitive_element,
				$.recursive_smarts,
			),

		primitive_wildcard: (_$) => '*',
		primitive_aromatic: (_$) => 'a',
		primitive_aliphatic: (_$) => 'A',

		primitive_atomic_num: (_$) => token(seq('#', /[0-9]+/)),
		primitive_degree: (_$) => token(seq('D', optional(/[0-9]+/))),
		primitive_total_h: (_$) => token(seq('H', optional(/[0-9]+/))),
		primitive_implicit_h: (_$) => token(seq('h', optional(/[0-9]+/))),
		primitive_ring_membership: (_$) => token(seq('R', optional(/[0-9]+/))),
		primitive_ring_size: (_$) => token(seq('r', optional(/[0-9]+/))),
		primitive_valence: (_$) => token(seq('v', optional(/[0-9]+/))),
		primitive_connectivity: (_$) => token(seq('X', optional(/[0-9]+/))),
		primitive_ring_connectivity: (_$) => token(seq('x', optional(/[0-9]+/))),

		primitive_charge_pos: (_$) => token(choice(seq('+', /[0-9]+/), /\++/)),

		primitive_charge_neg: (_$) => token(choice(seq('-', /[0-9]+/), /-+/)),

		// @@ must be tried before @
		primitive_chirality: (_$) =>
			token(
				choice(
					seq('@@', /[A-Z][A-Z]?/, /[0-9]+/, optional('?')),
					'@@',
					seq('@', /[A-Z][A-Z]?/, /[0-9]+/, optional('?')),
					'@',
				),
			),

		// Element symbol inside brackets — two-letter before one-letter
		primitive_element: (_$) =>
			token(
				choice(
					/[A-Z][a-z]/, // e.g. Ca, Fe
					/[A-Z]/, // e.g. C, N, O
					/[a-z]/, // aromatic e.g. c, n, o
				),
			),

		recursive_smarts: ($) => seq('$', '(', $.smarts, ')'),

		// -----------------------------------------------------------------------
		// Bond primitives (outside brackets, between atoms)
		// /? and \? matched before / and \
		// -----------------------------------------------------------------------
		_bond: (_$) =>
			token(
				choice(
					'-', // single
					'=', // double
					'#', // triple
					':', // aromatic
					'~', // any
					'@', // any ring bond
					'/?', // directional up or unspecified
					'\\?', // directional down or unspecified
					'/', // directional up
					'\\', // directional down
				),
			),

		// -----------------------------------------------------------------------
		// Ring closure: optional bond + (%nn | digit)
		// Tokenised as a unit to avoid ambiguity
		// -----------------------------------------------------------------------
		ring_closure: (_$) =>
			token(
				seq(
					optional(choice('-', '=', '#', ':', '~', '@', '/?', '\\?', '/', '\\')),
					choice(seq('%', /[0-9][0-9]/), /[0-9]/),
				),
			),

		// -----------------------------------------------------------------------
		// Branch: ( bond? chain )
		// -----------------------------------------------------------------------
		branch: ($) => seq('(', optional($._bond), $.chain, ')'),
	},
});
