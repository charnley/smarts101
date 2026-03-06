<script>
    import { StructureRenderer } from "$lib/structure-renderer/index.js";

    let smiles = $state("c1ccccc1O");
    let inputValue = $state("c1ccccc1O");
    let rendererRef = $state();
    /** @type {{ mass?: any, formula?: string|null, smiles?: string|null, molblock?: string|null, detectedSoftspots?: any[] }|null} */
    let renderInfo = $state(null);

    const exampleMolecules = [
        { label: "Phenol", smiles: "c1ccccc1O" },
        { label: "Aspirin", smiles: "CC(=O)Oc1ccccc1C(O)=O" },
        { label: "Caffeine", smiles: "Cn1c(=O)c2c(ncn2C)n(C)c1=O" },
        { label: "Ibuprofen", smiles: "CC(C)Cc1ccc(cc1)C(C)C(O)=O" },
        { label: "Paracetamol", smiles: "CC(=O)Nc1ccc(O)cc1" },
    ];

    const smartsDefinitions = [
        {
            id: "hydroxyl",
            name: "Hydroxyl",
            smarts: "[OX2H]",
            color: [0.12, 0.56, 1.0, 1.0],
        },
        {
            id: "carbonyl",
            name: "Carbonyl",
            smarts: "[CX3]=[OX1]",
            color: [1.0, 0.27, 0.0, 1.0],
        },
        {
            id: "amine",
            name: "Amine",
            smarts: "[NX3;H2,H1;!$(NC=O)]",
            color: [0.0, 0.8, 0.4, 1.0],
        },
    ];

    let enableSmarts = $state(true);
    let enableMinimap = $state(true);
    let enableContextMenu = $state(true);

    /** @type {Record<string, boolean>} Track visibility state per softspot id */
    let softspotVisibility = $state({});

    function loadSmiles() {
        smiles = inputValue;
    }

    /**
     * @param {any} info
     */
    function handleRenderEnd(info) {
        renderInfo = info;
        // Initialize all detected softspots as visible
        /** @type {Record<string, boolean>} */
        const vis = {};
        for (const spot of info?.detectedSoftspots ?? []) {
            vis[spot.id] = true;
        }
        softspotVisibility = vis;
    }

    /**
     * @param {string} id
     */
    function toggleSpot(id) {
        const newVal = !softspotVisibility[id];
        softspotVisibility[id] = newVal;
        rendererRef?.toggleSoftspotVisibility(id, newVal);
    }
</script>

<svelte:head>
    <title>SMARTS 101</title>
</svelte:head>

