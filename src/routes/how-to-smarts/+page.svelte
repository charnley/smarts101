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
</div>
