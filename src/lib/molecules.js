/**
 * Curated molecule sets for the SMARTS 101 playground.
 *
 * Each set is an array of { smiles: string, name: string } objects.
 * IDs are assigned at runtime by the playground page.
 */

export const CHEMBL = [
	{
		smiles: 'COc1ccc(CC[C@](N)(C(=O)O)C2C[C@@H]2C(=O)O)cc1OC',
		name: 'CHEMBL125265',
	},
	{
		smiles: 'CSc1nc(Nc2ccc(F)cc2)c2cccnc2n1',
		name: 'CHEMBL358893',
	},
	{
		smiles: 'O=C(O)C[C@@](O)(C[C@H](O)CCCCCCc1ccc(Cl)cc1-c1ccc(Cl)cc1)C(=O)O',
		name: 'CHEMBL116762',
	},
	{
		smiles: 'COc1cc2ccc(=O)oc2cc1OCC(O)CN1CCN(C)CC1',
		name: 'CHEMBL2332709',
	},
	{
		smiles:
			'C[C@H](NC(=O)c1ccccc1)C(=O)N[C@@H](C)C(=O)N[C@H](Cc1c[nH]c2ccccc12)C(=O)N[C@@H](Cc1ccccc1)C(=O)N(C)C',
		name: 'CHEMBL174026',
	},
	{
		smiles: 'CCCCCN(CCCCC)C(=O)[C@H]1CCN(C(=O)N(c2ccccc2)c2ccccc2)[C@H](C(=O)NCCN(C)Cc2ccccc2OC)C1',
		name: 'CHEMBL358173',
	},
];

/**
 * RNA nucleotides: base + β-D-ribose + 5'-phosphate (nucleoside-5'-monophosphates).
 * The phosphate is the linker that connects nucleotides in the RNA backbone.
 */
export const RNA_BASES = [
	{
		smiles: 'Nc1ncnc2c1ncn2[C@@H]1O[C@H](COP(O)(O)=O)[C@@H](O)[C@H]1O',
		name: "AMP (Adenosine 5'-monophosphate)",
	},
	{
		smiles: 'Nc1nc2c(ncn2[C@@H]2O[C@H](COP(O)(O)=O)[C@@H](O)[C@H]2O)c(=O)[nH]1',
		name: "GMP (Guanosine 5'-monophosphate)",
	},
	{
		smiles: 'Nc1ccn([C@@H]2O[C@H](COP(O)(O)=O)[C@@H](O)[C@H]2O)c(=O)n1',
		name: "CMP (Cytidine 5'-monophosphate)",
	},
	{
		smiles: 'O=c1ccn([C@@H]2O[C@H](COP(O)(O)=O)[C@@H](O)[C@H]2O)c(=O)[nH]1',
		name: "UMP (Uridine 5'-monophosphate)",
	},
];

/**
 * DNA nucleotides: base + β-D-2'-deoxyribose + 5'-phosphate (deoxynucleoside-5'-monophosphates).
 * The phosphate is the linker that connects nucleotides in the DNA backbone.
 */
export const DNA_BASES = [
	{
		smiles: 'Nc1ncnc2c1ncn2[C@H]1C[C@@H](O)[C@H](COP(O)(O)=O)O1',
		name: "dAMP (Deoxyadenosine 5'-monophosphate)",
	},
	{
		smiles: 'Nc1nc2c(ncn2[C@H]2C[C@@H](O)[C@H](COP(O)(O)=O)O2)c(=O)[nH]1',
		name: "dGMP (Deoxyguanosine 5'-monophosphate)",
	},
	{
		smiles: 'Nc1ccn([C@H]2C[C@@H](O)[C@H](COP(O)(O)=O)O2)c(=O)n1',
		name: "dCMP (Deoxycytidine 5'-monophosphate)",
	},
	{
		smiles: 'Cc1cn([C@H]2C[C@@H](O)[C@H](COP(O)(O)=O)O2)c(=O)[nH]c1=O',
		name: "TMP (Thymidine 5'-monophosphate)",
	},
];

/**
 * The 20 standard amino acids (free form, neutral pH).
 * Useful for practising SMARTS patterns on peptide/protein building blocks.
 */
