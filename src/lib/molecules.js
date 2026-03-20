
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

export const AMINO_ACIDS = [
	{
		smiles: 'C[C@@H](C(=O)O)N',
		name: 'L Alanine',
	},
	{
		smiles: 'C(C[C@@H](C(=O)O)N)CNC(=N)N', name: 'L Arginine',
	},
	{
		smiles: 'O=C(N)C[C@H](N)C(=O)O', name: 'L Asparagine',
	},
	{
		smiles: 'C([C@@H](C(=O)O)N)C(=O)O', name: 'L Aspartic acid',
	},
	{
		smiles: 'C([C@@H](C(=O)O)N)S', name: 'L Cysteine',
	},
	{
		smiles: 'C(CC(=O)O)[C@@H](C(=O)O)N', name: 'L Glutamic acid',
	},
	{
		smiles: 'O=C(N)CCC(N)C(=O)O', name: 'Glutamine',
	},
	{
		smiles: 'C(C(=O)O)N', name: 'Glycine',
	},
	{
		smiles: 'O=C([C@H](CC1=CNC=N1)N)O', name: 'Histidine',
	},
	{
		smiles: 'CC[C@H](C)[C@@H](C(=O)O)N', name: 'Isoleucine',
	},
	{
		smiles: 'CC(C)C[C@@H](C(=O)O)N', name: 'Leucine',
	},
	{
		smiles: 'C(CCN)C[C@@H](C(=O)O)N', name: 'Lysine',
	},
	{
		smiles: 'CSCC[C@H](N)C(=O)O', name: 'L Methionine',
	},
	{
		smiles: 'c1ccc(cc1)C[C@@H](C(=O)O)N', name: 'L Phenylalanine',
	},
	{
		smiles: 'C1C[C@H](NC1)C(=O)O', name: 'L Proline',
	},
	{
		smiles: 'C([C@@H](C(=O)O)N)O', name: 'Serine',
	},
	{
		smiles: 'C[C@H]([C@@H](C(=O)O)N)O', name: 'Threonine',
	},
	{
		smiles: 'c1[nH]c2ccccc2c1C[C@H](N)C(=O)O', name: 'Tryptophan',
	},
	{
		smiles: 'N[C@@H](Cc1ccc(O)cc1)C(O)=O', name: 'Tyrosine',
	},
	{
		smiles: ' CC(C)[C@@H](C(=O)O)N', name: 'L Valine',
	},
	{
		smiles: 'O=C(O)[C@@H](N)C[SeH]', name: 'Selenocysteine',
	},
	{
		smiles: 'C[C@@H]1CC=N[C@H]1C(=O)NCCCC[C@@H](C(=O)O)N', name: 'Pyrrolysine',
	},
];

