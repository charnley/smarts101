<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<ModeWatcher />

<Sidebar.Provider class="" style="">
	<AppSidebar />
	<Sidebar.Inset class="">
		<header class="flex h-16 shrink-0 items-center gap-2">
			<div class="flex items-center gap-2 px-4">
				<Sidebar.Trigger class="-ms-1" onclick={() => {}} />
				<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
				<div class="headline">SMARTS 101 - A Language for Describing Molecular Patterns</div>
			</div>
		</header>
		<div class="gap-4 p-4 pt-0">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

<style>
	.headline {
		font-weight: bold;
	}
</style>
