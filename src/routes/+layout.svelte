<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { PUBLIC_UMAMI_WEBSITE_ID } from '$env/static/public';

	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import { ModeWatcher, toggleMode, mode } from 'mode-watcher';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Button } from '$lib/components/ui/button';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import GithubIcon from '@lucide/svelte/icons/github';

	let { children } = $props();
</script>

<svelte:head>
	<title>SMARTS101: build, test and debug SMARTS queries</title>
	<link rel="icon" href={favicon} />
	{#if PUBLIC_UMAMI_WEBSITE_ID}
		<script
			defer
			src="https://cloud.umami.is/script.js"
			data-website-id={PUBLIC_UMAMI_WEBSITE_ID}
		></script>
	{/if}
</svelte:head>

<ModeWatcher />

<Sidebar.Provider class="" style="">
	<AppSidebar />
	<Sidebar.Inset class="">
		<header class="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background">
			<div class="flex flex-1 items-center gap-2 px-4">
				<Sidebar.Trigger class="-ms-1" onclick={() => {}} />
				<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
				<div class="font-bold">SMARTS 101</div>
			</div>
			<div class="flex items-center gap-1 px-4">
				<Button variant="ghost" size="icon" onclick={toggleMode} aria-label="Toggle theme">
					{#if mode.current === 'dark'}
						<Sun class="size-5" />
					{:else}
						<Moon class="size-5" />
					{/if}
				</Button>
				<Button
					variant="ghost"
					size="icon"
					target="_new"
					href="https://github.com/charnley/smarts101"
					aria-label="GitHub"
				>
					<GithubIcon class="size-5" />
				</Button>
			</div>
		</header>
		<div class="gap-4 p-4 pt-0">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

<style>
	header {
		animation: header-border linear both;
		animation-timeline: scroll(nearest);
		animation-range: 0px 1px;
	}

	@keyframes header-border {
		from {
			border-bottom: 1px solid transparent;
		}
		to {
			border-bottom: 1px solid var(--border);
		}
	}
</style>
