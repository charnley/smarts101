<script module>
	import { getContext, setContext } from 'svelte';
	import { toggleVariants } from '$lib/components/ui/toggle/index.js';

	export function setToggleGroupCtx(props) {
		setContext('toggleGroup', props);
	}

	export function getToggleGroupCtx() {
		return getContext('toggleGroup');
	}
</script>

<script>
	import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		size = 'default',
		spacing = 0,
		variant = 'default',
		...restProps
	} = $props();

	setToggleGroupCtx({
		variant,
		size,
		spacing
	});
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<ToggleGroupPrimitive.Root
	bind:value
	bind:ref
	data-slot="toggle-group"
	data-variant={variant}
	data-size={size}
	data-spacing={spacing}
	style={`--gap: ${spacing}`}
	class={cn(
		'group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs',
		className
	)}
	{...restProps}
/>
