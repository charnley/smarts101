# RDKit WASM

How to build `RDKit_minimal.js` + `RDKit_minimal.wasm` built from local source.

## Steps

Note, you should find and rename `docker-compose` to `docker compose`.

```bash
# 1. Enable reaction support — edit Dockerfile_local_build, add to emcmake cmake block:
#    -DRDK_BUILD_MINIMAL_LIB_RXN=ON \
vi ../../rdkit/Code/MinimalLib/docker/Dockerfile_local_build

# 2. Build
cd ../../rdkit/Code/MinimalLib
GET_SRC=copy_from_local scripts/build_rdkitjs.sh

# 3. Copy artifacts here
cp dist/RDKit_minimal.js  ../../../smarts101/src/lib/rdkit/
cp dist/RDKit_minimal.wasm ../../../smarts101/src/lib/rdkit/

# 4. Add default export to RDKit_minimal.js (required for ES module import)
echo "export default initRDKitModule;" >> src/lib/rdkit/RDKit_minimal.js
```

Build takes ~10 min.

## Optional features

| Flag | Adds |
|---|---|
| `-DRDK_BUILD_MINIMAL_LIB_RXN=ON` | `get_rxn()` + `run_reactants()` — SMIRKS reactions |
| `-DRDK_BUILD_MINIMAL_LIB_MCS=ON` | Maximum common substructure |
| `-DRDK_BUILD_MINIMAL_LIB_MOLZIP=ON` | MolZip / fragment linking |
