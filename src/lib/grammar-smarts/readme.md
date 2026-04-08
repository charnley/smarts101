# Notes on Tree-sitter for SMARTS

# TODO

- [ ] Have a dictionary for the different atoms and bonds, with a description
- [ ] Split multiple "." SMARTS into multiple images
- [ ] SVG Generation doesn't work with >> reactions
- [ ] From treesitter, split reaction and chains, such that I can show which there is
- [ ] Can I highlight a query mol get_svg_with_highlights? on treesitter highlight
- [ ] Somehow show the recursie SMARTS queries

# SMARTS reaction

https://github.com/rdkit/rdkit-js/issues/123

const rdkit = await window.initRDKitModule()
const rxn = rdkit.get_rxn(smiles)
const svg = rxn.get_svg(width, height)

This seems to render reactions as SMARTS by default.

You can display them as SMILES instead as something like:

const [reactants, products] = smiles.split(">>");

const reactantMol = RDKitModule.get_mol(reactants);
reactantSvg = reactantMol.get_svg();

const productMol = RDKitModule.get_mol(products);
productSvg = productMol.get_svg();

document.getElementById("detailContent").innerHTML = "<div id='reaction' style='display: flex; align-items: center; gap: 1
