<script>
	import { Button } from '$lib/components/ui/button/index.js';
	import PanelRightClose from '@lucide/svelte/icons/panel-right-close';

	/** @type {{ smarts: string, onclose: () => void }} */
	let { smarts, onclose } = $props();
</script>

<div class="flex w-80 shrink-0 flex-col gap-3 rounded-lg">
	<div class="flex justify-end">
		<Button variant="outline" aria-label="Close panel" onclick={onclose}>
			<PanelRightClose size={16} /> Explain
		</Button>
	</div>

	<div class="rounded-lg border p-4">
		placeholder
		<br />
		<br />

		placeholder
		<br />
		<br />

		placeholder
	</div>
</div>
