<script module>
	// @ts-nocheck
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';

	// Default molecule: Aspirin — has a benzene ring, ester, carboxylic acid,
	// and wedge bonds. Good for exercising all rendering edge cases.
	const DEFAULT_SMILES = 'CC(=O)Oc1ccccc1C(=O)O';

	// Default SMARTS: benzene ring — always matches aspirin, clearly visible.
	const DEFAULT_SMARTS = 'c1ccccc1';

	/** Build a softspots object from a single SMARTS string and optional color. */
	function makeSoftspots(smarts = DEFAULT_SMARTS, color = '#f97316') {
		return smarts
			? { definitions: [{ smarts, color, id: 'query', name: 'Query' }], outline: true, fill: false }
			: { definitions: [] };
	}

	const { Story } = defineMeta({
		title: 'Chemistry/StructureRenderer',
		component: StructureRenderer,
		tags: ['autodocs'],
		parameters: {
			layout: 'centered'
		},
		argTypes: {
			smiles: {
				control: 'text',
				description: 'SMILES string of the molecule to render'
			},
			softspots: {
				control: 'object',
				description:
					'Softspot config: { definitions: [{ smarts, color, id?, name? }], outline?, fill? }'
			},
			width: {
				control: { type: 'range', min: 100, max: 600, step: 10 },
				description: 'Width of the renderer in pixels'
			},
			height: {
				control: { type: 'range', min: 100, max: 500, step: 10 },
				description: 'Height of the renderer in pixels'
			},
			darkMode: {
				control: 'boolean',
				description: 'Force dark mode palette. Leave unset (null) to auto-follow the app theme.'
			},
			showAtomIndices: {
				control: 'boolean',
				description: 'Show atom index numbers on the molecule. Default false.'
			}
		},
		args: {
			smiles: DEFAULT_SMILES,
			softspots: makeSoftspots(DEFAULT_SMARTS),
			width: 300,
			height: 220,
			// Pin to light mode by default so stories look consistent regardless of browser theme.
			// The "Dark mode" story overrides this to true.
			darkMode: false
		}
	});
</script>

<!-- Plain render — confirms the molecule displays without any highlighting. -->
<Story name="Default" args={{ softspots: { definitions: [] } }} />

<!-- Benzene ring SMARTS highlighted in orange (outline style). -->
<Story name="With SMARTS highlight" />

<!-- Hydroxyl group — narrower match, only the carboxylic OH. -->
<Story name="Hydroxyl [OX2H]" args={{ softspots: makeSoftspots('[OX2H]') }} />

<!-- Carbonyl group C=O -->
<Story name="Carbonyl [CX3]=O" args={{ softspots: makeSoftspots('[CX3]=O') }} />

<!-- A SMARTS that doesn't match aspirin — nothing highlighted, no errors. -->
<Story name="No match [NH2]" args={{ softspots: makeSoftspots('[NH2]') }} />

<!--
  Dark mode: force the dark atom palette + wrap in a dark surface so that
  currentColor (used for carbon atoms/bonds) resolves to the correct light value.
-->
<Story name="Dark mode" args={{ darkMode: true }}>
	{#snippet template(args)}
		<div style="background:#1c1c1c; color:#e5e5e5; padding:16px; border-radius:8px;">
			<StructureRenderer {...args} />
		</div>
	{/snippet}
</Story>

<!-- Custom highlight color: magenta. -->
<Story
	name="Custom highlight color (magenta)"
	args={{ softspots: makeSoftspots(DEFAULT_SMARTS, '#cc00cc') }}
/>

<!-- Atom indices visible — useful for authoring SMARTS by atom number. -->
<Story name="Atom indices" args={{ showAtomIndices: true, softspots: { definitions: [] } }} />

<!-- Atom indices + SMARTS highlight together. -->
<Story name="Atom indices + highlight" args={{ showAtomIndices: true }} />

<!-- Size variants. -->
<Story name="Large" args={{ width: 500, height: 380 }} />
<Story name="Small" args={{ width: 160, height: 120, softspots: { definitions: [] } }} />

<!-- A more complex molecule: Morphine — stereocenters, N, multiple fused rings. -->
<Story
	name="Morphine — no highlight"
	args={{
		smiles: 'OC1=CC=C2CC3N(C)CCC34C2=C1OC4',
		softspots: { definitions: [] }
	}}
/>

<!-- Caffeine with all-nitrogen SMARTS highlighted. -->
<Story
	name="Caffeine — highlight N"
	args={{
		smiles: 'Cn1cnc2c1c(=O)n(C)c(=O)n2C',
		softspots: makeSoftspots('[#7]', '#3b82f6')
	}}
/>

<!--
  Glucose: stereocenters with R/S labels + wedge bonds.
  Exercises the recolorBlackElements fix — bonds and annotations must follow
  --foreground (not stay hardcoded black) in both light and dark mode.
-->
<Story
	name="Glucose — light"
	args={{
		smiles: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O',
		softspots: { definitions: [] },
		darkMode: false
	}}
/>

<Story
	name="Glucose — dark"
	args={{
		smiles: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O',
		softspots: { definitions: [] },
		darkMode: true
	}}
>
	{#snippet template(args)}
		<div style="background:#1c1c1c; color:#e5e5e5; padding:16px; border-radius:8px;">
			<StructureRenderer {...args} />
		</div>
	{/snippet}
</Story>
