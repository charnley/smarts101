<script>
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';
	import { performSubstructureSearchAsync } from '$lib/structure-renderer/worker-manager.js';
	import { mode } from 'mode-watcher';

	/**
	 * @type {{
	 *   smiles: string,
	 *   smarts?: string[]
	 * }}
	 */
	let { smiles, smarts = [] } = $props();

	// Tailwind 600-series for light mode, 400-series for dark mode
	const PALETTE_LIGHT = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2'];
	const PALETTE_DARK = ['#60a5fa', '#4ade80', '#f87171', '#fbbf24', '#a78bfa', '#22d3ee'];

	let palette = $derived(mode.current === 'dark' ? PALETTE_DARK : PALETTE_LIGHT);

	/** @type {{ id: number, value: string, valid: boolean }[]} */
	let entries = $state(smarts.map((s, i) => ({ id: i, value: s, valid: true })));

	/** @type {Map<number, ReturnType<typeof setTimeout>>} */
	const timers = new Map();

	/**
	 * Validate a SMARTS entry after a short debounce.
	 * @param {number} id
	 * @param {string} value
	 */
	function scheduleValidation(id, value) {
		if (timers.has(id)) clearTimeout(timers.get(id));
		timers.set(
			id,
			setTimeout(async () => {
				timers.delete(id);
				if (!value.trim()) {
					setValid(id, true);
					return;
				}
				try {
					await performSubstructureSearchAsync(value, 'C', 'rdkit', false);
					setValid(id, true);
				} catch {
					setValid(id, false);
				}
			}, 300),
		);
	}

	/**
	 * @param {number} id
	 * @param {boolean} valid
	 */
	function setValid(id, valid) {
		const entry = entries.find((e) => e.id === id);
		if (entry) entry.valid = valid;
	}

	/**
	 * @param {number} id
	 * @param {string} value
	 */
	function onInput(id, value) {
		const entry = entries.find((e) => e.id === id);
		if (entry) entry.value = value;
		scheduleValidation(id, value);
	}

	let highlights = $derived({
		definitions: entries
			.map((e, i) => ({ e, color: palette[i % palette.length] }))
			.filter(({ e }) => e.valid && e.value.trim())
			.map(({ e, color }, i) => ({
				smarts: e.value,
				color,
				id: String(e.id),
				name: `Pattern ${i + 1}`,
			})),
		outline: true,
		fill: false,
	});
</script>

<div class="smarts-demo">
	<div class="smarts-demo__inputs">
		{#each entries as entry, i (entry.id)}
			{@const color = palette[i % palette.length]}
			<div class="smarts-demo__row">
				<span
					class="smarts-demo__dot"
					style:background-color={entry.valid && entry.value.trim() ? color : 'transparent'}
					style:border-color={color}
				></span>
				<input
					class="smarts-demo__input"
					class:smarts-demo__input--invalid={!entry.valid}
					type="text"
					value={entry.value}
					spellcheck="false"
					aria-label="SMARTS pattern {i + 1}"
					oninput={(e) => onInput(entry.id, e.currentTarget.value)}
				/>
			</div>
		{/each}
	</div>
	<div class="smarts-demo__renderer">
		<StructureRenderer {smiles} {highlights} width={300} height={220} />
	</div>
</div>

<style>
	.smarts-demo {
		display: flex;
		flex-direction: row;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--card);
		margin-block: 1.5rem;

		max-width: 600px;
		margin: 20px auto;
	}

	.smarts-demo__inputs {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
		border-right: 1px solid var(--border);
		min-width: 200px;
		flex: 1;
	}

	.smarts-demo__row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.smarts-demo__dot {
		flex-shrink: 0;
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 50%;
		border: 1.5px solid;
		transition: background-color 0.15s ease;
	}

	.smarts-demo__input {
		flex: 1;
		min-width: 0;
		padding: 0.375rem 0.625rem;
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.875rem;
		border: 1px solid var(--border);
		border-radius: calc(var(--radius) - 2px);
		background: var(--background);
		color: var(--foreground);
		outline: none;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.smarts-demo__input:focus {
		border-color: var(--ring);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 30%, transparent);
	}

	.smarts-demo__input--invalid {
		border-color: var(--destructive);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--destructive) 20%, transparent);
	}

	.smarts-demo__renderer {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		flex-shrink: 0;
	}
</style>
