/**
 * Reactive breakpoint helpers.
 * Each export is a $state-backed boolean that tracks a CSS media query.
 * Safe to import in any Svelte component — the $effect that wires up the
 * matchMedia listener runs only in the browser.
 */

/** @param {string} query */
function makeBreakpoint(query) {
	let matches = $state(false);

	if (typeof window !== 'undefined') {
		const mq = window.matchMedia(query);
		matches = mq.matches;
		mq.addEventListener('change', (e) => (matches = e.matches));
	}

	return {
		get value() {
			return matches;
		},
	};
}

/** True when viewport width >= 768px — medium screens and above (Tailwind `md`) */
export const isMediumScreen = makeBreakpoint('(min-width: 768px)');

/** True when viewport width >= 1024px — large screens and above (Tailwind `lg`) */
export const isLargeScreen = makeBreakpoint('(min-width: 1024px)');
