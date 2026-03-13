/**
 * @fileoverview Pure color conversion utilities shared across depicter features.
 * All functions are side-effect free and dependency free.
 */

/**
 * Convert a CSS hex color string to an RGBA array with values in the 0–1 range.
 *
 * @param {string} hex - Hex color (e.g. "#ff0000" or "ff0000")
 * @param {number} [alpha=0.6] - Alpha value (0–1)
 * @returns {[number, number, number, number]}
 */
export function hexToRgbaArray(hex, alpha = 0.6) {
	const clean = hex.startsWith('#') ? hex.slice(1) : hex;
	return [
		parseInt(clean.slice(0, 2), 16) / 255,
		parseInt(clean.slice(2, 4), 16) / 255,
		parseInt(clean.slice(4, 6), 16) / 255,
		alpha,
	];
}

/**
 * Convert an RGBA array [r, g, b, a] (values 0–1) to a CSS `rgba()` string.
 *
 * @param {number[]} color - [r, g, b, a] where each component is 0–1
 * @returns {string}
 */
export function rgbaArrayToString(color) {
	return `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${color[3] ?? 1})`;
}

/**
 * Resolve a MONOMER_COLORS value (hex string) to an RGBA array.
 * Falls back to a neutral grey with alpha 0.4 when the value is not a hex string.
 *
 * @param {string} monomerColor - Hex color string (e.g. "#3498db")
 * @param {number} [alpha=0.6] - Alpha for the resolved color
 * @returns {[number, number, number, number]}
 */
export function monomerColorToRgba(monomerColor, alpha = 0.6) {
	if (typeof monomerColor === 'string' && monomerColor.startsWith('#')) {
		return hexToRgbaArray(monomerColor, alpha);
	}
	return [128 / 255, 128 / 255, 128 / 255, 0.4];
}

/**
 * Derive a CSS fill color for a highlight outline.
 * Returns `'none'` when filling is disabled or when the color is not an RGBA array.
 *
 * @param {string | number[]} color - Hex string or RGBA array [r, g, b, a] (0–1)
 * @param {boolean} shouldFill - Whether filling is enabled
 * @param {number} [alphaFactor=0.3] - Multiplier applied to the original alpha component
 * @returns {string} CSS color string or `'none'`
 */
export function highlightFillColor(color, shouldFill, alphaFactor = 0.3) {
	if (!shouldFill || !Array.isArray(color)) return 'none';
	return `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${(color[3] || 0.6) * alphaFactor})`;
}
