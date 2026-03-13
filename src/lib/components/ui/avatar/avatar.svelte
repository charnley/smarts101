<script>
	import { Avatar as AvatarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	/** @type {{
	 *   ref?: HTMLElement | null,
	 *   loadingStatus?: import('bits-ui').AvatarImageLoadingStatus,
	 *   class?: string,
	 *   [key: string]: any
	 * }} */
	let {
		ref = $bindable(null),
		loadingStatus = $bindable(
			/** @type {import('bits-ui').AvatarImageLoadingStatus} */ ('loading')
		),
		class: className,
		...restProps
	} = $props();
</script>

<AvatarPrimitive.Root
	bind:ref
	bind:loadingStatus
	data-slot="avatar"
	class={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
	{...restProps}
/>
