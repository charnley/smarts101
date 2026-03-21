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

	<p>Hybridization, Heteroatom Neighbor, Range Queries, Dative Bonds</p>

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
</div>

<SmartsDemo smiles="CCCC=O" smarts={['[*H0]', '[*H1]', '[*H2]', '[*H3]']} />

<SmartsDemo smiles="CCC(N)CC([NH-])CC([NH3+])CC[13CH3]" smarts={['[#7+1]', '[#7-1]', '[13C]']} />

<SmartsDemo smiles="CC(=O)Oc1ccccc1C(=O)O" smarts={['[D1]', '[r6]']} />

<SmartsDemo smiles="c1ccc2c(c1)cc1ccc3cccc4ccc2c1c34" smarts={['[R1]', '[R2]', '[R3]']} />

<div class="article">
	<HeadingAnchor id="logical-operators">Logical Operators</HeadingAnchor>

	<p>Atom and bond primitives can be combined using logical operators to build complex queries:</p>

	<ul>
		<li><code>&amp;</code> — high-precedence AND (implicit between primitives)</li>
		<li><code>,</code> — OR</li>
		<li><code>;</code> — low-precedence AND</li>
		<li><code>!</code> — NOT</li>
	</ul>

	<SmartsDemo smiles="CN(C)CCN" smarts={['[n,N;!H0]']} />

	<HeadingAnchor id="bond-primitives">Bond Primitives</HeadingAnchor>

	<p>
		Bonds between atoms can also be constrained. An unspecified bond in a SMARTS pattern matches
		either a single or aromatic bond.
	</p>

	<ul>
		<li><code>-</code> — single bond</li>
		<li><code>=</code> — double bond</li>
		<li><code>#</code> — triple bond</li>
		<li><code>:</code> — aromatic bond</li>
		<li><code>~</code> — any bond (wildcard)</li>
		<li><code>@</code> — any ring bond</li>
		<li><code>/</code> — directional bond "up" (for E/Z stereo)</li>
		<li><code>\</code> — directional bond "down" (for E/Z stereo)</li>
		<li><code>/?</code> — directional "up" or unspecified</li>
		<li><code>\?</code> — directional "down" or unspecified</li>
	</ul>

	<SmartsDemo smiles="FC1=CC(N)=CC=C1" smarts={['*!@*']} />

	<HeadingAnchor id="chirality">Chirality</HeadingAnchor>

	<p>
		Tetrahedral chirality can be specified using <code>@</code> (anticlockwise) and <code>@@</code>
		(clockwise), looking from first neighbour, following the same convention as SMILES. When included in a SMARTS pattern, chirality
		is used as a matching constraint — unspecified chirality in the query matches both enantiomers.
	</p>

	<!-- https://greglandrum.github.io/rdkit-blog/posts/2025-12-21-Chiral-atoms.html -->

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
			<!-- <tr> -->
			<!-- 	<td><code>@?</code></td> -->
			<!-- 	<td>anticlockwise or chirality unspecified</td> -->
			<!-- 	<td><code>[C@?H]</code></td> -->
			<!-- </tr> -->
			<!-- <tr> -->
			<!-- 	<td><code>@@?</code></td> -->
			<!-- 	<td>clockwise or chirality unspecified</td> -->
			<!-- 	<td><code>[C@@?H]</code></td> -->
			<!-- </tr> -->
		</tbody>
	</table>

	<!-- TODO Something seems off here -->
	<!-- not supported: Non-tetrahedral chiral classes -->
	<!-- not supported: the @? operator -->

	<!-- TODO Move @? to a note -->
	<!-- TODO note about rdkit.js substructure match -->

	<SmartsDemo smiles="C[C@H](F)Cl" smarts={['Cl[C@@H](F)C', 'C[C@H](F)Cl']} />
	<SmartsDemo smiles="Br[C@H](F)CCC[C@@H](Br)F" smarts={['Br[#6](C)F', 'Br[#6@H](C)F', 'Br[#6@@H](C)F']} />

	<HeadingAnchor id="recursive-smarts">Recursive SMARTS</HeadingAnchor>

	<p>
		Any SMARTS expression can be used to define an atomic environment by anchoring it on the atom of
		interest using the <code>$(...)</code> syntax. These expressions behave like atomic primitives and
		can be combined with other primitives using logical operators.
	</p>

	<ul>
		<li><code>[$(*C)]</code> — atom connected to a methyl (or methylene) carbon</li>
		<li><code>[$(*C);$(*CC)]</code> — atom connected to both methyl and ethyl sidegroups</li>
	</ul>

	<SmartsDemo smiles="c1cc(O)c(C)cc1N" smarts={['[$(*cN),$(*C)]']} />

	<HeadingAnchor id="component-level-grouping">Component-level Grouping</HeadingAnchor>

	<p>
		A dot (<code>.</code>) in a SMARTS pattern separates disconnected fragments.
		Each fragment can match anywhere in the target — there is no constraint on which component it belongs to.
	</p>

	<ul>
		<li>
			<code>C.O</code> carbon and oxygen found in the SMILES. Will match atoms in <code>CCO</code> and <code>CC.OO</code>
		</li>
		<li><code>C.O</code> does not match <code>CCC</code>, because there is no oxygen present</li>
	</ul>

	<SmartsDemo smiles="NCCO" smarts={['N.O']} />

	<SmartsDemo smiles="CO.CO.CN" smarts={['O.O.N']} useCoordgen={true} />

	Note: The Daylight SMARTS syntax defines component-level grouping using zero-level parentheses (e.g. <code>(C).(C)</code> to require matches in separate components), but this is not supported in RDKit.
	In RDKit, parentheses are only used for branching, and <code>(C).(C)</code> is a parse error.
	Additionally, <code>.</code> does not enforce matching across different disconnected fragments, so <code>C.C</code> can match within a single molecule.
	To correctly handle fragment-level constraints, split the molecule first (e.g. with <a href="https://www.rdkit.org/docs/source/rdkit.Chem.rdmolops.html#rdkit.Chem.rdmolops.GetMolFrags"><code>Chem.GetMolFrags</code></a>) and match each fragment separately or post-filter the results.

	<!-- <p class="article-muted"> -->
	<!-- 	To search within individual fragments, split the molecule first using -->
	<!-- 	<code>Chem.GetMolFrags(mol, asMols=True)</code> and run the query on each fragment separately. -->
	<!-- </p> -->

	<!-- <p class="article-muted"> -->
	<!-- 	Note: the Daylight SMARTS standard defines a component-level grouping syntax using zero-level -->
	<!-- 	parentheses — e.g. <code>(C).(C)</code> to require matches in two separate components. RDKit -->
	<!-- 	does not support this syntax; <code>(C).(C)</code> is a parse error. -->
	<!-- </p> -->

	<HeadingAnchor id="hybridization-queries">Hybridization Queries</HeadingAnchor>

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