export const DRUGLIKE = [
	{ smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O', name: 'Aspirin' },
	{ smiles: 'CC(C)Cc1ccc(cc1)[C@@H](C)C(=O)O', name: 'Ibuprofen' },
	{ smiles: 'CC(=O)Nc1ccc(O)cc1', name: 'Paracetamol' },
	{ smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', name: 'Caffeine' },
	{ smiles: 'C([C@@H]1[C@H]([C@@H]([C@H]([C@H](O1)O)O)O)O)O', name: 'Alpha Glucose' },
	{ smiles: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O', name: 'Beta Glucose' },
	{ smiles: 'c1ccc2c(c1)cc1ccc3cccc4ccc2c1c34', name: 'Pyrene' },
	{ smiles: 'CC1(C(N2C(S1)C(C2=O)NC(=O)Cc3ccccc3)C(=O)O)C', name: 'Benzylpenicillin' },
	{ smiles: 'CN1CCC23C4=C5C=CC(O)=C4OC2C(O)C=CC3C1C5', name: 'Morphine' },
	{ smiles: 'c1ncccc1[C@@H]2CCCN2C', name: 'Nicotine' },
	{ smiles: 'CC1=CN=C(C(=C1OC)C)CS(=O)C2=NC3=C(N2)C=C(C=C3)OC', name: 'Omeprazole' },
	{ smiles: 'O=C(O)C[C@H](O)C[C@H](O)CCn2c(c(c(c2c1ccc(F)cc1)c3ccccc3)C(=O)Nc4ccccc4)C(C)C', name: 'Atorvastatin' },
];

export const MACROCYCLES = [
	{
		smiles:
			'CC[C@H]1C(=O)N(CC(=O)N([C@H](C(=O)N[C@H](C(=O)N([C@H](C(=O)N[C@H](C(=O)N[C@@H](C(=O)N([C@H](C(=O)N([C@H](C(=O)N([C@H](C(=O)N([C@H](C(=O)N1)[C@@H]([C@H](C)C/C=C/C)O)C)C(C)C)C)CC(C)C)C)CC(C)C)C)C)C)CC(C)C)C)C(C)C)CC(C)C)C)C',
		name: 'Ciclosporin',
	},
	{
		smiles:
			'C[C@@H]1C(=O)N[C@@H](C(=O)O[C@H](C(=O)N[C@@H](C(=O)O[C@@H](C(=O)N[C@@H](C(=O)O[C@H](C(=O)N[C@H](C(=O)O[C@H](C(=O)N[C@H](C(=O)O[C@H](C(=O)N[C@H](C(=O)O1)C(C)C)C(C)C)C(C)C)C)C(C)C)C(C)C)C(C)C)C)C(C)C)C(C)C)C(C)C',
		name: 'Valinomycin',
	},
	{
		smiles: 'CC1CCCC2C(O2)CC(OC(=O)CC(C(C(=O)C(C1O)C)(C)C)O)C(=CC3=CSC(=N3)C)C',
		name: 'Epothilone',
	},
	{
		smiles:
			'CC[C@@H]1[C@@]([C@@H]([C@H](C(=O)[C@@H](C[C@@]([C@@H]([C@H]([C@@H]([C@H](C(=O)O1)C)O[C@H]2C[C@@]([C@H]([C@@H](O2)C)O)(C)OC)C)O[C@H]3[C@@H]([C@H](C[C@H](O3)C)N(C)C)O)(C)O)C)C)O)(C)O',
		name: 'Erythromycin',
	},
	{
		smiles: 'CC1CCCC=CC2CC(CC2C(C=CC(=O)O1)O)O',
		name: 'Brefeldin A',
	},
];


// Seq generated with RDKit MolFromFASTA
// 0 Protein, L amino acids (default)
// 1 Protein, D amino acids
// 2 RNA, no cap
// 3 RNA, 5’ cap
// 4 RNA, 3’ cap
// 5 RNA, both caps
// 6 DNA, no cap
// 7 DNA, 5’ cap
// 8 DNA, 3’ cap
// 9 DNA, both caps
//
// Chem.MolToSMILES(Chem.MolFromFASTA(seq, flavor=))

// Flavor = 5
export const RNA = [
	{
		smiles: 'Nc1nc2c(ncn2[C@@H]2O[C@H](COP(=O)(O)O[C@H]3[C@@H](O)[C@H](n4ccc(=O)[nH]c4=O)O[C@@H]3COP(=O)(O)O[C@H]3[C@@H](O)[C@H](n4cnc5c(N)ncnc54)O[C@@H]3COP(=O)(O)O)[C@@H](OP(=O)(O)O)[C@H]2O)c(=O)[nH]1',
		name: "AUG",
	},
	{
		smiles: 'Nc1ccn([C@@H]2O[C@H](COP(=O)(O)O)[C@@H](OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(=O)[nH]c(N)nc54)[C@H](O)[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4ccc(=O)[nH]c4=O)[C@H](O)[C@@H]3OP(=O)(O)O)[C@H]2O)c(=O)n1',
		name: "CGU",
	},
	{
		smiles: 'Nc1nc2c(ncn2[C@@H]2O[C@H](COP(=O)(O)O)[C@@H](OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(=O)[nH]c(N)nc54)[C@H](O)[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(N)ncnc54)[C@H](O)[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(N)ncnc54)[C@H](O)[C@@H]3OP(=O)(O)O)[C@H]2O)c(=O)[nH]1',
		name: "GGAA",
	},
	{
		smiles: 'Nc1ccn([C@@H]2O[C@H](COP(=O)(O)O)[C@@H](OP(=O)(O)OC[C@H]3O[C@@H](n4ccc(=O)[nH]c4=O)[C@H](O)[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(N)ncnc54)[C@H](O)[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(=O)[nH]c(N)nc54)[C@H](O)[C@@H]3OP(=O)(O)O)[C@H]2O)c(=O)n1',
		name: "CUAG",
	},
	{
		smiles: 'Nc1ccn([C@@H]2O[C@H](COP(=O)(O)O[C@H]3[C@@H](O)[C@H](n4cnc5c(=O)[nH]c(N)nc54)O[C@@H]3COP(=O)(O)O)[C@@H](OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(N)ncnc54)[C@H](O)[C@@H]3OP(=O)(O)O)[C@H]2O)c(=O)n1',
		name: "GCA",
	},
	{
		smiles: 'Nc1ccn([C@@H]2O[C@H](COP(=O)(O)O[C@H]3[C@@H](O)[C@H](n4cnc5c(N)ncnc54)O[C@@H]3COP(=O)(O)O)[C@@H](OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(=O)[nH]c(N)nc54)[C@H](O)[C@@H]3OP(=O)(O)O)[C@H]2O)c(=O)n1',
		name: "ACG",
	},
];

// Flavor = 9
export const DNA = [
	{
		smiles: 'Nc1ccn([C@H]2C[C@H](OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(N)ncnc54)C[C@@H]3OP(=O)(O)O)[C@@H](COP(=O)(O)O[C@H]3C[C@H](n4cnc5c(N)ncnc54)O[C@@H]3COP(=O)(O)O)O2)c(=O)n1',
		name: "ACA",
	},
	{
		smiles: 'Nc1ccn([C@H]2C[C@H](OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(N)ncnc54)C[C@@H]3OP(=O)(O)O)[C@@H](COP(=O)(O)O[C@H]3C[C@H](n4cnc5c(N)ncnc54)O[C@@H]3COP(=O)(O)O)O2)c(=O)n1',
		name: "ATG",
	},
	{
		smiles: 'Cc1cn([C@H]2C[C@H](OP(=O)(O)OC[C@H]3O[C@@H](n4cc(C)c(=O)[nH]c4=O)C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(N)ncnc54)C[C@@H]3OP(=O)(O)O)[C@@H](COP(=O)(O)O)O2)c(=O)[nH]c1=O',
		name: "TTA",
	},
	{
		smiles: 'Cc1cn([C@H]2C[C@H](OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(N)ncnc54)C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cc(C)c(=O)[nH]c4=O)C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(=O)[nH]c(N)nc54)C[C@@H]3OP(=O)(O)O)[C@@H](COP(=O)(O)O)O2)c(=O)[nH]c1=O',
		name: "TATG",
	},
	{
		smiles: 'Cc1cn([C@H]2C[C@H](OP(=O)(O)O)[C@@H](COP(=O)(O)O[C@H]3C[C@H](n4cnc5c(N)ncnc54)O[C@@H]3COP(=O)(O)O)O2)c(=O)[nH]c1=O',
		name: "AT",
	},
	{
		smiles: 'Nc1ccn([C@H]2C[C@H](OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(=O)[nH]c(N)nc54)C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(N)ncnc54)C[C@@H]3OP(=O)(O)O)[C@@H](COP(=O)(O)O)O2)c(=O)n1',
		name: "CGA",
	},
];

// Flavor = 0
export const PEPTIDES = [
	// {
	// 	smiles: 'C[C@@H](C(=O)N[C@@H](CC(=O)O)C(=O)N[C@@H](CC(=O)O)C(=O)N[C@@H](C)C(=O)NCC(=O)N[C@@H](CC(C)C)C(=O)N[C@@H](C(C)C)C(=O)O)NC(=O)[C@@H]1CCCN1C(=O)[C@H](CCCCN)NC(=O)CNC(=O)[C@@H]2CCCN2C(=O)[C@@H]3CCCN3C(=O)[C@@H]4CCCN4C(=O)[C@H](CCC(=O)O)NC(=O)CN',
	// 	name: 'BPC-157',
	// },
	{
		smiles: 'CC(C)C[C@H](NC(=O)[C@H](CCC(N)=O)NC(=O)[C@H](Cc1c[nH]cn1)NC(=O)[C@@H](N)Cc1ccc(O)cc1)C(=O)O',
		name: 'YHQL',
	},
	{
		smiles: 'CC(C)C[C@H](NC(=O)[C@@H](N)C(C)C)C(=O)N[C@@H](CO)C(=O)N1CCC[C@H]1C(=O)N[C@@H](C)C(=O)N[C@@H](CC(=O)O)C(=O)N[C@@H](CCCCN)C(=O)N[C@H](C(=O)O)[C@@H](C)O',
		name: 'VLSPADKT',
	},
	{
		smiles: 'CC[C@H](C)[C@H](NC(=O)[C@H](Cc1ccc(O)cc1)NC(=O)[C@H](C)NC(=O)[C@@H](NC(=O)[C@H](CCCCN)NC(=O)[C@@H](N)CCSC)[C@@H](C)O)C(=O)N[C@@H](C)C(=O)N[C@@H](CCCCN)C(=O)O',
		name: 'MKTAYIAK',
	},
	{
		smiles: 'CC(C)C[C@H](NC(=O)CN)C(=O)N[C@@H](CO)C(=O)N[C@@H](CC(=O)O)C(=O)NCC(=O)N[C@@H](CCC(=O)O)C(=O)N[C@@H](Cc1c[nH]c2ccccc12)C(=O)N[C@@H](CCC(N)=O)C(=O)O',
		name: 'GLSDGEWQ',
	},
	{
		smiles: 'CC(C)C[C@H](NC(=O)[C@@H](N)C(C)C)C(=O)N[C@@H](CO)C(=O)N1CCC[C@H]1C(=O)N[C@@H](C)C(=O)N[C@@H](CC(=O)O)C(=O)N[C@@H](CCCCN)C(=O)N[C@H](C(=O)O)[C@@H](C)O',
		name: 'VLSPADKT',
	},
	{
		smiles: 'CC(C)C[C@H](NC(=O)[C@H](CCC(N)=O)NC(=O)[C@H](Cc1c[nH]cn1)NC(=O)[C@@H](N)Cc1ccc(O)cc1)C(=O)N[C@@H](CC(C)C)C(=O)N[C@@H](CCC(N)=O)C(=O)N[C@@H](CC(=O)O)C(=O)N1CCC[C@H]1C(=O)O',
		name: 'YHQLLQDP',
	},
];

/** Default set shown on first load */
export const DEFAULT_MOLECULES = DRUGLIKE;
