import initSmarterSmartsModule from './smarter-smarts.js';
import wasmUrl from './smarter-smarts.wasm?url';

let _module = null;
let _initPromise = null;

export async function getSmarterSmartsModule() {
    if (_module) return _module;
    if (!_initPromise) {
        _initPromise = initSmarterSmartsModule(
            /** @type {any} */ ({ locateFile: () => wasmUrl })
        ).then((m) => {
            _module = m;
            return m;
        });
    }
    return _initPromise;
}

export async function getAtomProperties(smiles) {
    const mod = await getSmarterSmartsModule();
    return JSON.parse(mod.get_atom_properties(smiles));
}
