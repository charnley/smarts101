<script>
	import QuizSmarts from '$lib/components/QuizSmarts.svelte';

	/**
	 * @typedef {{ description: string, smiles: string, referenceSMARTS: string }} QuizQuestion
	 */

	/** @type {QuizQuestion[]} */
	const questions = [
		{
			description: 'An aliphatic carbon attached to an oxygen with any bond.',
			// Aspirin: has aliphatic C bonded to O (ester + carboxyl)
			smiles: 'CC(=O)Oc1ccccc1C(=O)O',
			referenceSMARTS: '[C;!a]~[O]',
		},
		{
			description: 'An atom which is not in any ring and is not an oxygen.',
			// Ibuprofen: has non-ring, non-oxygen carbons in its isobutyl tail
			smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
			referenceSMARTS: '[!R;!#8]',
		},
		{
			description: 'Two atoms bonded by a non-ring bond.',
			// Aspirin: plenty of non-ring bonds (methyl, carboxyl)
			smiles: 'CC(=O)Oc1ccccc1C(=O)O',
			referenceSMARTS: '[*]!@[*]',
		},
		{
			description: 'An aromatic atom single-bonded to any halogen.',
			// Fluorobenzene: simplest aromatic + halogen
			smiles: 'Fc1ccccc1',
			referenceSMARTS: '[a]-[F,Cl,Br,I]',
		},
		{
			description:
				'An atom that is an oxygen or a nitrogen (aliphatic or aromatic), with at least one hydrogen attached, and in a five-membered ring.',
			// Histidine: imidazole ring (5-membered) with ring N-H
			smiles: 'N[C@@H](Cc1c[nH]cn1)C(=O)O',
			referenceSMARTS: '[O,N;!H0;r5]',
		},
		{
			description: 'A nitrogen atom connected to a carbonyl carbon (amide bond).',
			// Paracetamol: classic amide N-C(=O)
			smiles: 'CC(=O)Nc1ccc(O)cc1',
			referenceSMARTS: '[N]-C(=O)',
		},
		{
			description: 'Any aromatic carbon atom.',
			// Pyrene: purely aromatic — every carbon is aromatic
			smiles: 'c1ccc2c(c1)cc1ccc3cccc4ccc2c1c34',
			referenceSMARTS: '[c]',
		},
		{
			description: 'A carbon that is part of a hydroxyl group (single bond to an –OH).',
			// Glucose: multiple C-OH hydroxyl groups
			smiles: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O',
			referenceSMARTS: '[C]-[OH]',
		},
	];
</script>

<div class="article">
	<h1>Test your SMARTS skills</h1>
	<p class="quiz-intro">
		Write a SMARTS pattern that matches the highlighted atoms on each molecule. Your answer is
		checked by comparing the matched atoms against a reference pattern — so equivalent expressions
		are accepted.
	</p>
</div>

<div class="quiz">
	{#each questions as q, i}
		<QuizSmarts
			index={i + 1}
			description={q.description}
			smiles={q.smiles}
			referenceSMARTS={q.referenceSMARTS}
		/>
	{/each}
</div>

<style>
	.quiz-intro {
		color: var(--muted-foreground);
		font-size: 0.9375rem;
		line-height: 1.6;
		margin-top: 0.5rem;
		margin-bottom: 0;
	}

	.quiz {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-width: 780px;
		margin: 1.5rem auto 3rem;
		padding: 0 1rem;
	}
</style>
