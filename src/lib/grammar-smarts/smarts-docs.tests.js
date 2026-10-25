import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Parser, Language } from 'web-tree-sitter';
import { buildExplainer } from './smarts-docs.js';
import { elementNameByNumber, elementNameBySymbol } from './elements.js';

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

/**
 * Leaf entries of the explainer as [text, title] pairs.
 * Container entries (bracketed atoms, branches) are replaced by their children.
 *
 * @param {string} smarts
 * @returns {[string, string][]}
 */
function explain(smarts) {
	const tree = parser.parse(smarts);
	if (!tree) throw new Error('parse failed');
	/** @type {[string, string][]} */
	const out = [];
	/** @param {import('./smarts-docs.js').ExplainerEntry[]} entries */
	const walk = (entries) => {
		for (const e of entries) {
			if (e.children) walk(e.children);
			else out.push([e.text, e.doc.title]);
		}
	};
	walk(buildExplainer(tree.rootNode, smarts));
	tree.delete();
	return out;
}

/** Title of a single-atom bracket query like `[D3]`.
 * @param {string} primitive
 */
function title(primitive) {
	const result = explain(`[${primitive}]`);
	expect(result).toHaveLength(1);
	return result[0][1];
}

describe('elements', () => {
	it('has 118 elements with correct ends', () => {
		expect(elementNameByNumber(1)).toBe('Hydrogen');
		expect(elementNameByNumber(6)).toBe('Carbon');
		expect(elementNameByNumber(118)).toBe('Oganesson');
		expect(elementNameByNumber(119)).toBeUndefined();
		expect(elementNameBySymbol('Fe')).toBe('Iron');
	});
});

describe('atoms outside brackets', () => {
	it.each([
		['C', 'Aliphatic Carbon'],
		['N', 'Aliphatic Nitrogen'],
		['Cl', 'Aliphatic Chlorine'],
		['Br', 'Aliphatic Bromine'],
		['c', 'Aromatic Carbon'],
		['n', 'Aromatic Nitrogen'],
		['s', 'Aromatic Sulfur'],
		['*', 'Any atom'],
		['A', 'Any aliphatic atom'],
		['a', 'Any aromatic atom'],
	])('%s -> %s', (smarts, expected) => {
		expect(explain(smarts)).toEqual([[smarts, expected]]);
	});
});

describe('atomic identity in brackets', () => {
	it.each([
		['C', 'Aliphatic Carbon'],
		['c', 'Aromatic Carbon'],
		['Cl', 'Aliphatic Chlorine'],
		['Fe', 'Iron'],
		['Si', 'Silicon'],
		['se', 'Aromatic Selenium'],
		['#6', 'Carbon'],
		['#26', 'Iron'],
		['#200', 'Atomic number 200'],
	])('[%s] -> %s', (primitive, expected) => {
		expect(title(primitive)).toBe(expected);
	});

	it('titles isotope and atom map', () => {
		expect(explain('[13C:2]')).toEqual([
			['13', 'Isotope (mass number) 13'],
			['C', 'Aliphatic Carbon'],
			[':2', 'Atom map 2'],
		]);
	});
});

describe('bare-letter defaults (how-to-smarts)', () => {
	it.each([
		['D', 'Atom with exactly 1 explicit connection'],
		['d', 'Atom with exactly 1 heavy-atom neighbor'],
		['X', 'Atom with exactly 1 total connection'],
		['v', 'Atom with total valence of exactly 1'],
		['H', 'Atom with exactly 1 total hydrogen'],
		['h', 'Atom with at least 1 implicit hydrogen'],
		['R', 'Atom in any ring'],
		['r', 'Atom in any ring'],
		['k', 'Atom in any ring'],
		['x', 'Atom with at least 1 ring bond'],
		['z', 'Atom with at least 1 heteroatom neighbor'],
		['Z', 'Atom with at least 1 aliphatic heteroatom neighbor'],
		['+', 'Charge +1'],
		['-', 'Charge -1'],
		['++', 'Charge +2'],
		['--', 'Charge -2'],
	])('[%s] -> %s', (primitive, expected) => {
		expect(title(primitive)).toBe(expected);
	});
});

describe('exact values', () => {
	it.each([
		['D3', 'Atom with exactly 3 explicit connections'],
		['d2', 'Atom with exactly 2 heavy-atom neighbors'],
		['X4', 'Atom with exactly 4 total connections'],
		['v3', 'Atom with total valence of exactly 3'],
		['H2', 'Atom with exactly 2 total hydrogens'],
		['h2', 'Atom with exactly 2 implicit hydrogens'],
		['R2', 'Atom in exactly 2 rings'],
		['R1', 'Atom in exactly 1 ring'],
		['r5', 'Atom in smallest ring of size 5'],
		['k6', 'Atom in exactly 6-sized ring'],
		['x2', 'Atom with exactly 2 ring bonds'],
		['z2', 'Atom with exactly 2 heteroatom neighbors'],
		['Z1', 'Atom with exactly 1 aliphatic heteroatom neighbor'],
		['+2', 'Charge +2'],
		['-3', 'Charge -3'],
	])('[%s] -> %s', (primitive, expected) => {
		expect(title(primitive)).toBe(expected);
	});
});

