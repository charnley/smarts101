<script module>
	// @ts-nocheck
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import BotIcon from '@lucide/svelte/icons/bot';
	import ChartPieIcon from '@lucide/svelte/icons/chart-pie';
	import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';
	import FrameIcon from '@lucide/svelte/icons/frame';
	import MapIcon from '@lucide/svelte/icons/map';
	import Settings2Icon from '@lucide/svelte/icons/settings-2';
	import SquareTerminalIcon from '@lucide/svelte/icons/square-terminal';

	const data = {
		user: {
			name: 'shadcn',
			email: 'm@example.com',
			avatar: '/avatars/shadcn.jpg'
		},
		navMain: [
			{
				title: 'Playground',
				url: '/playground',
				icon: FlaskConicalIcon,
				isActive: true,
				items: []
			},
			{
				title: 'Models',
				url: '#',
				icon: BotIcon,
				items: [
					{
						title: 'Genesis',
						url: '#'
					},
					{
						title: 'Explorer',
						url: '#'
					},
					{
						title: 'Quantum',
						url: '#'
					}
				]
			},
			{
				title: 'Documentation',
				url: '#',
				icon: BookOpenIcon,
				items: [
					{
						title: 'Introduction',
						url: '#'
					},
					{
						title: 'Get Started',
						url: '#'
					},
					{
						title: 'Tutorials',
						url: '#'
					},
					{
						title: 'Changelog',
						url: '#'
					}
				]
			},
			{
				title: 'Settings',
				url: '#',
				icon: Settings2Icon,
				items: [
					{
						title: 'General',
						url: '#'
					},
					{
						title: 'Team',
						url: '#'
					},
					{
						title: 'Billing',
						url: '#'
					},
					{
						title: 'Limits',
						url: '#'
					}
				]
			}
		],
		projects: [
			{
				name: 'Design Engineering',
				url: '#',
				icon: FrameIcon
			},
			{
				name: 'Sales & Marketing',
				url: '#',
				icon: ChartPieIcon
			},
			{
				name: 'Travel',
				url: '#',
				icon: MapIcon
			}
		]
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
