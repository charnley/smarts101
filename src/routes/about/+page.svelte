<svelte:head>
	<title>SMARTS101 — About</title>
	<meta
		name="description"
		content="About SMARTS101 — a free, open-source tool for visualizing and debugging SMARTS substructure queries."
	/>
</svelte:head>

<div class="article">
	<h1>About...</h1>

	<p>
		This is a weekend project by <a href="https://github.com/charnley">Jimmy</a> and
		<a href="https://github.com/leftStone">Denis</a>, built to help visualize SMARTS reactions
		across multiple molecules simultaneously. The goal is to do for SMARTS what regex101.com does
		for regular expressions, making it easier to explore matches and understand how SMARTS patterns
		work. We hope you find it useful. This is still a work in progress.
	</p>

	<p>
		Have feature requests, found a bug, or ran into an issue? Please open an issue or even better,
		submit a pull request.
		<a href="https://github.com/charnley/smarts101">https://github.com/charnley/smarts101</a>.
	</p>

	<h2>FAQ</h2>

	<ul>
		<li>
			<strong>Why does the highlight look weird?</strong> We use a SVG hack with PaperJS to highlight
			molecules, because it scales well with multiple highlights and colors.
		</li>
		<li>
			<strong>Do you store the SMILES and SMARTS?</strong> No. This is a static website, so there is no
			storage. Ony thing kept in the cookie is the preference for dark-mode. But if you are working for
			a company, you should anyway set up an instance locally.
		</li>
		<li>
			<strong>Am I allowed to copy and setup a local instance in my company?</strong> Yes, it is recommended
			if you are working with IP. Don't paste your internal SMILES into any website.
		</li>
	</ul>

	<h2>Smarter SMARTS</h2>

	<p class="">
		Smarter SMARTS is a tool that helps you write accurate SMARTS patterns by showing the distinct
		molecules your pattern actually matches, filtered for unique atom environments in the 100K
		smallest Chembl molecules and stopping with 200 results. Developed by Noel O'Boyle as described
		in
		<a
			href="https://baoilleach.blogspot.com/2018/11/smarts-for-dummies.html"
			target="_blank"
			class="underline">SMARTS for dummies</a
		>.
	</p>

	<p>
		To reproduce the dataset being used, go to <a
			href="https://www.ebi.ac.uk/chembl/explore/compounds/"
			target="_black">chEMBL</a
		> and download `.csv` file of the small molecules. Strip salts (split multi-SMILES and select largest),
		drop invalid molecules, drop duplicate SMILES, drop one-atom molecules, sort by number of atoms and
		select first 100K.
	</p>

	<h2>References</h2>

	Not enough information? Need a better tool? Check out;

	<ul>
		<li>
			<a href="https://www.daylight.com/dayhtml/doc/theory/theory.smarts.html"
				>https://www.daylight.com/dayhtml/doc/theory/theory.smarts.html</a
			>
		</li>
		<li>
			<a href="https://smarts.plus">https://smarts.plus</a>
		</li>
		<li>
			<a href="https://www.zbh.uni-hamburg.de/en/forschung/amd/software/smartseditor.html"
				>https://www.zbh.uni-hamburg.de/en/forschung/amd/software/smartseditor.html</a
			>
		</li>
		<li>
			<a href="https://www.rdkit.org/docs/RDKit_Book.html"
				>https://www.rdkit.org/docs/RDKit_Book.html</a
			>
		</li>
		<li>
			<a href="https://baoilleach.github.io/smartersmarts-js"
				>https://baoilleach.github.io/smartersmarts-js</a
			>
			and
			<a href="https://baoilleach.blogspot.com/2023/02/smarts-for-dummies-part-ii.html"
				>smarts for dummies</a
			>
		</li>
	</ul>
</div>
