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
/* Unused for now, as I am not sure how grammar-naming should be */
function sexp(input) {
	return parser.parse(input)?.rootNode.toString();
}

/** True if the tree contains any ERROR or MISSING nodes
 * @param {string} input
 */
function hasError(input) {
	return parser.parse(input)?.rootNode.hasError ?? true;
}

describe('bracketed_atom', () => {
	it('parses [C]', () => {
		expect(hasError('[C]')).toBe(false);
	});

	it('parses [OH] (implicit AND)', () => {
		expect(hasError('[OH]')).toBe(false);
	});

	it('parses [#6] (atomic number)', () => {
		expect(hasError('[#6]')).toBe(false);
	});

	it('parses [13C] (isotope)', () => {
		expect(hasError('[13C]')).toBe(false);
	});

	it('parses [C:1] (atom map)', () => {
		expect(hasError('[C:1]')).toBe(false);
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

describe('atom_expr operators', () => {
	it('parses [C,N] (OR)', () => {
		expect(hasError('[C,N]')).toBe(false);
	});

	it('parses [C&N] (high-AND)', () => {
		expect(hasError('[C&N]')).toBe(false);
	});

	it('parses [C;N] (low-AND)', () => {
		expect(hasError('[C;N]')).toBe(false);
	});

	it('parses [!C] (NOT)', () => {
		expect(hasError('[!C]')).toBe(false);
	});

	it('parses [C,N;O] (precedence: OR then low-AND)', () => {
		expect(hasError('[C,N;O]')).toBe(false);
	});
});

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

describe('recursive_query', () => {
	it('parses [$(CC)]', () => {
		expect(hasError('[$(CC)]')).toBe(false);
	});

	it('parses [$(c1ccccc1)] (aromatic ring)', () => {
		expect(hasError('[$(c1ccccc1)]')).toBe(false);
	});
});

describe('chains', () => {
	it('parses CC (implicit bond)', () => {
		expect(hasError('CC')).toBe(false);
	});

	it('parses C=C (double bond)', () => {
		expect(hasError('C=C')).toBe(false);
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

describe('bond_expr operators', () => {
	it('parses bond operators', () => {
		expect(hasError('C=,~N')).toBe(false);
		expect(hasError('C=&-N')).toBe(false);
		expect(hasError('C!=N')).toBe(false);
	});
});

describe('branches', () => {
	it('parses nested branches C(C(O))', () => {
		expect(hasError('C(C(O))')).toBe(false);
	});
});

describe('ring closures', () => {
	it('parses C1CCCCC1 (cyclohexane)', () => {
		expect(hasError('C1CCCCC1')).toBe(false);
	});
});

describe('dot-separated fragments', () => {
	it('parses fragments', () => {
		expect(hasError('C.O')).toBe(false);
		expect(hasError('C.O.N')).toBe(false);
	});
});

describe('reactions', () => {
	it('parses reactions', () => {
		expect(hasError('C>>O')).toBe(false);
		expect(hasError('C>N>O')).toBe(false);
		expect(hasError('>>O')).toBe(false);
		expect(hasError('C>>')).toBe(false);
	});
});

describe('error cases', () => {
	it('flags unclosed bracket [C', () => {
		expect(hasError('[C')).toBe(true);
	});

	it('flags unclosed branch C(C', () => {
		expect(hasError('C(C')).toBe(true);
	});

	it('H only in bracket atoms', () => {
		expect(hasError('CH')).toBe(true);
	});
});
