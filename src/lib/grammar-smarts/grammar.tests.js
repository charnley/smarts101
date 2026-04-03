import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Parser, Language } from 'web-tree-sitter';

const wasmPath = resolve('./src/lib/grammar-smarts/tree-sitter-smarts.wasm');

/** @type {Parser} */
let parser;

beforeAll(async () => {
	await Parser.init();
	const lang = await Language.load(readFileSync(wasmPath));
	parser = new Parser();
	parser.setLanguage(lang);
});

afterAll(() => {
	parser.delete();
});

/** S-expression of the full parse tree
 * @param {string} input
 */
function sexp(input) {
	return parser.parse(input)?.rootNode.toString();
}

/** True if the tree contains any ERROR or MISSING nodes
 * @param {string} input
 */
function hasError(input) {
	return parser.parse(input)?.rootNode.hasError ?? true;
}

// ─── simple_atom (organic subset + wildcards, outside brackets) ───────────────

describe('simple_atom', () => {
	it.each([
		'B',
		'C',
		'N',
		'O',
		'P',
		'S',
		'F',
		'I',
		'Cl',
		'Br',
		'b',
		'c',
		'n',
		'o',
		'p',
		's',
		'*',
		'A',
		'a',
	])('parses %s without error', (sym) => {
		expect(hasError(sym)).toBe(false);
	});

	it('parses C', () => {
		expect(sexp('C')).toBe('(source_file (smarts (chain (atom (simple_atom)))))');
	});

	it('parses Cl (two-letter symbol)', () => {
		expect(sexp('Cl')).toBe('(source_file (smarts (chain (atom (simple_atom)))))');
	});

	it('parses * (wildcard)', () => {
		expect(sexp('*')).toBe('(source_file (smarts (chain (atom (simple_atom)))))');
	});

	it('parses A (aliphatic wildcard)', () => {
		expect(sexp('A')).toBe('(source_file (smarts (chain (atom (simple_atom)))))');
	});

	it('parses a (aromatic wildcard)', () => {
		expect(sexp('a')).toBe('(source_file (smarts (chain (atom (simple_atom)))))');
	});
});

// ─── bracketed_atom ───────────────────────────────────────────────────────────

describe('bracketed_atom', () => {
	it('parses [C]', () => {
		expect(hasError('[C]')).toBe(false);
		expect(sexp('[C]')).toBe(
			'(source_file (smarts (chain (atom (bracketed_atom expression: (simple_atom))))))',
		);
	});

	it('parses [OH] (implicit AND)', () => {
		expect(hasError('[OH]')).toBe(false);
		expect(sexp('[OH]')).toBe(
			'(source_file (smarts (chain (atom (bracketed_atom expression: (atom_expr_and_im (simple_atom) (primitive_total_h)))))))',
		);
	});

	it('parses [#6] (atomic number)', () => {
		expect(hasError('[#6]')).toBe(false);
		expect(sexp('[#6]')).toBe(
			'(source_file (smarts (chain (atom (bracketed_atom expression: (primitive_atomic_num))))))',
		);
	});

	it('parses [13C] (isotope)', () => {
		expect(hasError('[13C]')).toBe(false);
		expect(sexp('[13C]')).toBe(
			'(source_file (smarts (chain (atom (bracketed_atom isotope: (isotope) expression: (simple_atom))))))',
		);
	});

	it('parses [C:1] (atom map)', () => {
		expect(hasError('[C:1]')).toBe(false);
		expect(sexp('[C:1]')).toBe(
			'(source_file (smarts (chain (atom (bracketed_atom expression: (simple_atom) map: (atom_map))))))',
		);
	});

	it('parses [C+] (positive charge)', () => {
		expect(hasError('[C+]')).toBe(false);
	});

	it('parses [C-] (negative charge)', () => {
		expect(hasError('[C-]')).toBe(false);
	});

	it('parses [C@@H] (chirality + H)', () => {
		expect(hasError('[C@@H]')).toBe(false);
	});

	it('parses [C@TH1] (chirality class)', () => {
		expect(hasError('[C@TH1]')).toBe(false);
	});
});

// ─── atom_expr operators ──────────────────────────────────────────────────────

