import { IsotopicDistribution } from 'isotopic-distribution';
import { Molecule } from 'openchemlib';
import { MF } from 'mf-parser';
import { getMF } from 'openchemlib-utils';

/**
 *
 * @param {string} formula
 * @returns {any}
 */
const getElementalComposition = (formula) => {
	const mf = new MF(formula);
	return (mf?.getInfo() ?? {}).atoms ?? {};
};

/**
 *
 * @param {string} formula - Molecular formula
 * @returns {any}
 */
const getIsotopicMassDistribution = (formula) => {
	const distribution = new IsotopicDistribution(formula);
	const gauss = distribution?.getGaussian() ?? { x: [], y: [] };
	// @ts-ignore
	const gaussX = [...gauss.x.values()];
	// @ts-ignore
	const gaussY = [...gauss.y.values()];
	const distrib = distribution?.getDistribution()?.array ?? [];
	return {
		// @ts-ignore
		distribution: distrib,
		// @ts-ignore
		gaussian: gaussX.map((x, idx) => {
			return { x, y: gaussY[idx] };
		}),
		peaks: distribution?.getPeaks() ?? [],
		table: distribution?.getTable() ?? [],
		mostAbundantMass: getMostAbundantMonoisotopicMass(distrib),
		monoisotopicMass: distrib[0] ?? { x: 0, y: 0 },
		weightedMeanMass: getWeightedMeanMassFromIsotopicDistribution(distrib),
	};
};

/**
 *
 * @param {Array<any>} distribution
 * @returns {Number}
 */
const getWeightedMeanMassFromIsotopicDistribution = (distribution = []) => {
	const weighted = distribution.reduce((avg, data) => avg + data.x * data.y, 0);
	return weighted;
};

/**
 *
 * @param {Array<any>} distribution
 * @returns {{x: number, y: number}}
 */
const getMostAbundantMonoisotopicMass = (distribution = []) => {
	const maxAboundance = distribution.reduce((max, data) => (max.y > data.y ? max : data), {
		x: 0,
		y: 0,
	});
	return maxAboundance;
};

/**
 *
 * @param {string} SMILES
 */
export const getProperties = (SMILES) => {
	const properties = {};
	try {
		const oclMolecule = Molecule.fromSmiles(SMILES);
		const cleanedMolecule = Molecule.fromSmiles(
			oclMolecule.toIsomericSmiles({ kekulizedOutput: true }),
		);
		const gmf = getMF(cleanedMolecule);
		// @ts-ignore
		const mf = new MF(gmf?.mf);
		const formula = mf?.flatten?.()?.[0];

		// Get mass information
		const distribution = getIsotopicMassDistribution(formula);

		//Get elemental composition
		const elementalComposition = getElementalComposition(formula);
		properties.molecularFormula = formula;
		properties.elementalComposition = elementalComposition;
		properties.isotopicDistribution = distribution;
		properties.masses = {
			monoisotopic: distribution?.monoisotopicMass?.x ?? 0,
			mostAbundantMonoisotopic: distribution?.mostAbundantMass?.x ?? 0,
			weightedMean: distribution?.weightedMeanMass ?? 0,
		};
	} catch (/** @type {any} */ error) {
		properties.error = error?.message || String(error);
	} finally {
		return properties;
	}
};
