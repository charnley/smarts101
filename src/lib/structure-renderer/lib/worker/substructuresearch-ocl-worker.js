/**
 * OpenChemLib (OCL) substructure search worker
 * Dedicated worker for OCL-based substructure matching
 */

import * as _ocl from 'openchemlib';

let oclInitialized = false;
/** @type {any} */
let OCL = null;

/**
 * Initialize OpenChemLib
 * @returns {Promise<boolean>}
 */
const initializeOCL = async () => {
    if (!oclInitialized) {
        try {
            OCL = _ocl.default || _ocl;
            oclInitialized = true;
            console.debug('[OCL Worker] OCL initialized', OCL);
            return true;
        } catch (error) {
            console.error('[OCL Worker] Failed to initialize OCL:', error);
            return false;
        }
    }
    return true;
};

/**
 * OCL-based substructure search
 * @param {string} smarts - SMARTS pattern
 * @param {string[]} smilesList - Array of SMILES strings
 * @param {boolean} includeAtomBondIndices - Whether to include atom/bond match data
 * @returns {{matches: boolean[], indices: number[], allSoftspotMatches?: any[], atomBondMatches?: Array<{atoms: number[], bonds: number[]}>}}
 */
const performOCLSearch = (smarts, smilesList, includeAtomBondIndices = false) => {
    if (!OCL || !oclInitialized) {
        throw new Error('OCL not initialized');
    }

    const _queriesCache = new Map();

    const getSmartsQueryMolecule = (/** @type {string} */ smartsQuery) => {
        if (_queriesCache.has(smartsQuery)) {
            return _queriesCache.get(smartsQuery);
        }

        const query = new OCL.Molecule(0, 0);
        const parser = new OCL.SmilesParser({ smartsMode: 'smarts' });
        parser.parseMolecule(smartsQuery, { molecule: query });
        _queriesCache.set(smartsQuery, query);
        return query;
    };

    const query = getSmartsQueryMolecule(smarts);
    query.setFragment(true);

    const sss = new OCL.SSSearcher();
    sss.setFragment(query);

    const matches = new Array(smilesList.length);
    const atomBondMatches = includeAtomBondIndices ? new Array(smilesList.length) : [];
    const allSoftspotMatches = includeAtomBondIndices ? new Array(smilesList.length) : [];

    for (let i = 0; i < smilesList.length; i++) {
        const smi = smilesList[i];
        if (typeof smi !== 'string' || !smi.trim()) {
            matches[i] = false;
            continue;
        }
        try {
            const mol = OCL.Molecule.fromText(smi);
            sss.setMolecule(mol);
            const count = sss.findFragmentInMolecule({ countMode: 'separated' });
            const found = sss.getMatchList();
            matches[i] = sss.isFragmentInMolecule();
            if (includeAtomBondIndices) {
                atomBondMatches[i] = { atoms: found.flat(), bonds: [] };
                allSoftspotMatches[i] = [{ atoms: found, bonds: [] }];
            }
            console.debug(`[OCL Worker] matching ${smarts} against ${smi}: ${matches[i]}`, { count, found });
        } catch {
            console.debug(`[OCL Worker] NOT matching ${smarts} against ${smi}: ${matches[i]}`);
            matches[i] = false;
        }
    }

    const indices = matches.map((ok, i) => (ok ? i : -1)).filter((i) => i >= 0);
    const result = { matches, indices };

    if (includeAtomBondIndices) {
        result.atomBondMatches = atomBondMatches ?? new Array(smilesList.length).fill({ atoms: [], bonds: [] });
        result.allSoftspotMatches = allSoftspotMatches;
    }

    return result;
};

/**
 * Main search function
 * @param {string|string[]} smarts - SMARTS pattern(s)
 * @param {string|string[]} smiles - SMILES string(s)
 * @param {boolean} includeAtomBondIndices - Whether to include atom/bond match data
 */
const performSubstructureSearch = async (smarts, smiles, includeAtomBondIndices = false) => {
    try {
        const smartsArray = Array.isArray(smarts) ? smarts : [smarts];
        const smilesArray = Array.isArray(smiles) ? smiles : [smiles];

        if (smartsArray.length === 0 || smartsArray.some(s => !s || typeof s !== 'string')) {
            throw new Error('Invalid SMARTS input: must be non-empty string(s)');
        }
        if (smilesArray.length === 0 || smilesArray.some(s => !s || typeof s !== 'string')) {
            throw new Error('Invalid SMILES input: must be non-empty string(s)');
        }

        const success = await initializeOCL();
        if (!success) throw new Error('Failed to initialize OCL');

        const results = [];

        for (let i = 0; i < smartsArray.length; i++) {
            const currentSmarts = smartsArray[i];

            try {
                const searchResult = performOCLSearch(currentSmarts, smilesArray, includeAtomBondIndices);

                const resultObject = {
                    queryIndex: i,
                    smarts: currentSmarts,
                    engine: 'ocl',
                    totalTargets: smilesArray.length,
                    matchCount: searchResult.indices.length,
                    matches: searchResult.matches,
                    matchedIndices: searchResult.indices,
                    matchedSmiles: searchResult.indices.map(idx => smilesArray[idx]),
                    success: true,
                    error: null
                };

                if (includeAtomBondIndices && 'atomBondMatches' in searchResult) {
                    resultObject.atomBondMatches = searchResult.atomBondMatches;
                    resultObject.allSoftspotMatches = searchResult.allSoftspotMatches;
                }

                results.push(resultObject);
            } catch (/** @type {any} */ error) {
                results.push({
                    queryIndex: i,
                    smarts: currentSmarts,
                    engine: 'ocl',
                    totalTargets: smilesArray.length,
                    matchCount: 0,
                    matches: new Array(smilesArray.length).fill(false),
                    matchedIndices: [],
                    matchedSmiles: [],
                    success: false,
                    error: error?.message || String(error)
                });
            }
        }

        return {
            success: true,
            engine: 'ocl',
            results,
            summary: {
                totalQueries: smartsArray.length,
                totalTargets: smilesArray.length,
                successfulQueries: results.filter(r => r.success).length,
                failedQueries: results.filter(r => !r.success).length,
                totalMatches: results.reduce((sum, r) => sum + r.matchCount, 0)
            }
        };

    } catch (/** @type {any} */ error) {
        return {
            success: false,
            engine: 'ocl',
            error: error?.message || String(error),
            results: []
        };
    }
};

// Handle messages from the main thread
self.onmessage = async function (event) {
    const { id, smarts, smiles, includeAtomBondIndices = false } = event.data;

    try {
        if (!id) throw new Error('Message must include an id field');
        if (!smarts) throw new Error('Message must include smarts field');
        if (!smiles) throw new Error('Message must include smiles field');

        const result = await performSubstructureSearch(smarts, smiles, includeAtomBondIndices);

        self.postMessage({ id, type: 'success', data: result });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        self.postMessage({
            id: event.data?.id || 'unknown',
            type: 'error',
            error: errorMessage,
            data: null
        });
    }
};

// Handle worker errors
self.onerror = function (error) {
    const errorMessage = typeof error === 'string' ? error :
        error instanceof ErrorEvent ? error.message :
            'Unknown worker error';
    self.postMessage({
        id: 'worker-error',
        type: 'error',
        error: `OCL worker error: ${errorMessage}`,
        data: null
    });
};

console.debug('[OCL Worker] OpenChemLib substructure search worker loaded');
