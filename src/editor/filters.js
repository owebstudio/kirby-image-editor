/**
 * Image filters as pixel operations. Canvas `ctx.filter` is not
 * supported by every browser, so the edited image is filtered pixel
 * by pixel. The math follows the CSS filter functions, which are
 * used for the live preview, so the saved image matches the preview.
 * https://drafts.fxtf.org/filter-effects/#ShorthandEquivalents
 */

export const defaults = () => ({
	brightness: 0,
	contrast: 0,
	saturation: 0,
	grayscale: false,
	sepia: false,
	invert: false
});

const grayscale = [
	[0.2126, 0.7152, 0.0722],
	[0.2126, 0.7152, 0.0722],
	[0.2126, 0.7152, 0.0722]
];

const sepia = [
	[0.393, 0.769, 0.189],
	[0.349, 0.686, 0.168],
	[0.272, 0.534, 0.131]
];

const saturate = (s) => [
	[0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
	[0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
	[0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]
];

const clamp = (value) => Math.min(1, Math.max(0, value));

/**
 * Returns the filter steps in the order of the CSS filter list
 */
export function steps(filters) {
	const list = [];

	if (filters.brightness) {
		const amount = 1 + filters.brightness / 100;
		list.push({ css: `brightness(${amount})`, linear: [amount, 0] });
	}

	if (filters.contrast) {
		const amount = 1 + filters.contrast / 100;
		list.push({ css: `contrast(${amount})`, linear: [amount, 0.5 - 0.5 * amount] });
	}

	if (filters.saturation) {
		const amount = 1 + filters.saturation / 100;
		list.push({ css: `saturate(${amount})`, matrix: saturate(amount) });
	}

	if (filters.grayscale) {
		list.push({ css: "grayscale(1)", matrix: grayscale });
	}

	if (filters.sepia) {
		list.push({ css: "sepia(1)", matrix: sepia });
	}

	if (filters.invert) {
		list.push({ css: "invert(1)", linear: [-1, 1] });
	}

	return list;
}

/**
 * CSS filter for the preview
 */
export function css(filters) {
	return steps(filters)
		.map((step) => step.css)
		.join(" ");
}

/**
 * Applies the filters to the canvas
 */
export function apply(canvas, filters) {
	const list = steps(filters);

	if (list.length === 0) {
		return canvas;
	}

	const context = canvas.getContext("2d");
	const image = context.getImageData(0, 0, canvas.width, canvas.height);
	const data = image.data;

	for (let i = 0; i < data.length; i += 4) {
		let r = data[i] / 255;
		let g = data[i + 1] / 255;
		let b = data[i + 2] / 255;

		// every step clamps its result like the CSS filter primitives
		for (const step of list) {
			if (step.linear) {
				const [slope, intercept] = step.linear;
				r = clamp(r * slope + intercept);
				g = clamp(g * slope + intercept);
				b = clamp(b * slope + intercept);
			} else {
				const [x, y, z] = step.matrix;
				const nr = x[0] * r + x[1] * g + x[2] * b;
				const ng = y[0] * r + y[1] * g + y[2] * b;
				const nb = z[0] * r + z[1] * g + z[2] * b;
				r = clamp(nr);
				g = clamp(ng);
				b = clamp(nb);
			}
		}

		data[i] = r * 255;
		data[i + 1] = g * 255;
		data[i + 2] = b * 255;
	}

	context.putImageData(image, 0, 0);

	return canvas;
}
