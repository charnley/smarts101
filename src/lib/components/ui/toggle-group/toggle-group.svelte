<script module>
	// @ts-nocheck
	import { getContext, setContext } from 'svelte';
	import { toggleVariants } from '$lib/components/ui/toggle/index.js';

	/** @param {{ variant?: string, size?: string, spacing?: number }} props */
	export function setToggleGroupCtx(props) {
		setContext('toggleGroup', props);
	}

	export function getToggleGroupCtx() {
		return getContext('toggleGroup');
	}
</script>

<script>
	// @ts-nocheck
	import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	/** @type {{ ref?: any, value?: any, class?: string, size?: string, spacing?: number, variant?: string, [key: string]: any }} */
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
		get variant() {
			return variant;
		},
		get size() {
			return size;
		},
		get spacing() {
			return spacing;
		}
	});

	/** @type {any} */
	const toggleGroupRootProps = $derived({
		'data-slot': 'toggle-group',
		'data-variant': variant,
		'data-size': size,
		'data-spacing': spacing,
		style: `--gap: ${spacing}`,
		class: cn(
			'group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs',
			className
		),
		...restProps
	});
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting to `any`.
-->
<ToggleGroupPrimitive.Root bind:value bind:ref {...toggleGroupRootProps} />