describe('atom_expr operators', () => {
	it('parses [C,N] (OR)', () => {
		expect(hasError('[C,N]')).toBe(false);
		expect(sexp('[C,N]')).toBe(
			'(source_file (smarts (chain (atom (bracketed_atom expression: (atom_expr_or (simple_atom) (simple_atom)))))))',
		);
	});

	it('parses [C&N] (high-AND)', () => {
		expect(hasError('[C&N]')).toBe(false);
		expect(sexp('[C&N]')).toBe(
			'(source_file (smarts (chain (atom (bracketed_atom expression: (atom_expr_and_hi (simple_atom) (simple_atom)))))))',
		);
	});

	it('parses [C;N] (low-AND)', () => {
		expect(hasError('[C;N]')).toBe(false);
		expect(sexp('[C;N]')).toBe(
			'(source_file (smarts (chain (atom (bracketed_atom expression: (atom_expr_and_lo (simple_atom) (simple_atom)))))))',
		);
	});

	it('parses [!C] (NOT)', () => {
		expect(hasError('[!C]')).toBe(false);
		expect(sexp('[!C]')).toBe(
			'(source_file (smarts (chain (atom (bracketed_atom expression: (atom_expr_not (simple_atom)))))))',
		);
	});

	it('parses [C,N;O] (precedence: OR then low-AND)', () => {
		expect(hasError('[C,N;O]')).toBe(false);
	});

	it('parses [OH] as implicit AND (adjacency)', () => {
		expect(sexp('[OH]')).toBe(
			'(source_file (smarts (chain (atom (bracketed_atom expression: (atom_expr_and_im (simple_atom) (primitive_total_h)))))))',
		);
	});
});

// ─── atom_query primitives ────────────────────────────────────────────────────

describe('atom_query primitives — degree / connectivity', () => {
	it.each(['[D]', '[D2]', '[D{2-4}]'])('parses %s (explicit degree)', (s) => {
		expect(hasError(s)).toBe(false);
	});

	it.each(['[d]', '[d2]', '[d{2-4}]'])('parses %s (non-H degree)', (s) => {
		expect(hasError(s)).toBe(false);
	});

	it.each(['[X]', '[X2]', '[X{2-4}]'])('parses %s (total connectivity)', (s) => {
		expect(hasError(s)).toBe(false);
	});

	it.each(['[x]', '[x2]', '[x{2-4}]'])('parses %s (ring bond count)', (s) => {
		expect(hasError(s)).toBe(false);
	});

	it.each(['[v]', '[v3]', '[v{2-4}]'])('parses %s (total valence)', (s) => {
		expect(hasError(s)).toBe(false);
	});
});

describe('atom_query primitives — H count', () => {
	it.each(['[H]', '[H2]'])('parses %s (total H)', (s) => {
		expect(hasError(s)).toBe(false);
	});

	it.each(['[h]', '[h2]', '[h{1-3}]'])('parses %s (implicit H)', (s) => {
		expect(hasError(s)).toBe(false);
	});
});

describe('atom_query primitives — ring queries', () => {
	it.each(['[R]', '[R2]'])('parses %s (ring membership)', (s) => {
		expect(hasError(s)).toBe(false);
	});

	it.each(['[r]', '[r5]', '[r{5-7}]'])('parses %s (min ring size)', (s) => {
		expect(hasError(s)).toBe(false);
	});

	it.each(['[k]', '[k5]', '[k{5-7}]'])('parses %s (exact ring size)', (s) => {
		expect(hasError(s)).toBe(false);
	});
});

describe('atom_query primitives — neighbour queries', () => {
	it.each(['[z]', '[z2]', '[z{1-3}]'])('parses %s (heteroatom neighbours)', (s) => {
		expect(hasError(s)).toBe(false);
	});

	it.each(['[Z]', '[Z2]', '[Z{1-3}]'])('parses %s (aliphatic heteroatom neighbours)', (s) => {
		expect(hasError(s)).toBe(false);
	});
});

describe('atom_query primitives — hybridization', () => {
	it.each(['[^0]', '[^1]', '[^2]', '[^3]', '[^4]', '[^5]'])('parses %s', (s) => {
		expect(hasError(s)).toBe(false);
	});
});

describe('atom_query primitives — element symbols inside brackets', () => {
	it.each(['[Si]', '[Fe]', '[Pd]'])('parses %s (two-letter aliphatic)', (s) => {
		expect(hasError(s)).toBe(false);
	});

	it.each(['[si]', '[as]', '[se]', '[te]'])('parses %s (two-letter aromatic)', (s) => {
		expect(hasError(s)).toBe(false);
	});
});

// ─── recursive_query ──────────────────────────────────────────────────────────

