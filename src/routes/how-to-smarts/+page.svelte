<script>
	import SmartsDemo from '$lib/components/SmartsDemo.svelte';
</script>

<div class="article">
	<h1>Introduction to SMARTS</h1>

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

	<h2>What is SMARTS?</h2>

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

	<h2>Atom Primitives</h2>

	<p>
		The simplest SMARTS patterns match individual atoms. Atoms are specified inside square brackets
		and can carry multiple constraints joined by logical operators.
	</p>

	<h3>Basic Atom Symbols</h3>

	<ul>
		<li><code>[C]</code> — any aliphatic carbon atom</li>
		<li><code>[c]</code> — any aromatic carbon atom</li>
		<li><code>[#6]</code> — carbon by atomic number (aliphatic or aromatic)</li>
		<li><code>[*]</code> — any atom (wildcard)</li>
	</ul>

	<SmartsDemo smiles="c1ccccc1C(=O)O" smarts={['[c]', '[C]', '[#6]', '[*]']} />

	<h3>Atom Properties</h3>

	<p>Atom primitives can encode charge, hydrogen count, ring membership, and more:</p>

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
				<td><code>H&lt;n&gt;</code></td>
				<td>exactly n hydrogens</td>
				<td><code>[CH3]</code> or <code>[H3]</code></td>
			</tr>
			<tr>
				<td><code>+&lt;n&gt;</code></td>
				<td>positive charge of n</td>
				<td><code>[N+]</code> or <code>[N+3]</code> or <code>[+1]</code></td>
			</tr>
			<tr>
				<td><code>-&lt;n&gt;</code></td>
				<td>negative charge of n</td>
				<td><code>[O-]</code> or <code>[O-2]</code></td>
			</tr>
			<tr>
				<td><code>R&lt;n&gt;</code></td>
				<td>in n rings</td>
				<td><code>[R2]</code> or <code>[cR2]</code></td>
			</tr>
		</tbody>
	</table>
</div>

<SmartsDemo smiles="CCCC=O" smarts={['[*H0]', '[*H1]', '[*H2]', '[*H3]']} />

<SmartsDemo smiles="CCC(N)CC([NH-])CC([NH3+])CC" smarts={['[#7+1]', '[#7-1]', '[#7+0]']} />

<SmartsDemo smiles="c1ccc2c(c1)cc1ccc3cccc4ccc2c1c34" smarts={['[R1]', '[R2]', '[R3]']} />

<div class="article">
	<h2>Bond Primitives</h2>

	<p>
		Bonds between atoms can also be constrained. By default, a bond in a SMARTS pattern matches any
		bond unless specified explicitly.
	</p>

	<ol>
		<li><code>-</code> — single bond</li>
		<li><code>=</code> — double bond</li>
		<li><code>#</code> — triple bond</li>
		<li><code>:</code> — aromatic bond</li>
		<li><code>~</code> — any bond (wildcard)</li>
	</ol>

	<h2>Logical Operators</h2>

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

	<h2>Recursive SMARTS</h2>

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

	<h2>Component-level Grouping</h2>

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

	<h2>Hybridization Queries</h2>

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

	<h2>Heteroatom Neighbor Queries</h2>

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

	<h2>Range Queries</h2>

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

	<h2>Dative Bonds</h2>

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
		<code>[#7]-&gt;*</code> matches the nitrogen as donor, while <code>*&lt;-[#7]</code> matches the platinum
		as acceptor.
	</p>

	<SmartsDemo smiles="CN(C)(C)->[Pt]" smarts={['[#7]->*', '*<-[#7]']} />

	<h2>Examples &amp; Efficiency Tips</h2>

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