export const AMINO_ACIDS = [
	{ smiles: 'N[C@@H](C)C(=O)O', name: 'Alanine (Ala)' },
	{ smiles: 'N[C@@H](CS)C(=O)O', name: 'Cysteine (Cys)' },
	{ smiles: 'N[C@@H](CC(=O)O)C(=O)O', name: 'Aspartate (Asp)' },
	{ smiles: 'N[C@@H](CCC(=O)O)C(=O)O', name: 'Glutamate (Glu)' },
	{ smiles: 'N[C@@H](Cc1ccccc1)C(=O)O', name: 'Phenylalanine (Phe)' },
	{ smiles: 'NCC(=O)O', name: 'Glycine (Gly)' },
	{ smiles: 'N[C@@H](Cc1c[nH]cn1)C(=O)O', name: 'Histidine (His)' },
	{ smiles: 'N[C@@H]([C@@H](CC)C)C(=O)O', name: 'Isoleucine (Ile)' },
	{ smiles: 'N[C@@H](CCCCN)C(=O)O', name: 'Lysine (Lys)' },
	{ smiles: 'N[C@@H](CC(C)C)C(=O)O', name: 'Leucine (Leu)' },
	{ smiles: 'N[C@@H](CCSC)C(=O)O', name: 'Methionine (Met)' },
	{ smiles: 'N[C@@H](CC(=O)N)C(=O)O', name: 'Asparagine (Asn)' },
	{ smiles: 'OC(=O)[C@@H]1CCCN1', name: 'Proline (Pro)' },
	{ smiles: 'N[C@@H](CCC(=O)N)C(=O)O', name: 'Glutamine (Gln)' },
	{ smiles: 'N[C@@H](CCCNC(=N)N)C(=O)O', name: 'Arginine (Arg)' },
	{ smiles: 'N[C@@H](CO)C(=O)O', name: 'Serine (Ser)' },
	{ smiles: 'N[C@@H]([C@@H](O)C)C(=O)O', name: 'Threonine (Thr)' },
	{ smiles: 'N[C@@H](Cc1c[nH]c2ccccc12)C(=O)O', name: 'Tryptophan (Trp)' },
	{ smiles: 'N[C@@H](Cc1ccc(O)cc1)C(=O)O', name: 'Tyrosine (Tyr)' },
	{ smiles: 'N[C@@H](C(C)C)C(=O)O', name: 'Valine (Val)' },
];

/**
 * Short peptide examples (3–5 residues, linear and cyclic).
 * Good for practising backbone amide, side-chain, and disulfide SMARTS patterns.
 */
export const PEPTIDES = [
	{
		smiles: 'CC[C@H](C)[C@H](NC(=O)[C@@H](N)Cc1ccccc1)C(=O)N[C@@H](CCC(=O)O)C(=O)O',
		name: 'Phe-Ile-Glu (tripeptide)',
	},
	{
		smiles: 'NCC(=O)N[C@@H](Cc1ccccc1)C(=O)N[C@@H](CO)C(=O)O',
		name: 'Gly-Phe-Ser (tripeptide)',
	},
	{
		smiles: 'N[C@@H](CCCCN)C(=O)N[C@@H](Cc1c[nH]cn1)C(=O)N[C@@H](C(C)C)C(=O)O',
		name: 'Lys-His-Val (tripeptide)',
	},
	{
		smiles:
			'N[C@@H](Cc1ccc(O)cc1)C(=O)N[C@@H](CCC(=O)N)C(=O)N[C@@H](CCCNC(=N)N)C(=O)N[C@@H](CS)C(=O)O',
		name: 'Tyr-Gln-Arg-Cys (tetrapeptide)',
	},
	{
		smiles:
			'N[C@@H](CO)C(=O)N[C@@H](CC(=O)O)C(=O)N[C@@H](C)C(=O)N[C@@H](CC(C)C)C(=O)N[C@@H](CCS)C(=O)O',
		name: 'Ser-Asp-Ala-Leu-Met (pentapeptide)',
	},
	{
		smiles: 'N[C@@H](Cc1ccccc1)C(=O)NCC(=O)N[C@@H](CCCCN)C(=O)N[C@@H](C(C)C)C(=O)N1CCC[C@H]1C(=O)O',
		name: 'Phe-Gly-Lys-Val-Pro (pentapeptide)',
	},
];

/** Common drug-like molecules */
export const DRUGLIKE_MOLECULES = [
	{ smiles: 'CC(=O)Oc1ccccc1C(=O)O', name: 'Aspirin' },
	{ smiles: 'Cn1cnc2c1c(=O)n(C)c(=O)n2C', name: 'Caffeine' },
	{ smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O', name: 'Ibuprofen' },
	{ smiles: 'CC(=O)Nc1ccc(O)cc1', name: 'Paracetamol' },
	{ smiles: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O', name: 'Glucose' },
	{ smiles: 'c1ccc2c(c1)cc1ccc3cccc4ccc2c1c34', name: 'Pyrene' },
];

/** Default set shown on first load */
export const DEFAULT_MOLECULES = DRUGLIKE_MOLECULES;
