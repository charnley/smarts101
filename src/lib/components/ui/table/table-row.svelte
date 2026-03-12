<script>
	import { cn } from '$lib/utils.js';
	let { ref = $bindable(null), class: className, children, ...restProps } = $props();
</script>

<tr
	bind:this={ref}
	data-slot="table-row"
	class={cn(
		'border-b transition-colors data-[state=selected]:bg-muted hover:[&,&>svelte-css-wrapper]:[&>th,td]:bg-muted/50',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</tr>
