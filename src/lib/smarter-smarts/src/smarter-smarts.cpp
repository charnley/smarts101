#include <emscripten/bind.h>
#include <GraphMol/ROMol.h>
#include <GraphMol/SmilesParse/SmilesParse.h>
#include <GraphMol/Atom.h>
#include <GraphMol/MolOps.h>
#include <GraphMol/RingInfo.h>
#include <GraphMol/Substruct/SubstructMatch.h>
#include <nlohmann/json.hpp>
#include <string>
#include <memory>
#include <vector>

// ── SmartsSearcher ────────────────────────────────────────────────────────

class SmartsSearcher {
public:
    SmartsSearcher() {}

    std::string load(const std::string &smiles_json) {
        try {
            auto arr = nlohmann::json::parse(smiles_json);
            if (!arr.is_array()) {
                return R"({"ok":false,"error":"expected JSON array"})";
            }
            m_smiles.clear();
            m_smiles.reserve(arr.size());
            for (const auto &item : arr) {
                if (item.is_string()) {
                    m_smiles.push_back(item.get<std::string>());
                } else if (item.is_object() && item.contains("smiles")) {
                    m_smiles.push_back(item["smiles"].get<std::string>());
                }
            }
            nlohmann::json resp = {{"ok", true}, {"count", m_smiles.size()}};
            return resp.dump();
        } catch (const std::exception &e) {
            return nlohmann::json({{"ok", false}, {"error", e.what()}}).dump();
        }
    }

    std::string initSearch(const std::string &smarts) {
        std::unique_ptr<RDKit::RWMol> q(RDKit::SmartsToMol(smarts));
        if (!q) {
            return R"({"ok":false,"error":"Invalid SMARTS pattern"})";
        }
        m_query = std::move(q);
        return R"({"ok":true})";
    }

    std::string searchBatch(int start, int count) {
        if (!m_query) {
            return R"({"ok":false,"error":"No SMARTS query initialized. Call initSearch first."})";
        }
        int end = std::min(start + count, static_cast<int>(m_smiles.size()));
        nlohmann::json results = nlohmann::json::array();
        int processed = 0;
        int found = 0;

        for (int i = start; i < end; i++) {
            processed++;
            std::unique_ptr<RDKit::RWMol> mol(RDKit::SmilesToMol(m_smiles[i]));
            if (!mol) continue;

            RDKit::MolOps::findSSSR(*mol);

            try {
                RDKit::SubstructMatchParameters params;
                params.uniquify = true;
                params.recursionPossible = true;
                params.maxMatches = 1;
                auto matches =
                    RDKit::SubstructMatch(*mol, *m_query, params);
                if (!matches.empty()) {
                    results.push_back({
                        {"molecule_idx", i},
                        {"smiles", m_smiles[i]},
                    });
                    found++;
                }
            } catch (...) {
                continue;
            }
        }

        nlohmann::json resp;
        resp["ok"] = true;
        resp["matches"] = std::move(results);
        resp["processed"] = processed;
        resp["found"] = found;
        resp["done"] =
            (end >= static_cast<int>(m_smiles.size()));
        resp["progress"] =
            m_smiles.empty()
                ? 1.0
                : static_cast<double>(end) / m_smiles.size();
        return resp.dump();
    }

    int size() const { return static_cast<int>(m_smiles.size()); }

private:
    std::vector<std::string> m_smiles;
    std::unique_ptr<RDKit::RWMol> m_query;
};

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

    emscripten::class_<SmartsSearcher>("SmartsSearcher")
        .constructor<>()
        .function("load", &SmartsSearcher::load)
        .function("initSearch", &SmartsSearcher::initSearch)
        .function("searchBatch", &SmartsSearcher::searchBatch)
        .function("size", &SmartsSearcher::size);
}
