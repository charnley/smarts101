# SMARTS 101

An interactive browser-based app for interacting with SMARTS, a cheminformatics query language, for real-time molecule rendering and substructure search

## Technical Overview

| Package                            | Purpose                                                        |
| ---------------------------------- | -------------------------------------------------------------- |
| `rdkit`                            | RDKit WASM — molecule rendering and SMARTS substructure search |
| `paper`                            | Paper.js — vector graphics for highlight outline               |
| `sveltekit` + `svelte` v5          | Web framework                                                  |
| `tailwindcss` v4 + `shadcn-svelte` | Styling and headless UI primitives                             |

# TODO

- [ ] Find a way to work with reaction smarts `>>`
- [ ] atom mappings `:[n]`