describe('recursive_query', () => {
	it('parses [$(CC)]', () => {
		expect(hasError('[$(CC)]')).toBe(false);
	});

	it('parses [$(c1ccccc1)] (aromatic ring)', () => {
		expect(hasError('[$(c1ccccc1)]')).toBe(false);
	});
});

// ─── chains ───────────────────────────────────────────────────────────────────

describe('chains', () => {
	it('parses CC (implicit bond)', () => {
		expect(hasError('CC')).toBe(false);
		expect(sexp('CC')).toBe(
			'(source_file (smarts (chain (atom (simple_atom)) (atom (simple_atom)))))',
		);
	});

	it('parses C=C (double bond)', () => {
		expect(hasError('C=C')).toBe(false);
		expect(sexp('C=C')).toBe(
			'(source_file (smarts (chain (atom (simple_atom)) (bond_expr (bond_primitive)) (atom (simple_atom)))))',
		);
	});

	it('parses C#N (triple bond)', () => {
		expect(hasError('C#N')).toBe(false);
	});

	it('parses C-C (explicit single bond)', () => {
		expect(hasError('C-C')).toBe(false);
	});

	it('parses C~C (any bond)', () => {
		expect(hasError('C~C')).toBe(false);
	});

	it('parses C:C (aromatic bond)', () => {
		expect(hasError('C:C')).toBe(false);
	});
});

// ─── bond_expr operators ──────────────────────────────────────────────────────

describe('bond_expr operators', () => {
	it('parses C=,~N (bond OR)', () => {
		expect(hasError('C=,~N')).toBe(false);
	});

	it('parses C=&-N (bond high-AND)', () => {
		expect(hasError('C=&-N')).toBe(false);
	});

	it('parses C!=N (bond NOT)', () => {
		expect(hasError('C!=N')).toBe(false);
	});
});

// ─── branches ─────────────────────────────────────────────────────────────────

describe('branches', () => {
	it('parses C(O) (simple branch)', () => {
		expect(hasError('C(O)')).toBe(false);
		expect(sexp('C(O)')).toBe(
			'(source_file (smarts (chain (atom (simple_atom) (branch (chain (atom (simple_atom))))))))',
		);
	});

	it('parses C(=O)O (branch with explicit bond)', () => {
		expect(hasError('C(=O)O')).toBe(false);
	});

	it('parses nested branches C(C(O))', () => {
		expect(hasError('C(C(O))')).toBe(false);
	});
});

// ─── ring closures ────────────────────────────────────────────────────────────

describe('ring closures', () => {
	it('parses C1CCCCC1 (cyclohexane)', () => {
		expect(hasError('C1CCCCC1')).toBe(false);
	});

	it('parses c1ccccc1 (aromatic ring)', () => {
		expect(hasError('c1ccccc1')).toBe(false);
	});

	it('parses C%11CC%11 (two-digit closure)', () => {
		expect(hasError('C%11CC%11')).toBe(false);
	});

	it('parses C=1CCCCC1 (bond on ring closure)', () => {
		expect(hasError('C=1CCCCC1')).toBe(false);
	});
});

// ─── dot-separated fragments ──────────────────────────────────────────────────

describe('dot-separated fragments', () => {
	it('parses C.O (two fragments)', () => {
		expect(hasError('C.O')).toBe(false);
		expect(sexp('C.O')).toBe(
			'(source_file (smarts (chain (atom (simple_atom))) (chain (atom (simple_atom)))))',
		);
	});

	it('parses C.O.N (three fragments)', () => {
		expect(hasError('C.O.N')).toBe(false);
	});
});

// ─── reactions ────────────────────────────────────────────────────────────────

describe('reactions', () => {
	it('parses C>>O (minimal reaction)', () => {
		expect(hasError('C>>O')).toBe(false);
		expect(sexp('C>>O')).toBe(
			'(source_file (reaction reactants: (smarts (chain (atom (simple_atom)))) products: (smarts (chain (atom (simple_atom))))))',
		);
	});

	it('parses C>N>O (reaction with agent)', () => {
		expect(hasError('C>N>O')).toBe(false);
	});

	it('parses >>O (empty reactants and agents)', () => {
		expect(hasError('>>O')).toBe(false);
	});

	it('parses C>> (empty agents and products)', () => {
		expect(hasError('C>>')).toBe(false);
	});
});

// ─── error cases ──────────────────────────────────────────────────────────────

describe('error cases', () => {
	it('flags unclosed bracket [C', () => {
		expect(hasError('[C')).toBe(true);
	});

	it('flags unclosed branch C(C', () => {
		expect(hasError('C(C')).toBe(true);
	});
});
