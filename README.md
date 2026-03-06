# SMARTS 101

A Svelte 5 demo app for interactive molecule rendering with SMARTS pattern detection and outlining, powered by [RDKit](https://www.rdkit.org/) via web workers.

## Features

- **Molecule rendering** — paste a SMILES or molblock and get a 2D depiction
- **SMARTS detection** — define SMARTS patterns and see matched substructures highlighted with colored outlines
- **Toggle outlines** — show/hide each detected softspot individually
- **Zoom & pan** — optional minimap with mouse-wheel zoom
- **Context menu** — right-click to copy SMILES, molblock, formula, masses, or the structure as a PNG image
- **Molecular properties** — displays formula, monoisotopic mass, and canonical SMILES

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 8+

## Install

```bash
git clone <repo-url>
cd smarts-101
pnpm install
```

## Development

```bash
pnpm dev
```

Opens the app at [http://localhost:5173](http://localhost:5173).

## Build

```bash
pnpm build
pnpm preview   # preview the production build locally
```

## Usage

### Basic

```svelte
<script>
  import { StructureRenderer } from '$lib/structure-renderer/index.js';
</script>

<StructureRenderer definition="c1ccccc1O" width={600} height={400} />
```

### With SMARTS detection

```svelte
<StructureRenderer
  definition="CC(=O)Oc1ccccc1C(O)=O"
  width={700}
  height={500}
  softspots={{
    definitions: [
      { id: 'hydroxyl', name: 'Hydroxyl', smarts: '[OX2H]', color: [0.12, 0.56, 1.0, 1.0] },
      { id: 'carbonyl', name: 'Carbonyl', smarts: '[CX3]=[OX1]', color: [1.0, 0.27, 0.0, 1.0] },
    ],
    outline: true,
    fill: true,
  }}
  enableContextMenu={true}
  minimapOptions={{ visible: true, position: 'top-right', ratio: 0.15 }}
  onrenderend={(info) => console.log(info)}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `definition` | `string` | — | SMILES or molblock to render |
| `width` | `number` | `600` | Width in pixels |
| `height` | `number` | `400` | Height in pixels |
| `softspots` | `object` | `{ definitions: [] }` | SMARTS pattern configuration |
| `minimapOptions` | `object` | `{ visible: false }` | Minimap/zoom-pan settings |
| `enableContextMenu` | `boolean` | `false` | Show right-click copy menu |
| `showBondIndices` | `boolean` | `false` | Display bond index labels |
| `selection` | `object` | `{ enabled: false }` | Lasso selection config |
| `userDrawingOptions` | `object` | `{}` | Extra RDKit drawing options |
| `onrenderend` | `function` | — | Callback with molecular properties after render |
| `onrendererror` | `function` | — | Callback on render error |

### Exported methods

```js
rendererRef.zoomIn();
rendererRef.zoomOut();
rendererRef.resetZoom();
rendererRef.getDetectedSoftspots();
rendererRef.getMolecularProperties();
rendererRef.getSvgElement();
rendererRef.toggleSoftspotVisibility(softspotId, visible?);
```

## Tech stack

- [SvelteKit](https://kit.svelte.dev/) + Svelte 5
- [RDKit.js](https://www.rdkit.org/) — cheminformatics via WASM web workers
- [OpenChemLib](https://github.com/cheminfo/openchemlib-js) — molecular formula & mass calculations
- [D3](https://d3js.org/) — zoom/pan behavior
- [html-to-image](https://github.com/nicornLabs/html-to-image) — copy structure as PNG

## License

Private