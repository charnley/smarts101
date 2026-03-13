<script>
	import SmartsDemo from '$lib/components/SmartsDemo.svelte';
</script>

<div class="article">
	<h1>Introduction to SMARTS</h1>

	<p class="article-lead">Standing on the shoulders of giants.</p>

	<h2>What is SMARTS?</h2>

	<p>
		SMARTS (SMiles ARbitrary Target Specification) is a language for describing molecular patterns
		and properties. It extends the SMILES notation to allow expressive queries over chemical
		structures, making it possible to search, filter, and classify molecules based on substructure
		patterns.
	</p>

	<blockquote>
		A SMARTS pattern is a string that describes a set of molecules — any molecule matching the
		pattern is considered a hit.
	</blockquote>

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
				<td><code>[CH3]</code></td>
			</tr>
			<tr>
				<td><code>+&lt;n&gt;</code></td>
				<td>positive charge of n</td>
				<td><code>[N+]</code></td>
			</tr>
			<tr>
				<td><code>-&lt;n&gt;</code></td>
				<td>negative charge of n</td>
				<td><code>[O-]</code></td>
			</tr>
			<tr>
				<td><code>R&lt;n&gt;</code></td>
				<td>in n rings</td>
				<td><code>[R2]</code></td>
			</tr>
		</tbody>
	</table>
</div>

<SmartsDemo smiles="CCCC=O" smarts={['[CH1]', '[CH2]', '[CH3]']} />

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

<SmartsDemo smiles="c1ccccc1C(=O)O" smarts={['c1ccccc1', 'C(=O)O']} />
