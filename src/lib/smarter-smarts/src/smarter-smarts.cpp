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
#include <set>
#include <algorithm>

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
        m_seen_hashes.clear();
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
        int total = static_cast<int>(m_smiles.size());
        int end = std::min(start + count, total);
        nlohmann::json results = nlohmann::json::array();
        int processed = 0;
        int found = 0;
        bool has_mols = !m_mols.empty();

        for (int i = start; i < end; i++) {
            processed++;
            RDKit::RWMol *mol_ptr = nullptr;
            std::unique_ptr<RDKit::RWMol> temp;
            if (has_mols && i < static_cast<int>(m_mols.size()) && m_mols[i]) {
                mol_ptr = m_mols[i].get();
            } else {
                temp = std::unique_ptr<RDKit::RWMol>(RDKit::SmilesToMol(m_smiles[i]));
                if (!temp) continue;
                mol_ptr = temp.get();
            }

            try {
                RDKit::SubstructMatchParameters params;
                params.uniquify = true;
                params.recursionPossible = true;
                params.maxMatches = 1;
                auto matches =
                    RDKit::SubstructMatch(*mol_ptr, *m_query, params);
                if (matches.empty()) continue;

                const auto &match = matches[0];
                std::vector<std::vector<int>> atomtypes;
                for (const auto &[qIdx, tIdx] : match) {
                    const RDKit::Atom *a = mol_ptr->getAtomWithIdx(tIdx);
                    std::vector<int> atype = {
                        a->getAtomicNum(),
                        static_cast<int>(a->getTotalValence()),
                        static_cast<int>(a->getNumImplicitHs()),
                        static_cast<int>(a->getDegree()),
                        a->getFormalCharge(),
                    };
                    atomtypes.push_back(std::move(atype));
                }

                if (!atomtypes.empty() &&
                    atomtypes[0][0] > atomtypes.back()[0]) {
                    std::reverse(atomtypes.begin(), atomtypes.end());
                }

                std::string hash = nlohmann::json(atomtypes).dump();
                if (m_seen_hashes.find(hash) != m_seen_hashes.end()) continue;
                m_seen_hashes.insert(hash);

                results.push_back({
                    {"molecule_idx", i},
                    {"smiles", m_smiles[i]},
                });
                found++;
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
            (end >= total);
        resp["progress"] =
            total == 0
                ? 1.0
                : static_cast<double>(end) / total;
        return resp.dump();
    }

    int size() const { return static_cast<int>(m_smiles.size()); }

    std::string preload() {
        m_mols.clear();
        m_mols.reserve(m_smiles.size());
        int total_atoms = 0;
        int failed = 0;
        for (const auto &smi : m_smiles) {
            auto mol = std::unique_ptr<RDKit::RWMol>(RDKit::SmilesToMol(smi));
            if (mol) {
                total_atoms += mol->getNumAtoms();
                m_mols.push_back(std::move(mol));
            } else {
                m_mols.push_back(nullptr);
                failed++;
            }
        }
        long long approx_bytes =
            static_cast<long long>(total_atoms) * 350 +
            static_cast<long long>(m_mols.size()) * 200;
        nlohmann::json resp = {
            {"ok", true},
            {"loaded", m_mols.size()},
            {"failed", failed},
            {"total_atoms", total_atoms},
            {"approx_memory_mb", approx_bytes / (1024 * 1024)},
        };
        return resp.dump();
    }

    int loadedCount() const { return static_cast<int>(m_mols.size()); }

private:
    std::vector<std::string> m_smiles;
    std::vector<std::unique_ptr<RDKit::RWMol>> m_mols;
    std::unique_ptr<RDKit::RWMol> m_query;
    std::set<std::string> m_seen_hashes;
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
        .function("preload", &SmartsSearcher::preload)
        .function("loadedCount", &SmartsSearcher::loadedCount)
        .function("initSearch", &SmartsSearcher::initSearch)
        .function("searchBatch", &SmartsSearcher::searchBatch)
        .function("size", &SmartsSearcher::size);
}
