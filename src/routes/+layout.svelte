<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { PUBLIC_UMAMI_WEBSITE_ID } from '$env/static/public';

	import { ModeWatcher, toggleMode, mode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import GithubIcon from '@lucide/svelte/icons/github';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import BookOpenCheckIcon from '@lucide/svelte/icons/book-open-check';
	import InfoIcon from '@lucide/svelte/icons/info';
	import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';

	let { children } = $props();

	let menuOpen = $state(false);

	const navItems = [
		{ title: 'Query', url: '/smarts', icon: FlaskConicalIcon },
		{ title: 'Learn', url: '/how-to-smarts', icon: BookOpenIcon },
		{ title: 'Quiz', url: '/quiz', icon: BookOpenCheckIcon },
		{ title: 'About', url: '/about', icon: InfoIcon },
	];
</script>

<svelte:head>
	<title>SMARTS101</title>
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

<div class="layout-root">
	<header class="sticky top-0 z-20 flex h-16 shrink-0 items-center bg-background">
		<!-- Left: hamburger (mobile) + title -->
		<div class="flex items-center gap-2 px-4">
			<Button
				class="-ms-1 md:hidden"
				variant="ghost"
				size="icon"
				aria-label="Toggle menu"
				onclick={() => (menuOpen = !menuOpen)}
			>
				<MenuIcon class="size-5" />
			</Button>
			<span class="font-bold">SMARTS 101</span>
		</div>

		<!-- Center: nav links (desktop only) -->
		<nav class="hidden flex-1 justify-center gap-1 md:flex">
			{#each navItems as item}
				<Button variant="ghost" href={item.url}>
					<item.icon class="size-4" />
					{item.title}
				</Button>
			{/each}
		</nav>

		<!-- Right: actions -->
		<div class="ms-auto flex items-center gap-1 px-4 md:ms-0">
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

	<!-- Mobile dropdown menu -->
	{#if menuOpen}
		<div class="mobile-menu md:hidden">
			{#each navItems as item}
				<Button
					variant="secondary"
					href={item.url}
					class="w-full justify-start"
					onclick={() => (menuOpen = false)}
				>
					<item.icon class="size-4" />
					{item.title}
				</Button>
			{/each}
		</div>
	{/if}

	<main class="gap-4 p-4">
		{@render children()}
	</main>
</div>

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

	.mobile-menu {
		position: fixed;
		top: 4rem; /* h-16 = 64px = 4rem */
		left: 0;
		right: 0;
		z-index: 20;
		background: var(--background);
		border-bottom: 1px solid var(--border);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
	}
</style>
