/**
 * Curated molecule sets for the SMARTS 101 playground.
 *
 * Each set is an array of { smiles: string, name: string } objects.
 * IDs are assigned at runtime by the playground page.
 */

/**
 * RNA nucleotides: base + β-D-ribose + 5'-phosphate (nucleoside-5'-monophosphates).
 * The phosphate is the linker that connects nucleotides in the RNA backbone.
 */
export const RNA_BASES = [
	{
		smiles: 'Nc1ncnc2c1ncn2[C@@H]1O[C@H](COP(O)(O)=O)[C@@H](O)[C@H]1O',
		name: "AMP (Adenosine 5'-monophosphate)"
	},
	{
		smiles: 'Nc1nc2c(ncn2[C@@H]2O[C@H](COP(O)(O)=O)[C@@H](O)[C@H]2O)c(=O)[nH]1',
		name: "GMP (Guanosine 5'-monophosphate)"
	},
	{
		smiles: 'Nc1ccn([C@@H]2O[C@H](COP(O)(O)=O)[C@@H](O)[C@H]2O)c(=O)n1',
		name: "CMP (Cytidine 5'-monophosphate)"
	},
	{
		smiles: 'O=c1ccn([C@@H]2O[C@H](COP(O)(O)=O)[C@@H](O)[C@H]2O)c(=O)[nH]1',
		name: "UMP (Uridine 5'-monophosphate)"
	}
];

/**
 * DNA nucleotides: base + β-D-2'-deoxyribose + 5'-phosphate (deoxynucleoside-5'-monophosphates).
 * The phosphate is the linker that connects nucleotides in the DNA backbone.
 */
export const DNA_BASES = [
	{
		smiles: 'Nc1ncnc2c1ncn2[C@H]1C[C@@H](O)[C@H](COP(O)(O)=O)O1',
		name: "dAMP (Deoxyadenosine 5'-monophosphate)"
	},
	{
		smiles: 'Nc1nc2c(ncn2[C@H]2C[C@@H](O)[C@H](COP(O)(O)=O)O2)c(=O)[nH]1',
		name: "dGMP (Deoxyguanosine 5'-monophosphate)"
	},
	{
		smiles: 'Nc1ccn([C@H]2C[C@@H](O)[C@H](COP(O)(O)=O)O2)c(=O)n1',
		name: "dCMP (Deoxycytidine 5'-monophosphate)"
	},
	{
		smiles: 'Cc1cn([C@H]2C[C@@H](O)[C@H](COP(O)(O)=O)O2)c(=O)[nH]c1=O',
		name: "TMP (Thymidine 5'-monophosphate)"
	}
];

/** Common drug-like molecules */
export const DRUGLIKE_MOLECULES = [
	{ smiles: 'CC(=O)Oc1ccccc1C(=O)O', name: 'Aspirin' },
	{ smiles: 'Cn1cnc2c1c(=O)n(C)c(=O)n2C', name: 'Caffeine' },
	{ smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O', name: 'Ibuprofen' },
	{ smiles: 'CC(=O)Nc1ccc(O)cc1', name: 'Paracetamol' },
	{ smiles: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O', name: 'Glucose' },
	{ smiles: 'c1ccc2c(c1)cc1ccc3cccc4ccc2c1c34', name: 'Pyrene' }
];

/** Default set shown on first load */
export const DEFAULT_MOLECULES = DRUGLIKE_MOLECULES;
