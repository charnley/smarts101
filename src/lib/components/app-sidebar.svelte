<script module>
	// @ts-nocheck
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import BookOpenCheckIcon from '@lucide/svelte/icons/book-open-check';
	import BotIcon from '@lucide/svelte/icons/bot';
	import InfoIcon from '@lucide/svelte/icons/info';
	import ChartPieIcon from '@lucide/svelte/icons/chart-pie';
	import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';
	import FrameIcon from '@lucide/svelte/icons/frame';
	import MapIcon from '@lucide/svelte/icons/map';
	import Settings2Icon from '@lucide/svelte/icons/settings-2';
	import SquareTerminalIcon from '@lucide/svelte/icons/square-terminal';

	const data = {
		navMain: [
			{
				title: 'SMARTS',
				url: '/',
				icon: FlaskConicalIcon,
				isActive: true,
				items: [],
			},
			{
				title: 'Documentation',
				url: '/documentation',
				icon: BookOpenIcon,
				items: [
					{
						title: 'Introduction',
						url: '/documentation',
					},
					{
						title: 'Bond Primitives',
						url: '/documentation',
					},
					{
						title: 'Logical Operators',
						url: '/documentation',
					},
					{
						title: 'Recursive SMARTS',
						url: '/documentation',
					},
					{
						title: 'Component-level grouping of SMARTS',
						url: '/documentation',
					},
					{
						title: 'Reaction Queries',
						url: '/documentation',
					},
				],
			},
			{
				title: 'Quiz',
				url: '/test',
				icon: BookOpenCheckIcon,
				isActive: true,
				items: [],
			},
			{
				title: 'about',
				url: '/about',
				icon: InfoIcon,
				isActive: true,
				items: [],
			},
		],
	};
</script>

<script>
	// @ts-nocheck
	import NavMain from './nav-main.svelte';
	import NavProjects from './nav-projects.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Button } from '$lib/components/ui/button';
	import CommandIcon from '@lucide/svelte/icons/command';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { toggleMode, mode } from 'mode-watcher';
	let { ref = $bindable(null), ...restProps } = $props();
</script>

<Sidebar.Root bind:ref variant="inset" {...restProps}>
	<!-- <Sidebar.Header> -->
	<!-- 	<Sidebar.Menu> -->
	<!-- 		<Sidebar.MenuItem> -->
	<!-- 			<Sidebar.MenuButton size="lg"> -->
	<!-- 				{#snippet child({ props })} -->
	<!-- 					<a href="##" {...props}> -->
	<!-- 						<div -->
	<!-- 							class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground" -->
	<!-- 						> -->
	<!-- 							<CommandIcon class="size-4" /> -->
	<!-- 						</div> -->
	<!-- 						<div class="grid flex-1 text-start text-sm leading-tight"> -->
	<!-- 							<span class="truncate font-medium">Acme Inc</span> -->
	<!-- 							<span class="truncate text-xs">Enterprise</span> -->
	<!-- 						</div> -->
	<!-- 					</a> -->
	<!-- 				{/snippet} -->
	<!-- 			</Sidebar.MenuButton> -->
	<!-- 		</Sidebar.MenuItem> -->
	<!-- 	</Sidebar.Menu> -->
	<!-- </Sidebar.Header> -->
	<Sidebar.Content>
		<NavMain items={data.navMain} />
		<!-- <NavProjects projects={data.projects} /> -->
	</Sidebar.Content>
	<Sidebar.Footer>
		<Button variant="ghost" size="icon" onclick={toggleMode} aria-label="Toggle theme">
			{#if mode.current === 'dark'}
				<Sun class="size-5" />
			{:else}
				<Moon class="size-5" />
			{/if}
		</Button>
	</Sidebar.Footer>
</Sidebar.Root>
