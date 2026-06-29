#include <emscripten/bind.h>
#include <GraphMol/ROMol.h>
#include <GraphMol/SmilesParse/SmilesParse.h>
#include <GraphMol/Atom.h>
#include <GraphMol/MolOps.h>
#include <GraphMol/RingInfo.h>
#include <nlohmann/json.hpp>
#include <string>
#include <memory>
#include <vector>
#include <set>

// ── internal types + helpers ────────────────────────────────────────────────
using AtomVec = std::vector<int>;

static AtomVec atom_vec(const RDKit::Atom *a, int inRing) {
    return {
        a->getAtomicNum(),
        static_cast<int>(a->getDegree()),
        static_cast<int>(a->getTotalValence()),
        a->getFormalCharge(),
        static_cast<int>(a->getTotalNumHs()),
        a->getIsAromatic() ? 1 : 0,
        inRing > 0 ? 1 : 0,
        static_cast<int>(a->getIsotope()),
    };
}

static bool all_unique(const std::vector<AtomVec> &vecs) {
    return std::set<AtomVec>(vecs.begin(), vecs.end()).size() == vecs.size();
}

// ── exposed embind function ────────────────────────────────────────────────
static std::string get_atom_properties(const std::string &smiles) {
    std::unique_ptr<RDKit::RWMol> mol(RDKit::SmilesToMol(smiles));
    if (!mol) return "[]";

    RDKit::MolOps::findSSSR(*mol);

    nlohmann::json arr = nlohmann::json::array();
    for (unsigned int i = 0; i < mol->getNumAtoms(); i++) {
        const RDKit::Atom *a = mol->getAtomWithIdx(i);
        int inRing = static_cast<int>(mol->getRingInfo()->numAtomRings(i));

        nlohmann::json obj;
        obj["idx"]           = i;
        obj["symbol"]        = a->getSymbol();
        obj["atomic_num"]    = a->getAtomicNum();
        obj["degree"]        = a->getDegree();
        obj["total_valence"] = a->getTotalValence();
        obj["formal_charge"] = a->getFormalCharge();
        obj["num_hydrogens"] = a->getTotalNumHs();
        obj["is_aromatic"]   = a->getIsAromatic();
        obj["is_in_ring"]    = inRing > 0;
        obj["isotope"]       = a->getIsotope();

        arr.push_back(std::move(obj));
    }
    return arr.dump();
}

EMSCRIPTEN_BINDINGS(smarter_smarts) {
    emscripten::function("getAtomsProperties(smiles)", &get_atom_properties);
}
