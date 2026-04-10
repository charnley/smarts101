<script>
	import QuizSmarts from '$lib/components/QuizSmarts.svelte';

	/** @type {QuizSmarts[]} */
	let quizRefs = $state([]);

	/** @param {number} index */
	function focusNext(index) {
		quizRefs[index]?.focusInput();
	}

	/**
	 * @typedef {{ description: string, smiles: string, referenceSMARTS: string, useCoordgen?: boolean, rendererWidth?: number, rendererHeight?: number }} QuizQuestion
	 */

	/** @type {QuizQuestion[]} */
	const questions = [
		{
			description: 'Aliphatic Carbon and Oyxgen atoms connected with any bond.',
			smiles: 'CC(=O)Oc1ccccc1C(=O)O',
			referenceSMARTS: 'C~O',
		},
		{
			description: 'Carbon in six-membered ring',
			smiles: 'C3CCC3CC1CCC(CC2CCCcCC2)C(Cc4ccccc4)C1',
			referenceSMARTS: '[#6;r6]',
		},
		{
			description: 'An atom which is not in any ring and is not an oxygen.',
			smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
			referenceSMARTS: '[!#8!R]',
		},
		{
			description: 'Carbon and Nitrogen atoms bonded by a non-ring bond.',
			smiles: 'CC(=O)Nc1ccncc1C(=O)N',
			referenceSMARTS: '[#6]!@[#7]',
		},
		{
			description: 'An aromatic atom single-bonded to any halogen.',
			smiles: 'Fc1c(Cl)c(Br)c(I)c(C)c1(O)',
			referenceSMARTS: '[a]-[F,Cl,Br,I]',
		},
		{
			description:
				'Nitrogen (aliphatic or aromatic), with at least one hydrogen attached, and in a five-membered ring.',
			smiles: 'n1c(N)c[nH]c1CC2NCCC2',
			referenceSMARTS: '[#7h1;r5]',
		},
		{
			description: 'Carbon attached to a carbonyl group; match only carbon.',
			smiles: 'CC(=O)OC(CO)C',
			referenceSMARTS: '[$(C=O)]',
		},
		{
			description:
				'Identify the oxygen–carbon bond that connects the sugar ring to the phosphate group at every 5′ extension of the RNA',
			smiles:
				'Nc1ccn([C@@H]2O[C@H](COP(=O)(O)O)[C@@H](OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(=O)[nH]c(N)nc54)[C@H](O)[C@@H]3OP(=O)(O)O)[C@H]2O)c(=O)n1',
			referenceSMARTS: '[$(OPO)][$(CC1OCCC1)]',
			useCoordgen: true,
			rendererWidth: 480,
			rendererHeight: 340,
		},
	];
</script>

<svelte:head>
	<title>SMARTS101 — Quiz</title>
	<meta name="description" content="Test your SMARTS knowledge with interactive exercises" />
</svelte:head>

<!-- peptide: [$(CN)][$(C(=O)NCC(=O))] -->
<!-- sukker: [$(C1C(CO)OC(O)C(O)C1(O))][$(OC1C(O)C(O)CC(CO)O1)] -->
<!-- sukker:  [$(CCOP)][$(CC1OCCC1)] 5" -->
<!-- $([CX3](=[OX1])[NX3][CX4])][$([NX3][CX3][CX4])] -->
<!-- samme peptid -->
<!-- -"$([CX3](=[OX1])[NX3][CX4])][$([NX3][CX3][CX4])]"- -->

<div class="article">
	<h1>Test your SMARTS skills</h1>

	<p>
		Quiz heavily inspired by <a
			href="https://www.daylight.com/dayhtml_tutorials/languages/smarts/smarts_practice.html"
			>Daylight SMARTS tutorial</a
		>. Write SMARTS for each pattern description. Don't give up.
	</p>
</div>

<div class="quiz">
	{#each questions as q, i}
		<QuizSmarts
			bind:this={quizRefs[i]}
			index={i + 1}
			description={q.description}
			smiles={q.smiles}
			referenceSMARTS={q.referenceSMARTS}
			useCoordgen={q.useCoordgen ?? false}
			rendererWidth={q.rendererWidth}
			rendererHeight={q.rendererHeight}
			oncorrect={() => focusNext(i + 1)}
		/>
	{/each}
</div>

<div class="article">
	<p>
		Do you have a interesting SMARTS you want to share/test others? <a
			href="https://github.com/charnley/smarts101">Make a pull request and add it</a
		>.
	</p>
</div>

<style>
	.quiz {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-width: 780px;
		margin: 1.5rem auto 3rem;
		padding: 0 1rem;
	}
</style>
