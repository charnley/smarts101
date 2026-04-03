/**
 * @file SMARTS grammar for Tree-sitter
 * @license MIT
 *
 * Rule names mirror the Bison grammar in RDKit smarts.yy wherever practical,
 * so the two files can be read side-by-side.
 *
 *   meta_start / mol  →  source_file / smarts / chain
 *   atomd             →  atom
 *   atom_expr         →  atom_expr_*
 *   point_query       →  atom_expr_not / atom_expr_and_im
 *   atom_query        →  _atom_primitive / primitive_*
 *   bond_expr         →  bond_expr_*
 *   bondd             →  bond_primitive
 *   ring_number       →  ring_closure
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Range suffix pattern: {N-M} | {N-} | {-M}
// Written as a raw regex so it composes cleanly inside token().
const RANGE = /\{([0-9]+-[0-9]+|[0-9]+-|-[0-9]+)\}/;

export default grammar({
	name: 'smarts',

	// SMARTS has no whitespace — every character is significant.
	// Suppress the default whitespace extra so a trailing newline does not error.
	extras: (_$) => [],

	rules: {
		// -----------------------------------------------------------------------
		// meta_start  (smarts.yy:189)
		// -----------------------------------------------------------------------
		source_file: ($) => seq(choice($.reaction, $.smarts), optional('\n')),

		// -----------------------------------------------------------------------
		// reaction: reactants > agents > products  (each side optional)
		// -----------------------------------------------------------------------
		reaction: ($) =>
			seq(
				field('reactants', optional($.smarts)),
				'>',
				field('agents', optional($.smarts)),
				'>',
				field('products', optional($.smarts)),
			),

		// -----------------------------------------------------------------------
		// mol  (smarts.yy:247)
		// A SMARTS is one or more dot-separated fragments.
		// -----------------------------------------------------------------------
		smarts: ($) => seq($._fragment, repeat(seq('.', $._fragment))),

		_fragment: ($) => choice($.component_group, $.chain),

		// Component-level grouping  (CXSMILES / reaction component syntax)
		component_group: ($) => seq('(', $.smarts, ')'),

		// -----------------------------------------------------------------------
		// chain  (mol in smarts.yy:247, flattened here)
		// Sequence of atoms connected by optional explicit bonds.
		// -----------------------------------------------------------------------
		chain: ($) => seq($.atom, repeat(choice(seq($.bond_expr, $.atom), $.atom))),

		// -----------------------------------------------------------------------
		// atomd  (smarts.yy:396)
		// -----------------------------------------------------------------------
		atom: ($) => seq($._atom_core, repeat($.ring_closure), repeat($.branch)),

		_atom_core: ($) => choice($.bracketed_atom, $.simple_atom),

		// -----------------------------------------------------------------------
		// simple_atom  (smarts.yy:798)
		// Organic-subset aliphatic, aromatic, and wildcard atoms (outside brackets).
		// Two-letter symbols (Cl, Br) must come before single-letter.
		// -----------------------------------------------------------------------
		simple_atom: (_$) =>
			token(
				choice(
					// ORGANIC_ATOM_TOKEN (smarts.ll:291) — two-letter first
					'Cl',
					'Br',
					'B',
					'C',
					'N',
					'O',
					'P',
					'S',
					'F',
					'I',
					// AROMATIC_ATOM_TOKEN outside brackets (smarts.ll:312)
					'b',
					'c',
					'n',
					'o',
					'p',
					's',
					// SIMPLE_ATOM_QUERY_TOKEN (smarts.ll:334)
					'*',
					'A',
					'a',
				),
			),

		// -----------------------------------------------------------------------
		// atomd: ATOM_OPEN_TOKEN atom_expr ATOM_CLOSE_TOKEN  (smarts.yy:399)
		// -----------------------------------------------------------------------
		bracketed_atom: ($) =>
			seq(
				'[',
				optional(field('isotope', $.isotope)),
				field('expression', $._atom_expr),
				optional(field('map', $.atom_map)),
				']',
			),

		// isotope: leading digits before the element/query  (smarts.yy:898)
		isotope: (_$) => /[0-9]+/,

		// atom-map number: :N or :?N  (smarts.ll:354)
		atom_map: (_$) => token(seq(':', optional('?'), /[0-9]+/)),

		// -----------------------------------------------------------------------
		// atom_expr  (smarts.yy:488)
		//
		// Operator precedence (lowest → highest):
		//   ;  (low-AND)  <  ,  (OR)  <  &  (high-AND)  <  !  (NOT)  <  adjacency
		//
		// Implicit adjacency (juxtaposition of two primitives) acts as high-AND
		// and binds tighter than explicit &.
		// -----------------------------------------------------------------------
		_atom_expr: ($) =>
			choice(
				$.atom_expr_and_lo, // ;
				$.atom_expr_or, // ,
				$.atom_expr_and_hi, // &
				$.atom_expr_not, // !
				$.atom_expr_and_im, // adjacency (implicit high-AND)
				$._atom_primitive,
			),

		// atom_expr SEMI_TOKEN atom_expr  (smarts.yy:491)
		atom_expr_and_lo: ($) => prec.left(1, seq($._atom_expr, ';', $._atom_expr)),

		// atom_expr OR_TOKEN atom_expr  (smarts.yy:493)
		atom_expr_or: ($) => prec.left(2, seq($._atom_expr, ',', $._atom_expr)),

		// atom_expr AND_TOKEN atom_expr  (smarts.yy:495)
		atom_expr_and_hi: ($) => prec.left(3, seq($._atom_expr, '&', $._atom_expr)),

		// NOT_TOKEN point_query  (smarts.yy:525)
		atom_expr_not: ($) => prec(5, seq('!', $._atom_expr)),

		// atom_expr point_query — implicit AND by juxtaposition  (smarts.yy:497)
		atom_expr_and_im: ($) => prec.left(4, seq($._atom_primitive, $._atom_expr)),

		// -----------------------------------------------------------------------
		// atom_query / point_query  (smarts.yy:523, 575)
		// Leaf-level atom query primitives.
		//
		// Ordering matters for disambiguation: more-specific tokens (multi-char
		// primitives, two-letter elements) must appear before single-letter ones.
		// -----------------------------------------------------------------------
		_atom_primitive: ($) =>
			choice(
				$.recursive_query, // $(...)
				$.primitive_atomic_num, // #6
				$.primitive_hybridization, // ^0–^5
				$.primitive_degree, // D, D2, D{2-4}
				$.primitive_nonH_degree, // d, d2, d{2-4}
				$.primitive_total_h, // H, H2
				$.primitive_implicit_h, // h, h2, h{2-4}
				$.primitive_ring_membership, // R, R2
				$.primitive_ring_size, // r, r5, r{5-7}
				$.primitive_ring_size_ex, // k, k5, k{5-7}
				$.primitive_valence, // v, v3, v{2-4}
				$.primitive_connectivity, // X, X2, X{2-4}
				$.primitive_ring_bond, // x, x2, x{2-4}
				$.primitive_hetero_nbr, // z, z2, z{2-4}
				$.primitive_aliph_hetero_nbr, // Z, Z2, Z{2-4}
				$.primitive_charge_pos, // +, +2, ++
				$.primitive_charge_neg, // -, -2, --
				$.primitive_chirality, // @, @@, @TH1, @OH3…
				$.primitive_element, // [Si], [Fe], [as], [se]…
				$.simple_atom, // organic subset / wildcards (inside brackets too)
			),

		// -----------------------------------------------------------------------
		// atom_query primitives  (smarts.yy:575)
		// -----------------------------------------------------------------------

		// recursive_query  (smarts.yy:534)
		recursive_query: ($) => seq('$', '(', $.smarts, ')'),

		// ATOM_TOKEN — element symbols inside brackets  (smarts.ll:117)
		//
		// Aromatic bracket-only two-letter atoms: si as se te  (smarts.ll:162)
		// Two-letter aliphatic elements listed in smarts.ll:117–223.
		// Single-letter elements that are NOT also primitive query letters.
		//
		// Excluded from single-letter list (covered by dedicated primitives):
		//   D d H h R r k v X x z Z A a  (query primitives)
		//   B C N O P S F I b c n o p s  (simple_atom / organic subset)
		primitive_element: (_$) =>
			token(
				choice(
					// Aromatic bracket-only two-letter atoms (smarts.ll:162)
					'si',
					'as',
					'se',
					'te',
					// Two-letter aliphatic elements (smarts.ll:117–223)
					'He',
					'Li',
					'Be',
					'Ne',
					'Na',
					'Mg',
					'Al',
					'Si',
					'Ar',
					'Ca',
					'Sc',
					'Ti',
					'Cr',
					'Mn',
					'Fe',
					'Co',
					'Ni',
					'Cu',
					'Zn',
					'Ga',
					'Ge',
					'As',
					'Se',
					'Br',
					'Kr',
					'Rb',
					'Sr',
					'Zr',
					'Nb',
					'Mo',
					'Tc',
					'Ru',
					'Rh',
					'Pd',
					'Ag',
					'Cd',
					'In',
					'Sn',
					'Sb',
					'Te',
					'Xe',
					'Cs',
					'Ba',
					'La',
					'Ce',
					'Pr',
					'Nd',
					'Pm',
					'Sm',
					'Eu',
					'Gd',
					'Tb',
					'Dy',
					'Ho',
					'Er',
					'Tm',
					'Yb',
					'Lu',
					'Hf',
					'Ta',
					'Re',
					'Os',
					'Ir',
					'Pt',
					'Au',
					'Hg',
					'Tl',
					'Pb',
					'Bi',
					'Po',
					'At',
					'Rn',
					'Fr',
					'Ra',
					'Ac',
					'Th',
					'Pa',
					'Np',
					'Pu',
					'Am',
					'Cm',
					'Bk',
					'Cf',
					'Es',
					'Fm',
					'Md',
					'No',
					'Lr',
					'Rf',
					'Db',
					'Sg',
					'Bh',
					'Hs',
					'Mt',
					'Ds',
					'Rg',
					'Cn',
					'Fl',
					'Lv',
					'Cl',
					// Single-letter elements not used as query primitives
					'G',
					'J',
					'K',
					'L',
					'M',
					'Q',
					'T',
					'U',
					'W',
					'Y',
					'V',
					'E',
					'e',
				),
			),

		// #N  — atomic number query  (smarts.yy:591)
		primitive_atomic_num: (_$) => token(seq('#', /[0-9]+/)),

		// ^0–^5  — hybridization  (smarts.ll:432, smarts.yy:733)
		primitive_hybridization: (_$) => token(seq('^', /[0-5]/)),

		// D / D2 / D{N-M}  — explicit degree  (smarts.ll:224, smarts.yy:607)
		primitive_degree: (_$) => token(choice(seq('D', /[0-9]+/), seq('D', RANGE), 'D')),

		// d / d2 / d{N-M}  — non-H degree  (smarts.ll:225, smarts.yy:607)
		primitive_nonH_degree: (_$) => token(choice(seq('d', /[0-9]+/), seq('d', RANGE), 'd')),

		// H / H2  — total H count  (smarts.yy:690)
		primitive_total_h: (_$) => token(choice(seq('H', /[0-9]+/), 'H')),

		// h / h2 / h{N-M}  — implicit H count  (smarts.ll:231, smarts.yy:697)
		primitive_implicit_h: (_$) => token(choice(seq('h', /[0-9]+/), seq('h', RANGE), 'h')),

		// R / R2  — ring membership  (smarts.ll:230, smarts.yy:631)
		primitive_ring_membership: (_$) => token(choice(seq('R', /[0-9]+/), 'R')),

		// r / r5 / r{5-7}  — minimum ring size  (smarts.ll:231, smarts.yy:637)
		primitive_ring_size: (_$) => token(choice(seq('r', /[0-9]+/), seq('r', RANGE), 'r')),

		// k / k5 / k{5-7}  — exact ring size  (smarts.ll:232, smarts.yy:651)
		primitive_ring_size_ex: (_$) => token(choice(seq('k', /[0-9]+/), seq('k', RANGE), 'k')),

		// v / v3 / v{N-M}  — total valence  (smarts.ll:226, smarts.yy:619)
		primitive_valence: (_$) => token(choice(seq('v', /[0-9]+/), seq('v', RANGE), 'v')),

		// X / X2 / X{N-M}  — total connectivity  (smarts.ll:224, smarts.yy:611)
		primitive_connectivity: (_$) => token(choice(seq('X', /[0-9]+/), seq('X', RANGE), 'X')),

		// x / x2 / x{N-M}  — ring bond count  (smarts.ll:225, smarts.yy:643)
		primitive_ring_bond: (_$) => token(choice(seq('x', /[0-9]+/), seq('x', RANGE), 'x')),

		// z / z2 / z{N-M}  — heteroatom neighbour count  (smarts.ll:227, smarts.yy:669)
		primitive_hetero_nbr: (_$) => token(choice(seq('z', /[0-9]+/), seq('z', RANGE), 'z')),

		// Z / Z2 / Z{N-M}  — aliphatic heteroatom neighbour count  (smarts.ll:228, smarts.yy:679)
		primitive_aliph_hetero_nbr: (_$) => token(choice(seq('Z', /[0-9]+/), seq('Z', RANGE), 'Z')),

		// charge_spec  (smarts.yy:878)
		// +2 / ++ / +  and  -2 / -- / -
		primitive_charge_pos: (_$) => token(choice(seq('+', /[0-9]+/), /\++/)),
		primitive_charge_neg: (_$) => token(choice(seq('-', /[0-9]+/), /-+/)),

		// chirality  (smarts.ll:108, smarts.yy:713)
		// @@ must be tried before @; class tokens (@TH, @AL…) before bare @
		primitive_chirality: (_$) =>
			token(
				choice(
					seq('@@', /[A-Z][A-Z]?/, /[0-9]+/, optional('?')), // @@TH1?
					'@@',
					seq('@', /[A-Z][A-Z]?/, /[0-9]+/, optional('?')), // @TH1?
					'@',
				),
			),

		// -----------------------------------------------------------------------
		// bond_expr / bond_query / bondd  (smarts.yy:820)
		//
		// Operator precedence mirrors atom_expr:
		//   ;  (low-AND)  <  ,  (OR)  <  &  (high-AND)  <  !  (NOT)  <  adjacency
		// -----------------------------------------------------------------------
		bond_expr: ($) =>
			choice(
				$.bond_expr_and_lo, // ;
				$.bond_expr_or, // ,
				$.bond_expr_and_hi, // &
				$.bond_expr_not, // !
				$.bond_expr_and_im, // adjacency (bond_query bondd)
				$.bond_primitive,
			),

		// bond_expr SEMI_TOKEN bond_expr  (smarts.yy:830)
		bond_expr_and_lo: ($) => prec.left(1, seq($.bond_expr, ';', $.bond_expr)),

		// bond_expr OR_TOKEN bond_expr  (smarts.yy:828)
		bond_expr_or: ($) => prec.left(2, seq($.bond_expr, ',', $.bond_expr)),

		// bond_expr AND_TOKEN bond_expr  (smarts.yy:826)
		bond_expr_and_hi: ($) => prec.left(3, seq($.bond_expr, '&', $.bond_expr)),

		// NOT_TOKEN bondd  (smarts.yy:871)
		bond_expr_not: ($) => prec(5, seq('!', $.bond_expr)),

		// bond_query bondd — implicit AND by juxtaposition  (smarts.yy:841)
		bond_expr_and_im: ($) => prec.left(4, seq($.bond_primitive, $.bond_expr)),

		// bondd  (smarts.yy:847)
		// Note: dative bonds -> and <- are valid in RDKit but conflict with the
		// reaction separator > at the scanner level; they require external quoting
		// or bracket context and are omitted here for parse safety.
		bond_primitive: (_$) =>
			token(
				choice(
					'=', // double        BOND_TOKEN
					'~', // any           BOND_TOKEN
					'$', // quadruple     BOND_TOKEN
					'/?', // dir up/unspec BOND_TOKEN
					'\\?', // dir dn/unspec BOND_TOKEN
					'/', // dir up        BOND_TOKEN
					'\\', // dir down      BOND_TOKEN
					'-', // single        MINUS_TOKEN
					'#', // triple        HASH_TOKEN
					':', // aromatic      COLON_TOKEN
					'@', // ring bond     AT_TOKEN
				),
			),

		// -----------------------------------------------------------------------
		// ring_number  (smarts.yy:887)
		// Optional bond prefix + ring-closure label.
		// The %(digits) parenthesized form conflicts with branch '(' at the
		// character level; the two-digit %NN and single-digit forms are supported.
		// -----------------------------------------------------------------------
		ring_closure: (_$) =>
			token(
				seq(
					// optional bond type on the closure
					optional(choice('=', '~', '$', '/?', '\\?', '/', '\\', '-', '#', ':', '@')),
					// closure label: %NN  |  single digit
					choice(seq('%', /[0-9][0-9]/), /[0-9]/),
				),
			),

		// -----------------------------------------------------------------------
		// branch  (smarts.yy:297)
		// -----------------------------------------------------------------------
		branch: ($) => seq('(', optional($.bond_expr), $.chain, ')'),
	},
});
