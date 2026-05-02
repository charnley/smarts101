<script>
	import { onMount, onDestroy } from 'svelte';
	import {
		EditorView,
		placeholder as cmPlaceholder,
		ViewPlugin,
		Decoration,
		keymap,
	} from '@codemirror/view';
	import { EditorState, StateEffect, StateField, RangeSet } from '@codemirror/state';

	/**
	 * @typedef {{ from: number, to: number } | null} HighlightRange
	 */

	/**
	 * @type {{
	 *   value?: string,
	 *   onchange?: (v: string) => void,
	 *   oncursorchange?: (pos: number) => void,
	 *   highlightRange?: HighlightRange,
	 *   recursiveRange?: HighlightRange,
	 *   errorRanges?: { from: number, to: number }[],
	 *   invalid?: boolean,
	 *   class?: string,
	 * }}
	 */
	let {
		value = $bindable(''),
		onchange,
		oncursorchange,
		highlightRange = null,
		recursiveRange = null,
		errorRanges = [],
		invalid = false,
		class: cls = '',
	} = $props();

	/** @type {HTMLDivElement | undefined} */
	let container;
	/** @type {EditorView | undefined} */
	let view;

	// ── Decoration marks ────────────────────────────────────────────────────
	const dimMark = Decoration.mark({ class: 'cm-smarts-dim' });
	const recursiveMark = Decoration.mark({ class: 'cm-smarts-recursive' });
	const hoverMark = Decoration.mark({ class: 'cm-smarts-hover' });
	const errorMark = Decoration.mark({ class: 'cm-smarts-error' });

	// ── StateEffects ─────────────────────────────────────────────────────────
	/** @type {import('@codemirror/state').StateEffectType<HighlightRange>} */
	const setRecursiveEffect = StateEffect.define();
	/** @type {import('@codemirror/state').StateEffectType<HighlightRange>} */
	const setHoverEffect = StateEffect.define();
	/** @type {import('@codemirror/state').StateEffectType<{ from: number, to: number }[]>} */
	const setErrorsEffect = StateEffect.define();

	// ── StateField holding the two ranges ────────────────────────────────────
	/**
	 * @typedef {{ recursive: HighlightRange, hover: HighlightRange, errors: { from: number, to: number }[] }} RangesState
	 */
	const rangesField = StateField.define({
		/** @returns {RangesState} */
		create: () => ({ recursive: null, hover: null, errors: [] }),
		/**
		 * @param {RangesState} val
		 * @param {import('@codemirror/state').Transaction} tr
		 * @returns {RangesState}
		 */
		update(val, tr) {
			let next = val;
			for (const e of tr.effects) {
				if (e.is(setRecursiveEffect)) next = { ...next, recursive: e.value };
				if (e.is(setHoverEffect)) next = { ...next, hover: e.value };
				if (e.is(setErrorsEffect)) next = { ...next, errors: e.value };
			}
			return next;
		},
	});

	// ── ViewPlugin that builds decorations from rangesField ──────────────────
	const smartsDecoPlugin = ViewPlugin.fromClass(
		class {
			/** @param {EditorView} view */
			constructor(view) {
				this.decorations = this._build(view);
			}
			/** @param {import('@codemirror/view').ViewUpdate} update */
			update(update) {
				if (update.docChanged || update.transactions.some((tr) => tr.effects.length > 0)) {
					this.decorations = this._build(update.view);
				}
			}
			/** @param {EditorView} view */
			_build(view) {
				const { recursive, hover, errors } = view.state.field(rangesField);
				const docLen = view.state.doc.length;
				/** @type {import('@codemirror/state').Range<import('@codemirror/view').Decoration>[]} */
				const ranges = [];

				// Error ranges first (lowest layer)
				for (const err of errors) {
					const eFrom = Math.max(0, Math.min(err.from, docLen));
					const eTo = Math.max(0, Math.min(err.to, docLen));
					if (eFrom < eTo) ranges.push(errorMark.range(eFrom, eTo));
				}

				if (recursive) {
					const rFrom = Math.max(0, Math.min(recursive.from, docLen));
					const rTo = Math.max(0, Math.min(recursive.to, docLen));
					if (rFrom > 0) ranges.push(dimMark.range(0, rFrom));
					if (rFrom < rTo) ranges.push(recursiveMark.range(rFrom, rTo));
					if (rTo < docLen) ranges.push(dimMark.range(rTo, docLen));
				}

				if (hover) {
					const hFrom = Math.max(0, Math.min(hover.from, docLen));
					const hTo = Math.max(0, Math.min(hover.to, docLen));
					if (hFrom < hTo) ranges.push(hoverMark.range(hFrom, hTo));
				}

				if (ranges.length === 0) return Decoration.none;
				ranges.sort((a, b) => a.from - b.from || a.to - b.to);
				return RangeSet.of(ranges);
			}
		},
		{ decorations: (v) => v.decorations },
	);

	// ── Update listener ──────────────────────────────────────────────────────
	const updateListener = EditorView.updateListener.of((update) => {
		if (update.docChanged) {
			const newVal = update.state.doc.toString();
			if (newVal !== value) {
				value = newVal;
				onchange?.(newVal);
			}
		}
		if (update.selectionSet || update.docChanged) {
			const pos = update.state.selection.main.head;
			oncursorchange?.(pos);
		}
	});

	// ── Block Enter key + strip newlines on paste ───────────────────────────
	const noNewlines = keymap.of([
		{
			key: 'Enter',
			run: () => true, // handled → suppress
		},
	]);

	// Strip newlines from any inserted text (handles paste)
	const stripNewlines = EditorState.transactionFilter.of((tr) => {
		if (!tr.docChanged) return tr;
		/** @type {import('@codemirror/state').TransactionSpec[]} */
		const changes = [];
		let hasNewline = false;
		tr.changes.iterChanges((_fromA, _toA, _fromB, _toB, inserted) => {
			if (inserted.toString().includes('\n')) hasNewline = true;
		});
		if (!hasNewline) return tr;
		// Rebuild changes replacing newlines with space
		/** @type {import('@codemirror/state').ChangeSpec[]} */
		const newChanges = [];
		tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
			newChanges.push({ from: fromA, to: toA, insert: inserted.toString().replace(/\n/g, ' ') });
		});
		return [tr, { changes: newChanges, sequential: true }];
	});

	// ── Base theme ───────────────────────────────────────────────────────────
	const baseTheme = EditorView.baseTheme({
		'&': {
			fontSize: '1rem',
			fontFamily: 'var(--font-mono, ui-monospace, monospace)',
			width: '100%',
		},
		'&.cm-focused': {
			outline: 'none',
		},
		'.cm-content': {
			padding: '4px 12px',
			caretColor: 'currentColor',
			minHeight: '2.25rem',
			alignItems: 'flex-start',
			textAlign: 'left',
		},
		'.cm-editor': {
			outline: 'none',
			width: '100%',
		},
		'.cm-scroller': {
			overflow: 'auto',
			maxHeight: '7rem',
			width: '100%',
			justifyContent: 'flex-start',
			alignItems: 'flex-start',
		},
		'.cm-line': {
			padding: '0',
			textAlign: 'left',
			width: '100%',
		},
		'.cm-smarts-dim': {
			opacity: '0.3',
		},
		'.cm-smarts-recursive': {
			background: 'rgba(0,0,0,0.08)',
			borderRadius: '2px',
		},
		'&dark .cm-smarts-recursive': {
			background: 'rgba(251,191,36,0.25)',
			borderRadius: '2px',
		},
		'.cm-smarts-hover': {
			background: 'rgba(37,99,235,0.35)',
			borderRadius: '2px',
		},
		'&dark .cm-smarts-hover': {
			background: 'rgba(96,165,250,0.5)',
			borderRadius: '2px',
		},
		'&dark .cm-smarts-hover': {
			background: 'rgba(96,165,250,0.5)',
			borderRadius: '2px',
		},
		'.cm-smarts-error': {
			background: 'rgba(239,68,68,0.25)',
			borderRadius: '2px',
		},
	});

	// ── Mount ────────────────────────────────────────────────────────────────
	onMount(() => {
		if (!container) return;

		const state = EditorState.create({
			doc: value,
			extensions: [
				rangesField,
				smartsDecoPlugin,
				updateListener,
				baseTheme,
				noNewlines,
				stripNewlines,
				cmPlaceholder('Enter a SMARTS pattern, e.g. [OX2H] for hydroxyl…'),
				EditorView.lineWrapping,
			],
		});

		view = new EditorView({ state, parent: container });
	});

	onDestroy(() => view?.destroy());

	// ── Reactive: value prop → editor doc ────────────────────────────────────
	$effect(() => {
		if (!view) return;
		const current = view.state.doc.toString();
		if (current !== value) {
			view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
		}
	});

	// ── Reactive: recursiveRange → effect ────────────────────────────────────
	$effect(() => {
		view?.dispatch({ effects: setRecursiveEffect.of(recursiveRange ?? null) });
	});

	// ── Reactive: highlightRange → effect ────────────────────────────────────
	$effect(() => {
		view?.dispatch({ effects: setHoverEffect.of(highlightRange ?? null) });
	});

	// ── Reactive: errorRanges → effect ───────────────────────────────────────
	$effect(() => {
		view?.dispatch({ effects: setErrorsEffect.of(errorRanges ?? []) });
	});
</script>

<div
	bind:this={container}
	role="textbox"
	tabindex="-1"
	onclick={() => view?.focus()}
	onkeydown={() => view?.focus()}
	class="w-full rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 [&_.cm-editor]:w-full [&_.cm-scroller]:w-full {invalid
		? 'border-destructive focus-within:ring-destructive/50'
		: ''} {cls}"
></div>
