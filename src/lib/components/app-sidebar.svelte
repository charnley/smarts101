<script module>
	// @ts-nocheck
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import BookOpenCheckIcon from '@lucide/svelte/icons/book-open-check';
	import InfoIcon from '@lucide/svelte/icons/info';
	import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';

	const data = {
		navMain: [
			{
				title: 'Query',
				url: '/',
				icon: FlaskConicalIcon,
				isActive: true,
				items: [],
			},
			{
				title: 'Learn',
				url: '/how-to-smarts',
				icon: BookOpenIcon,
				items: [
					{
						title: 'Introduction',
						url: '/how-to-smarts#',
					},
					{
						title: 'Bond Primitives',
						url: '/how-to-smarts#',
					},
					{
						title: 'Logical Operators',
						url: '/how-to-smarts#',
					},
					{
						title: 'Recursive SMARTS',
						url: '/how-to-smarts#',
					},
					{
						title: 'Component-level grouping of SMARTS',
						url: '/how-to-smarts#',
					},
					{
						title: 'Reaction Queries',
						url: '/how-to-smarts#',
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
				title: 'About',
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
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	let { ref = $bindable(null), ...restProps } = $props();
</script>

<Sidebar.Root bind:ref variant="inset" {...restProps}>
	<Sidebar.Content>
		<NavMain items={data.navMain} />
	</Sidebar.Content>
</Sidebar.Root>
