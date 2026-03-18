<div class="article">
	<h1>About Learn SMARTS</h1>

	<p>
		Who wrote this and why? Weekend project by <a href="https://github.com/charnley">Jimmy</a> and Denis,
		because we needed something to visualize SMARTS reactions on various molecules at the same time. Hope
		it is useful for you too.
	</p>

	<p>
		Need features? Something wrong? Have issues? Open a issue at <a
			href="https://github.com/charnley/smarts101">https://github.com/charnley/smarts101</a
		>. Or, even better, make a pull request.
	</p>

	<p>This website is based on primarily Svelte 5 and RDKit.</p>

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
			<a href="https://www.rdkit.org">rdkit</a>
		</li>
	</ul>
</div>

<!-- - https://smarts.plus: -->
<!--     - https://pmc.ncbi.nlm.nih.gov/articles/PMC7757167 -->
<!-- - smarts editor: -->
<!--     - https://www.zbh.uni-hamburg.de/en/forschung/amd/software/smartseditor.html -->
<!--     - https://www.zbh.uni-hamburg.de/forschung/amd/software/smartseditor/smartseditor-doku.html -->
<!-- - JavaGrins (deprecated): -->
<!--     - https://www.daylight.com/meetings/emug99/Bharadwaj/SMARTS/ -->
<!--     - This has a very cool way to describe the SMARTS structure -->
