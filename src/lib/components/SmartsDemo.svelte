<script>
	import StructureRenderer from '$lib/structure-renderer/StructureRenderer.svelte';
	import { performSubstructureSearchAsync } from '$lib/structure-renderer/worker-manager.js';
	import { mode } from 'mode-watcher';
	import { Input } from '$lib/components/ui/input/index.js';

	/**
	 * @type {{
	 *   smiles: string,
	 *   smarts?: string[],
	 *   useCoordgen?: boolean,
	 * }}
	 */
	let { smiles, smarts = [], useCoordgen = false } = $props();

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

<div
	class="mx-auto my-5 flex max-w-[600px] flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-card sm:flex-row"
>
	<div
		class="flex flex-1 flex-col justify-center gap-2 border-b border-border p-4 sm:border-r sm:border-b-0"
	>
		{#each entries as entry, i (entry.id)}
			{@const color = palette[i % palette.length]}
			<div class="flex items-center gap-2">
				<span
					class="h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] transition-colors duration-150"
					style:background-color={entry.valid && entry.value.trim() ? color : 'transparent'}
					style:border-color={color}
				></span>
				<Input
					class="font-mono"
					type="text"
					value={entry.value}
					spellcheck={false}
					aria-label="SMARTS pattern {i + 1}"
					aria-invalid={!entry.valid || undefined}
					oninput={(/** @type {Event} */ e) =>
						onInput(entry.id, /** @type {HTMLInputElement} */ (e.currentTarget).value)}
				/>
			</div>
		{/each}
	</div>
	<div class="flex items-center justify-center p-2">
		<StructureRenderer
			structureDefinition={smiles}
			{highlights}
			{useCoordgen}
			width={300}
			height={220}
		/>
	</div>
</div>