<div class="demo-page">
    <h1>SMARTS 101</h1>
    <p class="subtitle">
        A demo of the SMARTS detection and outlining features based on RDKit and
        Svelte magic.
    </p>

    <div class="demo-layout">
        <div class="controls">
            <fieldset>
                <legend>Molecule Input</legend>
                <label>
                    SMILES / Molblock
                    <textarea
                        bind:value={inputValue}
                        rows="3"
                        placeholder="Enter SMILES string..."
                    ></textarea>
                </label>
                <button onclick={loadSmiles}>Render</button>

                <div class="examples">
                    <span>Examples:</span>
                    {#each exampleMolecules as mol}
                        <button
                            class="example-btn"
                            onclick={() => {
                                inputValue = mol.smiles;
                                smiles = mol.smiles;
                            }}
                        >
                            {mol.label}
                        </button>
                    {/each}
                </div>
            </fieldset>

            {#if renderInfo}
                <fieldset>
                    <legend>Molecular Properties</legend>
                    <dl>
                        {#if renderInfo.formula}
                            <dt>Formula</dt>
                            <dd>{renderInfo.formula}</dd>
                        {/if}
                        {#if renderInfo.mass?.monoisotopic}
                            <dt>Monoisotopic Mass</dt>
                            <dd>{renderInfo.mass.monoisotopic.toFixed(4)}</dd>
                        {/if}
                        {#if renderInfo.smiles}
                            <dt>Canonical SMILES</dt>
                            <dd class="smiles">{renderInfo.smiles}</dd>
                        {/if}
                    </dl>
                </fieldset>
            {/if}

            {#if renderInfo?.detectedSoftspots?.length}
                <fieldset class="softspots-fieldset">
                    <legend>
                        Detected SMARTS ({renderInfo.detectedSoftspots.length})
                    </legend>
                    <ul class="softspot-list">
                        {#each renderInfo.detectedSoftspots as spot}
                            <li>
                                <label class="checkbox spot-toggle">
                                    <input
                                        type="checkbox"
                                        checked={softspotVisibility[spot.id] ??
                                            true}
                                        onchange={() => toggleSpot(spot.id)}
                                    />
                                    <span
                                        class="spot-swatch"
                                        style:background={Array.isArray(
                                            spot.color,
                                        )
                                            ? `rgba(${Math.round(spot.color[0] * 255)},${Math.round(spot.color[1] * 255)},${Math.round(spot.color[2] * 255)},${spot.color[3] ?? 1})`
                                            : spot.color}
                                    ></span>
                                    <strong>{spot.name}</strong>
                                </label>
                                <span class="spot-detail">
                                    {spot.atoms.length} atoms, {spot.bonds
                                        .length} bonds
                                </span>
                            </li>
                        {/each}
                    </ul>
                </fieldset>
            {/if}
        </div>

        <div class="renderer-panel">
            <StructureRenderer
                bind:this={rendererRef}
                definition={smiles}
                width={700}
                height={500}
                softspots={enableSmarts
                    ? {
                          definitions: smartsDefinitions,
                          outline: true,
                          fill: true,
                      }
                    : { definitions: [] }}
                minimapOptions={{
                    visible: enableMinimap,
                    position: "top-right",
                    ratio: 0.15,
                }}
                {enableContextMenu}
                onrenderend={handleRenderEnd}
            />
        </div>

        <div class="side-controls">
            <fieldset>
                <legend>Options</legend>
                <label class="checkbox">
                    <input type="checkbox" bind:checked={enableSmarts} />
                    Enable SMARTS detection
                </label>
                <label class="checkbox">
                    <input type="checkbox" bind:checked={enableMinimap} />
                    Enable minimap (zoom/pan)
                </label>
                <label class="checkbox">
                    <input type="checkbox" bind:checked={enableContextMenu} />
                    Enable context menu
                </label>
            </fieldset>

            <fieldset>
                <legend>Zoom Controls</legend>
                <div class="zoom-btns">
                    <button onclick={() => rendererRef?.zoomIn()}
                        >Zoom In</button
                    >
                    <button onclick={() => rendererRef?.zoomOut()}
                        >Zoom Out</button
                    >
                    <button onclick={() => rendererRef?.resetZoom()}
                        >Reset</button
                    >
                </div>
            </fieldset>
        </div>
    </div>
</div>

<style>
    .demo-page {
        max-width: 1400px;
        margin: 0 auto;
        padding: 24px;
        font-family:
            system-ui,
            -apple-system,
            sans-serif;
        color: #161616;
        height: calc(100dvh - 96px);
        max-height: calc(100dvh - 96px);
        overflow: hidden;
        position: relative;
    }

    h1 {
        font-size: 28px;
        font-weight: 600;
        margin: 0 0 4px;
    }

    .subtitle {
        color: #525252;
        margin: 0 0 24px;
        font-size: 14px;
    }

    .demo-layout {
        display: grid;
        grid-template-columns: 280px 1fr 280px;
        gap: 24px;
        align-items: start;
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .side-controls {
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: sticky;
        top: 24px;
    }

    fieldset {
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        padding: 12px;
        margin: 0;
    }

    legend {
        font-weight: 600;
        font-size: 13px;
        padding: 0 4px;
        color: #393939;
    }

    label {
        display: block;
        font-size: 13px;
        color: #525252;
        margin-bottom: 4px;
    }

    textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 8px;
        border: 1px solid #c6c6c6;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        resize: vertical;
        margin-top: 4px;
    }

    button {
        padding: 8px 16px;
        background: #0f62fe;
        color: #fff;
        border: none;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        margin-top: 8px;
    }

    button:hover {
        background: #0353e9;
    }

    .examples {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 8px;
        align-items: center;
    }

    .examples span {
        font-size: 12px;
        color: #8d8d8d;
    }

    .example-btn {
        padding: 4px 8px;
        background: #e0e0e0;
        color: #161616;
        font-size: 11px;
        margin-top: 0;
        border-radius: 3px;
    }

    .example-btn:hover {
        background: #c6c6c6;
    }

    .checkbox {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
        cursor: pointer;
    }

    .checkbox input {
        margin: 0;
    }

    .zoom-btns {
        display: flex;
        gap: 6px;
    }

    .zoom-btns button {
        flex: 1;
        padding: 6px 8px;
        font-size: 12px;
        margin-top: 0;
    }

    dl {
        margin: 0;
        font-size: 12px;
    }

    dt {
        font-weight: 600;
        color: #393939;
        margin-top: 6px;
    }

    dd {
        margin: 2px 0 0;
        color: #525252;
    }

    dd.smiles {
        font-family: monospace;
        word-break: break-all;
        font-size: 11px;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .softspots-fieldset {
        max-height: 35dvh;
        overflow-y: auto;
    }

    .softspot-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .softspot-list li {
        padding: 4px 0;
        border-bottom: 1px solid #f4f4f4;
        font-size: 12px;
        display: flex;
        flex-direction: column;
        gap: 1px;
    }

    .softspot-list li:last-child {
        border-bottom: none;
    }

    .spot-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        margin-bottom: 0;
    }

    .spot-toggle input {
        margin: 0;
    }

    .spot-swatch {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 2px;
        flex-shrink: 0;
        border: 1px solid rgba(0, 0, 0, 0.15);
    }

    .spot-detail {
        color: #6f6f6f;
        font-size: 11px;
        padding-left: 34px;
    }

    .renderer-panel {
        position: sticky;
        top: 24px;
    }

    @media (max-width: 900px) {
        .demo-layout {
            grid-template-columns: 1fr;
        }

        .renderer-panel {
            position: static;
        }

        .side-controls {
            position: static;
        }
    }
</style>
