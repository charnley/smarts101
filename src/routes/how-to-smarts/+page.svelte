<script>
	import SmartsDemo from '$lib/components/SmartsDemo.svelte';
	import HeadingAnchor from '$lib/components/HeadingAnchor.svelte';
</script>

<svelte:head>
	<title>SMARTS101 - Learn SMARTS</title>
	<meta
		name="description"
		content="A comprehensive guide to SMARTS syntax: atoms, bonds, logical operators, chirality, and recursive SMARTS."
	/>
</svelte:head>

<div class="article">
	<HeadingAnchor level="h1">Introduction to SMARTS</HeadingAnchor>

	<p>
		Standing on the shoulders of giants, SMARTS was developed by Daylight Chemical Information
		Systems, the same company that introduced SMILES. The documentation here is heavily inspired by
		the original
		<a href="https://www.daylight.com/dayhtml/doc/theory/theory.smarts.html"
			>Daylight SMARTS theory</a
		>. In this documentation we are following the implementation by
		<a href="https://www.rdkit.org/docs/RDKit_Book.html">RDKit</a>, which includes many extensions
		like Hybridization, Heteroatom Neighbor, Range Queries and Dative Bonds.
	</p>

	<HeadingAnchor>What is SMARTS?</HeadingAnchor>

	<p>
		SMARTS (SMiles ARbitrary Target Specification) is a language for describing molecular patterns
		and properties. It extends the SMILES notation to allow expressive queries over chemical
		structures, making it possible to search, filter, and classify molecules based on substructure
		patterns. In the SMILES language we have <strong>atoms</strong> and <strong>bonds</strong>. The
		same is true in SMARTS, which is further extended with <strong>property filters</strong> and
		<strong>logical operators</strong>.
	</p>

	<p>
		The simplest SMARTS patterns match individual atoms. Either as bracket or non-bracket.
		Non-bracket follows SMILES notation. Atoms are specified inside square brackets <code>[ ]</code>
		and can carry multiple constraints joined by logical operators.
	</p>

	<HeadingAnchor level="h2">Atomic Identity</HeadingAnchor>

	<p>
		Any element symbol in brackets matches that element with the given aromaticity. Lower case atom
		means explicit aromatic, and capitalized means explicitly aliphatic (not-aromatic) atom. Or by
		the atomic number (<code>#&lt;n&gt;</code>), which matches regardless of aromaticity.
	</p>
	<p>
		A number pre-fixed on the atom designates the isotope.

		<code>[35Cl]</code> matches chlorine-35.
		<!-- A bare number without an element, e.g. <code>[13]</code>, is a valid isotope-only query that matches any atom with that mass number. -->
	</p>

	<p>
		Aromaticity atomic queries works for Boron <code>b</code>, Carbon <code>c</code>, Nitrogen
		<code>n</code>, Oxygen <code>o</code>, Phosphorus <code>p</code>, and Sulfur <code>s</code>.
	</p>

	<ul>
		<li>
			<code>[C]</code> - Explicit aliphatic (non-aromatic) carbon.
		</li>
		<li><code>[c]</code> - Explicit aromatic carbon.</li>
		<li>
			<code>[#6]</code>
			matches both <code>C</code> and <code>c</code>.
		</li>
		<li>
			<code>[13C]</code> - isotope (atomic mass), matches carbon-13.
		</li>
	</ul>

	<SmartsDemo smiles="c1ccoc1C(O)[13CH3]" smarts={['[#8]', '[o]', '[O]', '[13C]']} />

	<HeadingAnchor level="h2">Wildcards and Aromaticity</HeadingAnchor>

	<p>Three special tokens match atoms by aromaticity alone, without constraining the element:</p>

	<ul>
		<li><code>[*]</code> - wildcard; matches any atom regardless of element or aromaticity.</li>
		<li><code>[a]</code> - matches any aromatic atom.</li>
		<li><code>[A]</code> - matches any aliphatic (non-aromatic) atom.</li>
	</ul>

	<p>
		Outside atomic brackets (<code>[a][a]</code>), the same tokens work (<code>aa</code>).
	</p>

	<SmartsDemo smiles="c1ccccc1CO" smarts={['[*]', '[a]', '[A]']} />

	<HeadingAnchor level="h2">Hydrogen Count</HeadingAnchor>

	<p>
		Two separate primitives control hydrogen matching. They are distinct and can appear together
		inside <code>[...]</code>:
	</p>

	<ul>
		<li>
			<code>H&lt;n&gt;</code> - total attached hydrogen count. The explicit hydrogen atoms or implied.
		</li>
		<li>
			<code>h&lt;n&gt;</code> - implicit hydrogen count. Bare <code>h</code> means "has any implicit hydrogens".
		</li>
	</ul>

	<p><code>H</code> without explicit count defaults to 1.</p>

	<p>
		Example: <code>[CH3]</code> matches a carbon with exactly 3 attached hydrogens, and
		<code>[Ch2]</code> means exactly 2 implicit hydrogens.
	</p>

	<p>
		In practise you would use the different queries of explicit and implicit hydrogens when you load
		molecules from MolBlock/SDF format.
	</p>

	<SmartsDemo smiles="CCCC=O" smarts={['[*H0]', '[*H1]', '[*H2]', '[*H3]']} />

	<HeadingAnchor level="h2">Degree and Connectivity</HeadingAnchor>

	<ul>
		<li>
			<code>D&lt;n&gt;</code> - the number of explicit (non-implicit-Hydrogen) bonds connected to atom.
		</li>
		<li>
			<code>d&lt;n&gt;</code> - the number of heavy-atom (non-Hydrogen) neighbors.
		</li>
		<li>
			<code>X&lt;n&gt;</code> - total number of bonds including implicit hydrogens (total Connectivity).
		</li>
		<li>
			<code>v&lt;n&gt;</code> - the sum of bond orders of all bonds (total valence).
		</li>
	</ul>

	<p>
		Without explicit number <code>D</code>, <code>d</code>, <code>X</code> and <code>v</code> defaults
		to exactly 1.
	</p>

	<SmartsDemo smiles="CC(=O)Oc1ccccc1C(=O)O" smarts={['[d1]', '[X1]', '[D3]']} />

	<HeadingAnchor level="h2">Ring Membership</HeadingAnchor>

	<ul>
		<li>
			<code>R&lt;n&gt;</code> - number of rings the atom belongs to.
		</li>
		<li>
			<!-- <code>r&lt;n&gt;</code> - minimum ring size the atom is part of. -->
			<code>r&lt;n&gt;</code> - smallest ring size containing this atom. Size of smallest set of smallest
			rings (SSSR) minimum.
		</li>
		<li>
			<code>k&lt;n&gt;</code> - ring membership by exact ring size.
		</li>
		<li>
			<code>x&lt;n&gt;</code> - number of ring bonds to atom.
		</li>
	</ul>

	<p>
		Bare <code>[R,r,k,x]</code> (no numbers) for all four are "greater than zero" ring connections,
		and all support range queries (e.g. <code>[k&#123;5-6&#125;]</code>).
	</p>

	<p>
		<code>[R2]</code> matches an atom that is in exactly 2 rings (e.g. a ring fusion atom).
		<code>[r5]</code> matches an atom whose smallest containing ring has exactly 5 members.
		<code>[k5]</code> matches an atom that belongs to a ring of exactly 5 members (unlike
		<code>r5</code>, which checks the minimum size).
	</p>

	<p>
		Want to go deeper into finding rings? <a
			href="https://www.rdkit.org/docs/RDKit_Book.html#ring-finding-and-sssr"
			>https://www.rdkit.org/docs/RDKit_Book.html#ring-finding-and-sssr</a
		>
	</p>

	<SmartsDemo smiles="c1ccc2c(c1)cc1ccc3cccc4ccc2c1c34" smarts={['[x2]', '[R2]', '[R3]']} />

	<SmartsDemo smiles="C1CC2CCCC2CC1" smarts={['[k5]', '[r6]']} />

	<HeadingAnchor level="h2">Formal Charge</HeadingAnchor>

	<ul>
		<li>
			<code>+&lt;n&gt;</code> - positive formal charge.
		</li>
		<li>
			<code>-&lt;n&gt;</code> - negative formal charge.
		</li>
	</ul>

	<p>
		Bare <code>+</code> means <code>+1</code>, and <code>++</code> is the same as <code>+2</code>.
		Equivalent for <code>-</code> and <code>--</code>.
	</p>

	<SmartsDemo smiles="CCC([N-2])CC([NH-])CC([NH3+])CC(N)CC" smarts={['[*;+]', '[N-1]', '[--]']} />

	<HeadingAnchor level="h2">Heteroatom Neighbors</HeadingAnchor>

	<p>Match atoms based on the number of heteroatom neighbors (non-C, non-H).</p>

	<ul>
		<li>
			<code>z&lt;n&gt;</code> - exactly <em>n</em> heteroatom neighbors (aromatic or aliphatic).
		</li>
		<li>
			<code>Z&lt;n&gt;</code> - exactly <em>n</em> aliphatic heteroatom neighbors.
		</li>
	</ul>

	<p>
		Bare <code>z</code> and <code>Z</code> means "has any neighbor" of that type.
	</p>

	<SmartsDemo smiles="O=C(O)c1nc(O)ccn1" smarts={['[z2]', '[Z2]', '[Z1]']} />

	<HeadingAnchor level="h2">Hybridization</HeadingAnchor>

	<p>
		The <code>^</code> matches atoms by hybridization state. It requires a digit and does not have a default
		value.
	</p>

	<ul>
		<li><code>[^0]</code> - S</li>
		<li><code>[^1]</code> - SP</li>
		<li><code>[^2]</code> - SP2</li>
		<li><code>[^3]</code> - SP3</li>
		<li><code>[^4]</code> - SP3D</li>
		<li><code>[^5]</code> - SP3D2</li>
	</ul>

	<SmartsDemo smiles="CC=CF" smarts={['[^3]', '[^2]']} />

	<HeadingAnchor>Logical Operators</HeadingAnchor>

	<p>
		Atom and bond primitives can be combined using logical operators to build complex queries:
		Operator priority, lowest to highest:
	</p>

	<ul>
		<li><code>;</code> - low-precedence AND.</li>
		<li><code>,</code> - OR.</li>
		<li><code>&amp;</code> - high-precedence AND (explicit).</li>
		<li><code>!</code> - NOT operation.</li>
	</ul>

	<!-- <p> -->
	<!-- 	<code>;</code> <code>,</code> <code>&amp;</code> <code>!</code>. -->
	<!-- </p> -->

	<p>Example; <code>[!C]</code> matches any non-carbon atom.</p>

	<p>
		No operator between two primitives is equivalent to an implicit <code>&amp;</code>. So
		<code>[CH3]</code>
		is the same as <code>[C&amp;H3]</code>.
	</p>

	<SmartsDemo smiles="OCN(C)C(=O)CN" smarts={['[O,N;!H0]']} />

	<HeadingAnchor>Bond primitives</HeadingAnchor>

	<!-- unless specified, bonds are "any", you can combine bonds with logival operators -->

	<p>Bonds between atoms can also be constrained.</p>

	<ul>
		<li><code>-</code> - single bond</li>
		<li><code>=</code> - double bond</li>
		<li><code>#</code> - triple bond</li>
		<li><code>&dollar;</code> - quadruple bond</li>
		<li><code>:</code> - aromatic bond</li>
		<li><code>~</code> - any bond (wildcard)</li>
		<li><code>@</code> - any ring bond</li>
		<li><code>/</code> - directional bond "up" (for E/Z stereo)</li>
		<li><code>\</code> - directional bond "down" (for E/Z stereo)</li>
	</ul>

	<p>
		An unspecified bond in a SMARTS pattern matches either a single or aromatic bond.
		<code>CC</code> is the same as <code>C-C</code>, and <code>cc</code> is the same as
		<code>c:c</code>.
		<code>[#6][#6]</code> will match both aromatic and single bonds.
	</p>

	<p>
		Note: the <code>/?</code> and <code>\?</code> "up-or-unspecified" / "down-or-unspecified" directional
		bond tokens appear in the original Daylight specification but are not present in the RDKit implementation.
	</p>

	<SmartsDemo smiles="c1cccnc1CC(=C)C" smarts={['[#7]~[#6]', 'C=C']} />

	<HeadingAnchor>Chirality</HeadingAnchor>

	<p>
		Tetrahedral chirality can be specified using <code>@</code> (anticlockwise) and <code>@@</code>
		(clockwise), looking from first neighbour, following the same convention as SMILES. When included
		in a SMARTS pattern, chirality is used as a matching constraint - unspecified chirality in the query
		matches both enantiomers.
	</p>

	<ul>
		<li><code>[C@H]</code> - carbon with anticlockwise tetrahedral configuration.</li>
		<li><code>[C@@H]</code> - carbon with clockwise tetrahedral configuration.</li>
	</ul>

	<SmartsDemo smiles="C[C@H](F)Cl" smarts={['Cl[C@@H](F)C', 'C[C@H](F)Cl']} />
	<SmartsDemo
		smiles="Br[C@H](F)CCC[C@@H](Br)F"
		smarts={['Br[#6](C)F', 'Br[#6@H](C)F', 'Br[#6@@H](C)F']}
	/>

	<p>
		The <code>@?</code> and <code>@@?</code> "unspecified chirality" tokens appear in the original Daylight
		specification but are not supported in RDKit and will cause a parse error.
	</p>

	<p>
		Stereochemistry is a big topic, read more about it at <a
			href="https://www.rdkit.org/docs/RDKit_Book.html#stereochemistry"
		>
			https://www.rdkit.org/docs/RDKit_Book.html#stereochemistry</a
		>
	</p>

	<HeadingAnchor>Recursive SMARTS</HeadingAnchor>

	<p>
		A recursive SMARTS <code>[$(...)]</code> defines a subquery/criteria for the first atom in the query.
	</p>

	<p>
		These expressions behave like atomic primitives and can be combined with other primitives using
		logical operators. For example;
	</p>

	<ul>
		<li><code>[$(*C)]</code> - any atom connected to a non-aromatic carbon</li>
		<li>
			<code>[$(N[CH3]);$(NC[CH3])]</code> - Nitrogen atom connected to both methyl and ethyl sidegroups
		</li>
	</ul>

	<SmartsDemo smiles="c1cc(O)c(C)cc1N" smarts={['[$(cN)]', '[$(*(cc)(cc)O)][$(cC)]']} />

	<HeadingAnchor>Component-level Grouping</HeadingAnchor>

	<p>
		A dot (<code>.</code>) in a SMARTS pattern separates disconnected fragments. Each fragment can
		match anywhere in the target - there is no constraint on which component it belongs to.
	</p>

	<ul>
		<li>
			<code>C.O</code> - carbon and oxygen found in the SMILES. Will match atoms in <code>CCO</code>
			and <code>CC.OO</code>.
		</li>
		<li><code>C.O</code> does not match <code>CCC</code>, because there is no oxygen present.</li>
	</ul>

	<SmartsDemo smiles="NCCO" smarts={['N.O']} />

	<SmartsDemo smiles="CO.CO.CN" smarts={['O.O.N']} useCoordgen={true} />

	Note: The Daylight SMARTS syntax defines component-level grouping using zero-level parentheses
	(e.g. <code>(C).(C)</code> to require matches in separate components), but this is not supported
	in RDKit. In RDKit, parentheses are only used for branching, and <code>(C).(C)</code> is a parse
	error. Additionally, <code>.</code> does not enforce matching across different disconnected
	fragments, so <code>C.C</code> can match within a single molecule. To correctly handle
	fragment-level constraints, split the molecule first (e.g. with
	<a
		href="https://www.rdkit.org/docs/source/rdkit.Chem.rdmolops.html#rdkit.Chem.rdmolops.GetMolFrags"
		><code>Chem.GetMolFrags</code></a
	>) and match each fragment separately or post-filter the results.

	<HeadingAnchor>Range Queries</HeadingAnchor>

	<p>
		Many numeric primitives accept a range in curly braces instead of a fixed value. Supported
		primitives: <code>D</code>, <code>d</code>, <code>h</code>, <code>k</code>, <code>r</code>,
		<code>R</code>, <code>v</code>, <code>x</code>, <code>X</code>, <code>z</code>, <code>Z</code>,
		<code>+</code>, <code>-</code>.
	</p>

	<ul>
		<li><code>D&#123;2-4&#125;</code> - between 2 and 4 explicit connections (inclusive)</li>
		<li><code>D&#123;-3&#125;</code> - at most 3 explicit connections</li>
		<li><code>D&#123;2-&#125;</code> - at least 2 explicit connections</li>
	</ul>

	<SmartsDemo smiles="CC(=O)OC" smarts={['[D{2-3}]', '[z{1-}]']} />

	<HeadingAnchor>Dative Bonds</HeadingAnchor>

	<p>
		Dative bonds <code>&lt;-</code> and <code>-&gt;</code> are covalent bonds in which both electrons
		in the shared pair come from the same atom, so the bond is directional.
	</p>

	<ul>
		<li><code>-&gt;</code> - dative bond pointing right (donor → acceptor)</li>
		<li><code>&lt;-</code> - dative bond pointing left (acceptor ← donor)</li>
	</ul>

	<p>
		The two patterns do not match the same atoms. In the example below, the nitrogen in
		trimethylamine donates a dative bond to platinum.
		<code>[#7]-&gt;*</code> matches the nitrogen as donor, while <code>*&lt;-[#7]</code> matches the
		platinum as acceptor. With SMILES <code>[Fe]-&gt;CC1=O.CN(C1)(C)-&gt;[Pt]</code>.
	</p>

	<SmartsDemo smiles="[Fe]->CC1=O.CN(C1)(C)->[Pt]" smarts={['[#7]->[*]', '[*]->[#6]']} />

	<!-- <HeadingAnchor level="h3">Atom-Map Numbers</HeadingAnchor> -->

	<!-- <HeadingAnchor>Efficiency Tips</HeadingAnchor> -->

	<!-- <p>Tips for writing efficient SMARTS (patterns are evaluated left to right):</p> -->

	<!-- <ul> -->
	<!-- 	<li>Place uncommon atoms or bond arrangements early in the pattern.</li> -->
	<!-- 	<li>In an AND expression, put the less common specification first.</li> -->
	<!-- 	<li>In an OR expression, put the less common specification last.</li> -->
	<!-- </ul> -->

	<!-- insert cite -->

	<!-- <HeadingAnchor>Examples</HeadingAnchor> -->

	<!-- <h3>Arene Halogens in Ortho</h3> -->

	<!-- <SmartsDemo smiles="c1c(CC)c(F)c(Br)c(Br)c1" smarts={['Cccc([F,Cl,Br,I])']} /> -->

	<!-- <h3>Aromatic carbons joined by a single bond</h3> -->

	<!-- <SmartsDemo smiles="c1ccccc1-c2ccccc2" smarts={['c-c']} /> -->

	<!-- <h3>Aliphatic nitrogen in a ring</h3> -->

	<!-- <SmartsDemo smiles="N1CCCCC1CCc2ccncc2" smarts={['[N;R]']} /> -->

	<!-- <h3>Two carbons connected by a double or triple bond</h3> -->

	<!-- <SmartsDemo smiles="C=CC1=CC=CC(C#C)=C1" smarts={['[C,c]=,#[C,c]']} /> -->

	<HeadingAnchor>Need more</HeadingAnchor>

	<p>
		No better option than reading <a href="https://www.rdkit.org/docs/RDKit_Book.html"
			>https://www.rdkit.org/docs/RDKit_Book.html</a
		>.
	</p>
</div>
