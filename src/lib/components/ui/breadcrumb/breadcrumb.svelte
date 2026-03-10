<script>
	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	} = $props();
</script>

<nav
	bind:this={ref}
	data-slot="breadcrumb"
	class={className}
	aria-label="breadcrumb"
	{...restProps}
>
	{@render children?.()}
</nav>