describe('range queries', () => {
	it.each([
		['D{2-4}', 'Atom with between 2 and 4 explicit connections'],
		['D{-3}', 'Atom with at most 3 explicit connections'],
		['D{2-}', 'Atom with at least 2 explicit connections'],
		['d{1-2}', 'Atom with between 1 and 2 heavy-atom neighbors'],
		['X{3-4}', 'Atom with between 3 and 4 total connections'],
		['v{2-4}', 'Atom with total valence of between 2 and 4'],
		['h{1-3}', 'Atom with between 1 and 3 implicit hydrogens'],
		['R{1-2}', 'Atom in between 1 and 2 rings'],
		['R{2-}', 'Atom in at least 2 rings'],
		['R{-2}', 'Atom in at most 2 rings'],
		['r{5-7}', 'Atom in smallest ring of size between 5 and 7'],
		['r{5-}', 'Atom in smallest ring of size at least 5'],
		['k{5-6}', 'Atom in ring of size between 5 and 6'],
		['k{-6}', 'Atom in ring of size at most 6'],
		['x{2-3}', 'Atom with between 2 and 3 ring bonds'],
		['z{1-3}', 'Atom with between 1 and 3 heteroatom neighbors'],
		['Z{1-}', 'Atom with at least 1 aliphatic heteroatom neighbor'],
		['+{1-2}', 'Positive charge between 1 and 2'],
		['+{2-}', 'Positive charge at least 2'],
		['-{-2}', 'Negative charge at most 2'],
	])('[%s] -> %s', (primitive, expected) => {
		expect(title(primitive)).toBe(expected);
	});
});

describe('hybridization and chirality', () => {
	it.each([
		['^0', 'S hybridized atom'],
		['^1', 'SP hybridized atom'],
		['^2', 'SP2 hybridized atom'],
		['^3', 'SP3 hybridized atom'],
		['^4', 'SP3D hybridized atom'],
		['^5', 'SP3D2 hybridized atom'],
		['@', 'Anticlockwise chirality'],
		['@@', 'Clockwise chirality'],
		['@TH1', 'Chirality @TH1'],
	])('[%s] -> %s', (primitive, expected) => {
		expect(title(primitive)).toBe(expected);
	});
});

describe('logical operators keep the explicit titles', () => {
	it('OR', () => {
		expect(explain('[C,c]')).toEqual([
			['C', 'Aliphatic Carbon'],
			[',c', 'OR Aromatic Carbon'],
		]);
	});

	it('NOT', () => {
		expect(explain('[!#6]')).toEqual([['!#6', 'NOT Carbon']]);
	});

	it('low-precedence AND with ring and hydrogen', () => {
		expect(explain('[C;R2;!H0]')).toEqual([
			['C', 'Aliphatic Carbon'],
			[';R2', 'Low-AND Atom in exactly 2 rings'],
			[';!H0', 'Low-AND NOT Atom with exactly 0 total hydrogens'],
		]);
	});

	it('implicit AND', () => {
		expect(explain('[CH3]')).toEqual([
			['C', 'Aliphatic Carbon'],
			['H3', 'Atom with exactly 3 total hydrogens'],
		]);
	});

	it('ring size ex with atomic number', () => {
		expect(explain('[#6;k6]')).toEqual([
			['#6', 'Carbon'],
			[';k6', 'Low-AND Atom in exactly 6-sized ring'],
		]);
	});
});

describe('bonds, branches and recursion', () => {
	it('titles bonds', () => {
		expect(explain('C=C#C-C~C@C')).toEqual([
			['C', 'Aliphatic Carbon'],
			['=', 'Double bond'],
			['C', 'Aliphatic Carbon'],
			['#', 'Triple bond'],
			['C', 'Aliphatic Carbon'],
			['-', 'Single bond'],
			['C', 'Aliphatic Carbon'],
			['~', 'Any bond'],
			['C', 'Aliphatic Carbon'],
			['@', 'Any ring bond'],
			['C', 'Aliphatic Carbon'],
		]);
	});

	it('explains atoms inside branches', () => {
		expect(explain('C(=O)[D3]')).toEqual([
			['C', 'Aliphatic Carbon'],
			['=', 'Double bond'],
			['O', 'Aliphatic Oxygen'],
			['D3', 'Atom with exactly 3 explicit connections'],
		]);
	});

	it('explains atoms inside recursive SMARTS', () => {
		const result = explain('[$(c[k5])]');
		expect(result).toContainEqual(['c', 'Aromatic Carbon']);
		expect(result).toContainEqual(['k5', 'Atom in exactly 5-sized ring']);
	});
});
