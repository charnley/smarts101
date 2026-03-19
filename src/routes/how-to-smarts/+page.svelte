<script>
	import SmartsDemo from '$lib/components/SmartsDemo.svelte';
	import HeadingAnchor from '$lib/components/HeadingAnchor.svelte';
</script>

<div class="article">
	<HeadingAnchor id="introduction-to-smarts" level="h1">Introduction to SMARTS</HeadingAnchor>

	<p>
		Standing on the shoulders of giants, SMARTS was developed by Daylight Chemical Information
		Systems, the same company that introduced SMILES. The documentation here is heavily inspired by
		the original
		<a href="https://www.daylight.com/dayhtml/doc/theory/theory.smarts.html"
			>Daylight SMARTS theory</a
		>. In this documentation we are following the implementation by
		<a href="https://www.rdkit.org/docs/RDKit_Book.html">RDKit</a>, which also includes syntax
		extensions by <a href="https://docs.chemaxon.com/display/docs/smarts.md">ChemAxon</a>.
	</p>

	<HeadingAnchor id="what-is-smarts">What is SMARTS?</HeadingAnchor>

	<p>
		SMARTS (SMiles ARbitrary Target Specification) is a language for describing molecular patterns
		and properties. It extends the SMILES notation to allow expressive queries over chemical
		structures, making it possible to search, filter, and classify molecules based on substructure
		patterns.
	</p>

	<p>
		In the SMILES language we have <strong>atoms</strong> and <strong>bonds</strong>. The same is
		true in SMARTS, which is further extended with <strong>property filters</strong> and
		<strong>logical operators</strong>.
	</p>

	<HeadingAnchor id="atom-primitives">Atom Primitives</HeadingAnchor>

	<p>
		The simplest SMARTS patterns match individual atoms. Atoms are specified inside square brackets
		and can carry multiple constraints joined by logical operators.
	</p>

	<HeadingAnchor id="basic-atom-symbols" level="h3">Basic Atom Symbols</HeadingAnchor>

	<ul>
		<li><code>[C]</code> — any aliphatic carbon atom</li>
		<li><code>[c]</code> — any aromatic carbon atom</li>
		<li><code>[#6]</code> — carbon by atomic number (aliphatic or aromatic)</li>
		<li><code>[*]</code> — any atom (wildcard)</li>
	</ul>

	<SmartsDemo smiles="c1ccccc1C(=O)O" smarts={['[c]', '[C]', '[#6]', '[*]']} />

	<HeadingAnchor id="atom-properties" level="h3">Atom Properties</HeadingAnchor>

	<p>
		Atom primitives can encode aromaticity, charge, hydrogen count, degree, valence, ring
		membership, and more. All primitives can be combined inside <code>[...]</code> using logical operators.
	</p>

	<table>
		<thead>
			<tr>
				<th>Primitive</th>
				<th>Meaning</th>
				<th>Default</th>
				<th>Example</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>a</code></td>
				<td>aromatic atom</td>
				<td>—</td>
				<td><code>[a]</code></td>
			</tr>
			<tr>
				<td><code>A</code></td>
				<td>aliphatic atom</td>
				<td>—</td>
				<td><code>[A]</code></td>
			</tr>
			<tr>
				<td><code>H&lt;n&gt;</code></td>
				<td>total hydrogen count</td>
				<td>exactly 1</td>
				<td><code>[CH3]</code></td>
			</tr>
			<tr>
				<td><code>h&lt;n&gt;</code></td>
				<td>implicit hydrogen count</td>
				<td>at least 1</td>
				<td><code>[Ch2]</code></td>
			</tr>
			<tr>
				<td><code>D&lt;n&gt;</code></td>
				<td>explicit degree (connections, not counting implicit H)</td>
				<td>exactly 1</td>
				<td><code>[D3]</code></td>
			</tr>
			<tr>
				<td><code>d&lt;n&gt;</code></td>
				<td>non-hydrogen degree</td>
				<td>exactly 1</td>
				<td><code>[d2]</code></td>
			</tr>
			<tr>
				<td><code>X&lt;n&gt;</code></td>
				<td>total connectivity (including implicit H)</td>
				<td>exactly 1</td>
				<td><code>[X4]</code></td>
			</tr>
			<tr>
				<td><code>v&lt;n&gt;</code></td>
				<td>total valence (sum of bond orders)</td>
				<td>exactly 1</td>
				<td><code>[v4]</code></td>
			</tr>
			<tr>
				<td><code>R&lt;n&gt;</code></td>
				<td>number of SSSR (Smallest Set of Smallest Rings) rings atom is in</td>
				<td>any ring atom</td>
				<td><code>[R2]</code></td>
			</tr>
			<tr>
				<td><code>r&lt;n&gt;</code></td>
				<td>size of smallest SSSR ring</td>
				<td>any ring atom</td>
				<td><code>[r5]</code></td>
			</tr>
			<tr>
				<td><code>x&lt;n&gt;</code></td>
				<td>number of ring bonds</td>
				<td>at least 1</td>
				<td><code>[x2]</code></td>
			</tr>
			<tr>
				<td><code>+&lt;n&gt;</code></td>
				<td>positive formal charge</td>
				<td>+1</td>
				<td><code>[N+]</code>, <code>[+2]</code></td>
			</tr>
			<tr>
				<td><code>-&lt;n&gt;</code></td>
				<td>negative formal charge</td>
				<td>-1</td>
				<td><code>[O-]</code>, <code>[O-2]</code></td>
			</tr>
			<tr>
				<td><code>#&lt;n&gt;</code></td>
				<td>atomic number</td>
				<td>—</td>
				<td><code>[#6]</code>, <code>[#7]</code></td>
			</tr>
			<tr>
				<td><code>&lt;n&gt;</code></td>
				<td>atomic mass (isotope)</td>
				<td>unspecified</td>
				<td><code>[13C]</code>, <code>[35Cl]</code></td>
			</tr>
		</tbody>
	</table>

	<SmartsDemo smiles="CC(=O)Oc1ccccc1C(=O)O" smarts={['[D1]', '[D2]', '[D3]', '[R]', '[r6]']} />
</div>

<SmartsDemo smiles="CCCC=O" smarts={['[*H0]', '[*H1]', '[*H2]', '[*H3]']} />

<SmartsDemo smiles="CCC(N)CC([NH-])CC([NH3+])CC" smarts={['[#7+1]', '[#7-1]', '[#7+0]']} />

<SmartsDemo smiles="c1ccc2c(c1)cc1ccc3cccc4ccc2c1c34" smarts={['[R1]', '[R2]', '[R3]']} />

<div class="article">
	<HeadingAnchor id="bond-primitives">Bond Primitives</HeadingAnchor>

	<p>
		Bonds between atoms can also be constrained. An unspecified bond in a SMARTS pattern matches
		either a single or aromatic bond.
	</p>

	<table>
		<thead>
			<tr>
				<th>Symbol</th>
				<th>Meaning</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>-</code></td>
				<td>single bond</td>
			</tr>
			<tr>
				<td><code>=</code></td>
				<td>double bond</td>
			</tr>
			<tr>
				<td><code>#</code></td>
				<td>triple bond</td>
			</tr>
			<tr>
				<td><code>:</code></td>
				<td>aromatic bond</td>
			</tr>
			<tr>
				<td><code>~</code></td>
				<td>any bond (wildcard)</td>
			</tr>
			<tr>
				<td><code>@</code></td>
				<td>any ring bond</td>
			</tr>
			<tr>
				<td><code>/</code></td>
				<td>directional bond "up" (for E/Z stereo)</td>
			</tr>
			<tr>
				<td><code>\</code></td>
				<td>directional bond "down" (for E/Z stereo)</td>
			</tr>
			<tr>
				<td><code>/?</code></td>
				<td>directional "up" or unspecified</td>
			</tr>
			<tr>
				<td><code>\?</code></td>
				<td>directional "down" or unspecified</td>
			</tr>
		</tbody>
	</table>

	<p class="article-muted">
		Example: <code>*!@*</code> matches two atoms connected by a non-ring bond. <code>F/C=C/F</code>
		matches trans-difluoroethylene.
	</p>

	<HeadingAnchor id="logical-operators">Logical Operators</HeadingAnchor>

	<p>Atom and bond primitives can be combined using logical operators to build complex queries:</p>

	<ul>
		<li><code>&amp;</code> — high-precedence AND (implicit between primitives)</li>
		<li><code>,</code> — OR</li>
		<li><code>;</code> — low-precedence AND</li>
		<li><code>!</code> — NOT</li>
	</ul>

	<p class="article-muted">
		Example: <code>[n,N;!H0]</code> matches any nitrogen (aromatic or aliphatic) that has at least one
		hydrogen.
	</p>

	<HeadingAnchor id="chirality">Chirality</HeadingAnchor>

	<p>
		Tetrahedral chirality can be specified using <code>@</code> (anticlockwise) and <code>@@</code>
		(clockwise), following the same convention as SMILES. When included in a SMARTS pattern, chirality
		is used as a matching constraint — unspecified chirality in the query matches both enantiomers.
	</p>

	<table>
		<thead>
			<tr>
				<th>Primitive</th>
				<th>Meaning</th>
				<th>Example</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>@</code></td>
				<td>anticlockwise (looking from first neighbour)</td>
				<td><code>[C@H]</code></td>
			</tr>
			<tr>
				<td><code>@@</code></td>
				<td>clockwise (looking from first neighbour)</td>
				<td><code>[C@@H]</code></td>
			</tr>
			<tr>
				<td><code>@?</code></td>
				<td>anticlockwise or chirality unspecified</td>
				<td><code>[C@?H]</code></td>
			</tr>
			<tr>
				<td><code>@@?</code></td>
				<td>clockwise or chirality unspecified</td>
				<td><code>[C@@?H]</code></td>
			</tr>
		</tbody>
	</table>

	<p class="article-muted">
		Example: <code>C[C@H](F)Cl</code> matches only one enantiomer of chlorofluoromethylmethane.
		Using <code>C[CH](F)Cl</code> (no chirality) matches both.
	</p>

	<HeadingAnchor id="recursive-smarts">Recursive SMARTS</HeadingAnchor>

	<p>
		Any SMARTS expression can be used to define an atomic environment by anchoring it on the atom of
		interest using the <code>$(...)</code> syntax. These expressions behave like atomic primitives and
		can be combined with other primitives using logical operators.
	</p>

	<table>
		<thead>
			<tr>
				<th>SMARTS</th>
				<th>Meaning</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>[$(*C)]</code></td>
				<td>atom connected to a methyl (or methylene) carbon</td>
			</tr>
			<tr>
				<td><code>[$(*CC)]</code></td>
				<td>atom connected to an ethyl carbon</td>
			</tr>
			<tr>
				<td><code>[$(*C);$(*CC)]</code></td>
				<td>atom satisfying both environments above (matches CCC)</td>
			</tr>
			<tr>
				<td><code>C[$(aaO);$(aaaN)]</code></td>
				<td>carbon ortho to O and meta to N on an aromatic ring (all orientations)</td>
			</tr>
		</tbody>
	</table>

	<SmartsDemo smiles="c1cc(O)c(C)cc1N" smarts={['[$(*C)]', '[$(*CC)]', '[$(*C);$(*CC)]']} />

	<HeadingAnchor id="component-level-grouping">Component-level Grouping</HeadingAnchor>

	<p>
		Zero-level parentheses group disconnected fragments and constrain which component of the target
		they must match within. Without grouping, dot-separated fragments can match anywhere across the
		target.
	</p>

	<table>
		<thead>
			<tr>
				<th>SMARTS</th>
				<th>Target</th>
				<th>Match?</th>
				<th>Reason</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>C.C</code></td>
				<td><code>CCCC</code></td>
				<td>Yes</td>
				<td>no grouping — both carbons match anywhere</td>
			</tr>
			<tr>
				<td><code>(C.C)</code></td>
				<td><code>CCCC</code></td>
				<td>Yes</td>
				<td>both carbons must be in the same component</td>
			</tr>
			<tr>
				<td><code>(C).(C)</code></td>
				<td><code>CCCC</code></td>
				<td>No</td>
				<td>query requires two different components</td>
			</tr>
			<tr>
				<td><code>(C).(C)</code></td>
				<td><code>CCCC.CCCC</code></td>
				<td>Yes</td>
				<td>two separate components available in target</td>
			</tr>
		</tbody>
	</table>

	<HeadingAnchor id="hybridization-queries">Hybridization Queries</HeadingAnchor>

	<div class="article-infobox">RDKit extension — not part of the Daylight SMARTS standard.</div>

	<p>
		Atoms can be matched by hybridization state using the <code>^</code> primitive followed by a number.
	</p>

	<table>
		<thead>
			<tr>
				<th>Primitive</th>
				<th>Hybridization</th>
			</tr>
		</thead>
		<tbody>
			<tr><td><code>^0</code></td><td>S</td></tr>
			<tr><td><code>^1</code></td><td>SP</td></tr>
			<tr><td><code>^2</code></td><td>SP2</td></tr>
			<tr><td><code>^3</code></td><td>SP3</td></tr>
			<tr><td><code>^4</code></td><td>SP3D</td></tr>
			<tr><td><code>^5</code></td><td>SP3D2</td></tr>
		</tbody>
	</table>

	<SmartsDemo smiles="CC=CF" smarts={['[^3]', '[^2]']} />

	<HeadingAnchor id="heteroatom-neighbor-queries">Heteroatom Neighbor Queries</HeadingAnchor>

	<div class="article-infobox">RDKit extension — not part of the Daylight SMARTS standard.</div>

	<p>
		Two primitives match atoms based on the number of heteroatom neighbors (non-C, non-H) they have:
	</p>

	<table>
		<thead>
			<tr>
				<th>Primitive</th>
				<th>Meaning</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>z&lt;n&gt;</code></td>
				<td>exactly <em>n</em> heteroatom neighbors (aromatic or aliphatic)</td>
			</tr>
			<tr>
				<td><code>Z&lt;n&gt;</code></td>
				<td>exactly <em>n</em> aliphatic heteroatom neighbors</td>
			</tr>
		</tbody>
	</table>

	<SmartsDemo smiles="O=C(O)c1nc(O)ccn1" smarts={['[z2]', '[Z2]', '[Z1]']} />

	<HeadingAnchor id="range-queries">Range Queries</HeadingAnchor>

	<div class="article-infobox">RDKit extension — not part of the Daylight SMARTS standard.</div>

	<p>
		Many numeric primitives accept a range in curly braces instead of a fixed value. Supported
		primitives: <code>D</code>, <code>h</code>, <code>r</code>, <code>R</code>, <code>v</code>,
		<code>x</code>, <code>X</code>, <code>z</code>, <code>Z</code>, <code>+</code>, <code>-</code>.
	</p>

	<table>
		<thead>
			<tr>
				<th>Syntax</th>
				<th>Meaning</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>D&#123;2-4&#125;</code></td>
				<td>between 2 and 4 explicit connections (inclusive)</td>
			</tr>
			<tr>
				<td><code>D&#123;-3&#125;</code></td>
				<td>at most 3 explicit connections</td>
			</tr>
			<tr>
				<td><code>D&#123;2-&#125;</code></td>
				<td>at least 2 explicit connections</td>
			</tr>
		</tbody>
	</table>

	<SmartsDemo smiles="CC(=O)OC" smarts={['[D{2-3}]', '[z{1-}]']} />

	<HeadingAnchor id="dative-bonds">Dative Bonds</HeadingAnchor>

	<div class="article-infobox">RDKit extension — not part of the Daylight SMARTS standard.</div>

	<p>
		Dative bonds can be matched directionally. Direction matters — swapping <code>-&gt;</code> and
		<code>&lt;-</code> will not match the same atoms.
	</p>

	<table>
		<thead>
			<tr>
				<th>Symbol</th>
				<th>Meaning</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>-&gt;</code></td>
				<td>dative bond pointing right (donor → acceptor)</td>
			</tr>
			<tr>
				<td><code>&lt;-</code></td>
				<td>dative bond pointing left (acceptor ← donor)</td>
			</tr>
		</tbody>
	</table>

	<p>
		In the example below, the nitrogen in trimethylamine donates a dative bond to platinum.
		<code>[#7]-&gt;*</code> matches the nitrogen as donor, while <code>*&lt;-[#7]</code> matches the
		platinum as acceptor. For example for <code>[Fe]->CC1=O.CN(C1)(C)->[Pt]</code>.
	</p>

	<SmartsDemo smiles="[Fe]->CC1=O.CN(C1)(C)->[Pt]" smarts={['[#7]->[*]', '[*]->[#6]']} />

	<HeadingAnchor id="examples-efficiency-tips">Examples &amp; Efficiency Tips</HeadingAnchor>

	<p>A selection of useful SMARTS patterns:</p>

	<table>
		<thead>
			<tr>
				<th>SMARTS</th>
				<th>Meaning</th>
			</tr>
		</thead>
		<tbody>
			<tr><td><code>cc</code></td><td>any pair of attached aromatic carbons</td></tr>
			<tr><td><code>c:c</code></td><td>aromatic carbons joined by an aromatic bond</td></tr>
			<tr
				><td><code>c-c</code></td><td>aromatic carbons joined by a single bond (e.g. biphenyl)</td
				></tr
			>
			<tr><td><code>[O;H1]</code></td><td>hydroxy oxygen</td></tr>
			<tr><td><code>[O;D1]</code></td><td>1-connected oxygen (hydroxy or hydroxide)</td></tr>
			<tr><td><code>[O;D2]</code></td><td>2-connected (etheric) oxygen</td></tr>
			<tr><td><code>[C,c]</code></td><td>any carbon (aromatic or aliphatic)</td></tr>
			<tr><td><code>[F,Cl,Br,I]</code></td><td>the first four halogens</td></tr>
			<tr><td><code>[N;R]</code></td><td>aliphatic nitrogen in a ring</td></tr>
			<tr><td><code>[n;H1]</code></td><td>H-pyrrole nitrogen</td></tr>
			<tr><td><code>*!@*</code></td><td>two atoms connected by a non-ring bond</td></tr>
			<tr
				><td><code>[C,c]=,#[C,c]</code></td><td>two carbons connected by a double or triple bond</td
				></tr
			>
		</tbody>
	</table>

	<p>Tips for writing efficient SMARTS (patterns are evaluated left to right):</p>

	<ul>
		<li>Place uncommon atoms or bond arrangements early in the pattern.</li>
		<li>In an AND expression, put the less common specification first.</li>
		<li>In an OR expression, put the less common specification last.</li>
	</ul>
</div>
