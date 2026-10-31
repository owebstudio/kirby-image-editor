import Cropper from "cropperjs";

const TEMPLATE =
	"<cropper-canvas background>" +
	"<cropper-image scalable translatable></cropper-image>" +
	'<cropper-shade theme-color="rgba(0, 0, 0, 0.5)"></cropper-shade>' +
	'<cropper-handle action="move" plain></cropper-handle>' +
	'<cropper-selection initial-coverage="1" movable resizable precise>' +
	'<cropper-grid role="grid" bordered covered></cropper-grid>' +
	"<cropper-crosshair centered></cropper-crosshair>" +
	'<cropper-handle action="move" theme-color="transparent"></cropper-handle>' +
	'<cropper-handle action="n-resize"></cropper-handle>' +
	'<cropper-handle action="e-resize"></cropper-handle>' +
	'<cropper-handle action="s-resize"></cropper-handle>' +
	'<cropper-handle action="w-resize"></cropper-handle>' +
	'<cropper-handle action="ne-resize"></cropper-handle>' +
	'<cropper-handle action="nw-resize"></cropper-handle>' +
	'<cropper-handle action="se-resize"></cropper-handle>' +
	'<cropper-handle action="sw-resize"></cropper-handle>' +
	"</cropper-selection>" +
	"</cropper-canvas>";

// space between the selection and the edges of the canvas
const PADDING = 24;

// tolerance for rounding errors in image pixels
const EPSILON = 0.5;

/**
 * Wraps Cropper.js: the image is transformed with a matrix and
 * the selection is what gets saved. The selection must always
 * be covered by the image, so the saved image has no empty areas.
 */
export default class Editor {
	constructor(container, src, onChange = () => {}) {
		this.angle = 0;
		this.base = null;
		this.history = [];
		this.index = -1;
		this.internal = false;
		this.onChange = onChange;

		this.element = document.createElement("img");
		this.element.src = src;
		this.element.alt = "";
		container.append(this.element);

		this.cropper = new Cropper(this.element, { template: TEMPLATE });
		this.canvas = this.cropper.getCropperCanvas();
		this.image = this.cropper.getCropperImage();
		this.selection = this.cropper.getCropperSelection();

		this.onImageTransform = this.onImageTransform.bind(this);
		this.onSelectionChange = this.onSelectionChange.bind(this);

		this.image.addEventListener("transform", this.onImageTransform);
		this.selection.addEventListener("change", this.onSelectionChange);
	}

	/**
	 * Applies a screen transform `s => T * s + v` to the image matrix
	 */
	apply(matrix, T, v) {
		const [a, b, c, d, e, f] = matrix;
		const { x: cx, y: cy } = this.center();

		return [
			T[0] * a + T[1] * b,
			T[2] * a + T[3] * b,
			T[0] * c + T[1] * d,
			T[2] * c + T[3] * d,
			T[0] * (cx + e) + T[1] * (cy + f) + v.x - cx,
			T[2] * (cx + e) + T[3] * (cy + f) + v.y - cy
		];
	}

	/**
	 * Screen transform that rotates around or scales from a point
	 */
	around(T, point) {
		return [
			T,
			{
				x: point.x - T[0] * point.x - T[1] * point.y,
				y: point.y - T[2] * point.x - T[3] * point.y
			}
		];
	}

	/**
	 * The bounding box of the transformed image on the canvas
	 */
	bounds(matrix = this.matrix()) {
		const { width, height } = this.natural();
		const corners = [
			[0, 0],
			[width, 0],
			[0, height],
			[width, height]
		].map(([x, y]) => this.toCanvas(matrix, x, y));

		const xs = corners.map((point) => point.x);
		const ys = corners.map((point) => point.y);

		return {
			x: Math.min(...xs),
			y: Math.min(...ys),
			width: Math.max(...xs) - Math.min(...xs),
			height: Math.max(...ys) - Math.min(...ys)
		};
	}

	/**
	 * The center of the untransformed image
	 * (the transform origin of the image element)
	 */
	center() {
		const { width, height } = this.natural();
		return { x: width / 2, y: height / 2 };
	}

	/**
	 * Checks if the image covers the whole rectangle
	 */
	covers(matrix, rect) {
		const { width, height } = this.natural();

		return this.corners(rect).every((point) => {
			const local = this.toImage(matrix, point.x, point.y);

			return (
				local.x >= -EPSILON &&
				local.y >= -EPSILON &&
				local.x <= width + EPSILON &&
				local.y <= height + EPSILON
			);
		});
	}

	corners(rect) {
		return [
			{ x: rect.x, y: rect.y },
			{ x: rect.x + rect.width, y: rect.y },
			{ x: rect.x, y: rect.y + rect.height },
			{ x: rect.x + rect.width, y: rect.y + rect.height }
		];
	}

	/**
	 * Returns the smallest scale around the point that
	 * still makes the image cover the rectangle
	 */
	coverScale(matrix, rect, point) {
		const { width, height } = this.natural();
		const q = this.toImage(matrix, point.x, point.y);
		let scale = 0;

		if (q.x <= 0 || q.y <= 0 || q.x >= width || q.y >= height) {
			return Infinity;
		}

		for (const corner of this.corners(rect)) {
			const local = this.toImage(matrix, corner.x, corner.y);
			const u = { x: local.x - q.x, y: local.y - q.y };

			scale = Math.max(
				scale,
				u.x > 0 ? u.x / (width - q.x) : -u.x / q.x,
				u.y > 0 ? u.y / (height - q.y) : -u.y / q.y
			);
		}

		return scale;
	}

	/**
	 * The size of the selection in image pixels
	 */
	cropSize() {
		const zoom = this.zoomLevel();
		const rect = this.rect();

		return {
			width: Math.max(1, Math.round(rect.width / zoom)),
			height: Math.max(1, Math.round(rect.height / zoom))
		};
	}

	destroy() {
		this.image.removeEventListener("transform", this.onImageTransform);
		this.selection.removeEventListener("change", this.onSelectionChange);
		this.cropper.destroy();
		this.element.remove();
	}

	/**
	 * Fits the selection into the canvas
	 */
	fit() {
		this.set(...this.fitted(this.matrix(), this.rect()));
	}

	/**
	 * Returns matrix and selection scaled and moved
	 * so that the selection fits into the canvas
	 */
	fitted(matrix, rect) {
		const moved = this.moved({ matrix, rect }, this.fitting(rect));
		return [moved.matrix, moved.rect];
	}

	/**
	 * The screen transform that fits the rectangle into the canvas
	 */
	fitting(rect) {
		const canvas = this.viewport();

		if (canvas.width === 0 || canvas.height === 0 || rect.width === 0) {
			return [[1, 0, 0, 1], { x: 0, y: 0 }];
		}

		const scale = Math.min(
			(canvas.width - PADDING * 2) / rect.width,
			(canvas.height - PADDING * 2) / rect.height
		);

		return [
			[scale, 0, 0, scale],
			{
				x: canvas.width / 2 - scale * (rect.x + rect.width / 2),
				y: canvas.height / 2 - scale * (rect.y + rect.height / 2)
			}
		];
	}

	/**
	 * Applies a screen transform without rotation
	 * to the matrix and selection of a state
	 */
	moved(state, [T, v]) {
		return {
			...state,
			matrix: this.apply(state.matrix, T, v),
			rect: {
				x: state.rect.x * T[0] + v.x,
				y: state.rect.y * T[3] + v.y,
				width: state.rect.width * T[0],
				height: state.rect.height * T[3]
			}
		};
	}

	/**
	 * Keeps the selection in view when the canvas changes its size
	 */
	refit() {
		const transform = this.fitting(this.rect());

		this.history = this.history.map((state) => this.moved(state, transform));
		this.restore(this.moved(this.state(), transform));
	}

	/**
	 * Stores the current state for undo and redo,
	 * together with the editor settings of the component
	 */
	commit(extra = {}) {
		const state = { ...this.state(), extra: JSON.parse(JSON.stringify(extra)) };
		const current = this.history[this.index];

		// ignore rounding differences from restoring a state
		const key = (value) =>
			JSON.stringify(value, (name, number) =>
				typeof number === "number" ? Math.round(number * 1000) / 1000 : number
			);

		if (current && key(current) === key(state)) {
			return false;
		}

		this.history = [...this.history.slice(0, this.index + 1), state];
		this.index = this.history.length - 1;

		return true;
	}

	canRedo() {
		return this.index < this.history.length - 1;
	}

	canUndo() {
		return this.index > 0;
	}

	redo() {
		if (this.canRedo()) {
			this.restore(this.history[++this.index]);
			return this.history[this.index].extra;
		}
	}

	undo() {
		if (this.canUndo()) {
			this.restore(this.history[--this.index]);
			return this.history[this.index].extra;
		}
	}

	/**
	 * Mirrors the image on the screen
	 */
	flip(axis) {
		const T = axis === "x" ? [-1, 0, 0, 1] : [1, 0, 0, -1];
		const rect = this.rect();

		this.base = null;
		this.set(this.apply(this.matrix(), ...this.around(T, this.middle(rect))), rect);
	}

	/**
	 * Fills the selection with the image again
	 */
	async init() {
		await this.image.$ready();

		// the image element gets its size after loading
		await new Promise((resolve) => requestAnimationFrame(resolve));

		this.image.$resetTransform();
		this.image.$center("contain");

		const matrix = this.matrix();

		this.set(...this.fitted(matrix, this.bounds(matrix)));
	}

	matrix() {
		return this.image.$getTransform();
	}

	middle(rect) {
		return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
	}

	natural() {
		const image = this.image.$image;
		return { width: image.naturalWidth, height: image.naturalHeight };
	}

	onImageTransform(event) {
		if (this.internal === true) {
			return;
		}

		// zooming and moving the image must
		// not leave empty areas in the selection
		if (this.covers(event.detail.matrix, this.rect()) === false) {
			event.preventDefault();
			return;
		}

		this.base = null;
		this.changed();
	}

	onSelectionChange(event) {
		if (this.internal === true) {
			return;
		}

		const rect = event.detail;

		if (this.inside(rect) === false) {
			event.preventDefault();

			// move the selection to the edge of the image
			// instead of stopping a few pixels before it
			if (this.clamping !== true) {
				const clamped = this.clamp(rect);

				if (clamped && this.inside(clamped)) {
					this.clamping = true;
					this.selection.$change(clamped.x, clamped.y, clamped.width, clamped.height);
					this.clamping = false;
				}
			}

			return;
		}

		this.base = null;
		this.changed();
	}

	/**
	 * Limits the rectangle to the image and the canvas
	 */
	clamp(rect) {
		const bounds = this.limits();
		const current = this.rect();

		// moved: keep the size
		if (
			Math.abs(rect.width - current.width) < 0.01 &&
			Math.abs(rect.height - current.height) < 0.01
		) {
			return {
				...rect,
				x: Math.min(Math.max(rect.x, bounds.x), bounds.x + bounds.width - rect.width),
				y: Math.min(Math.max(rect.y, bounds.y), bounds.y + bounds.height - rect.height)
			};
		}

		// resized with a fixed ratio: cannot be clamped without changing the ratio
		if (this.ratio() !== null) {
			return null;
		}

		const x = Math.max(rect.x, bounds.x);
		const y = Math.max(rect.y, bounds.y);
		const width = Math.min(rect.x + rect.width, bounds.x + bounds.width) - x;
		const height = Math.min(rect.y + rect.height, bounds.y + bounds.height) - y;

		return width > 1 && height > 1 ? { x, y, width, height } : null;
	}

	/**
	 * Checks if the rectangle is on the canvas and covered by the image
	 */
	inside(rect, matrix = this.matrix()) {
		const canvas = this.viewport();

		return (
			rect.x >= -0.01 &&
			rect.y >= -0.01 &&
			rect.x + rect.width <= canvas.width + 0.01 &&
			rect.y + rect.height <= canvas.height + 0.01 &&
			this.covers(matrix, rect)
		);
	}

	/**
	 * The area the selection can use:
	 * the image bounds on the canvas
	 */
	limits() {
		const bounds = this.bounds();
		const canvas = this.viewport();
		const x = Math.max(0, bounds.x);
		const y = Math.max(0, bounds.y);

		return {
			x,
			y,
			width: Math.min(canvas.width, bounds.x + bounds.width) - x,
			height: Math.min(canvas.height, bounds.y + bounds.height) - y
		};
	}

	viewport() {
		return {
			width: this.canvas.clientWidth,
			height: this.canvas.clientHeight
		};
	}

	changed() {
		this.onChange(this);
	}

	ratio() {
		const ratio = this.selection.aspectRatio;
		return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
	}

	rect() {
		const { x, y, width, height } = this.selection;
		return { x, y, width, height };
	}

	/**
	 * Renders the selection to a canvas of the given size
	 */
	render(width, height, background = null) {
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		const [a, b, c, d, e, f] = this.matrix();
		const rect = this.rect();
		const { width: naturalWidth, height: naturalHeight } = this.natural();
		const { x: cx, y: cy } = this.center();

		canvas.width = width;
		canvas.height = height;

		if (background) {
			context.fillStyle = background;
			context.fillRect(0, 0, width, height);
		}

		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = "high";
		context.scale(width / rect.width, height / rect.height);
		context.translate(-rect.x, -rect.y);
		context.translate(cx + e, cy + f);
		context.transform(a, b, c, d, 0, 0);
		context.translate(-cx, -cy);
		context.drawImage(this.image.$image, 0, 0, naturalWidth, naturalHeight);

		return canvas;
	}

	/**
	 * Rotates image and selection by 90 degrees
	 */
	rotate(degrees) {
		const radian = (degrees * Math.PI) / 180;
		const cos = Math.round(Math.cos(radian));
		const sin = Math.round(Math.sin(radian));
		const T = [cos, -sin, sin, cos];
		const rect = this.rect();
		const middle = this.middle(rect);
		const ratio = this.ratio();

		this.base = null;
		this.internal = true;
		this.selection.aspectRatio = ratio ? 1 / ratio : NaN;
		this.internal = false;

		this.set(
			...this.fitted(this.apply(this.matrix(), ...this.around(T, middle)), {
				x: middle.x - rect.height / 2,
				y: middle.y - rect.width / 2,
				width: rect.height,
				height: rect.width
			})
		);
	}

	/**
	 * Sets image matrix and selection without the cover checks
	 */
	set(matrix, rect) {
		this.internal = true;
		this.image.$setTransform(matrix);

		if (rect) {
			this.selection.$change(rect.x, rect.y, rect.width, rect.height, this.selection.aspectRatio, true);
		}

		this.internal = false;
		this.changed();
	}

	/**
	 * Sets the crop ratio and the largest selection with
	 * this ratio in the middle of the image
	 */
	setRatio(ratio) {
		this.base = null;
		this.internal = true;
		this.selection.aspectRatio = ratio ?? NaN;
		this.internal = false;

		if (!ratio) {
			return this.changed();
		}

		const matrix = this.matrix();
		const bounds = this.bounds(matrix);
		const [cx, cy] = [bounds.x + bounds.width / 2, bounds.y + bounds.height / 2];
		let width = Math.min(bounds.width, bounds.height * ratio);
		let height = width / ratio;

		// shrink until the image covers it (only needed when straightened)
		const rect = (scale) => ({
			x: cx - (width * scale) / 2,
			y: cy - (height * scale) / 2,
			width: width * scale,
			height: height * scale
		});

		let low = 0;
		let high = 1;

		if (this.covers(matrix, rect(1)) === false) {
			for (let i = 0; i < 24; i++) {
				const mid = (low + high) / 2;
				this.covers(matrix, rect(mid)) ? (low = mid) : (high = mid);
			}

			high = low;
		}

		this.set(...this.fitted(matrix, rect(high)));
	}

	/**
	 * Returns everything needed to restore the current state
	 */
	state() {
		return {
			angle: this.angle,
			matrix: this.matrix(),
			ratio: this.selection.aspectRatio,
			rect: this.rect()
		};
	}

	restore(state) {
		this.base = null;
		this.angle = state.angle;
		this.internal = true;
		this.selection.aspectRatio = state.ratio;
		this.internal = false;
		this.set(state.matrix, state.rect);
	}

	/**
	 * Rotates the image by a small angle around the middle of the
	 * selection and zooms in as much as needed to cover the selection
	 */
	straighten(angle) {
		// the slider moves relative to the state before the first move,
		// so moving it back also undoes the zoom
		this.base ??= { angle: this.angle, matrix: this.matrix() };

		const rect = this.rect();
		const middle = this.middle(rect);
		const radian = ((angle - this.base.angle) * Math.PI) / 180;
		const cos = Math.cos(radian);
		const sin = Math.sin(radian);
		const base = this.base;

		let matrix = this.apply(base.matrix, ...this.around([cos, -sin, sin, cos], middle));
		const scale = this.coverScale(matrix, rect, middle);

		if (scale > 1 && scale !== Infinity) {
			matrix = this.apply(matrix, ...this.around([scale, 0, 0, scale], middle));
		}

		this.angle = angle;
		this.set(matrix);
		this.base = base;
	}

	/**
	 * Converts image pixels to canvas pixels
	 */
	toCanvas(matrix, x, y) {
		const [a, b, c, d, e, f] = matrix;
		const { x: cx, y: cy } = this.center();
		const [px, py] = [x - cx, y - cy];

		return {
			x: cx + a * px + c * py + e,
			y: cy + b * px + d * py + f
		};
	}

	/**
	 * Converts canvas pixels to image pixels
	 */
	toImage(matrix, x, y) {
		const [a, b, c, d, e, f] = matrix;
		const { x: cx, y: cy } = this.center();
		const det = a * d - b * c;
		const [px, py] = [x - cx - e, y - cy - f];

		return {
			x: cx + (d * px - c * py) / det,
			y: cy + (-b * px + a * py) / det
		};
	}

	/**
	 * Zooms the image around the middle of the selection,
	 * but never out of the selection
	 */
	zoom(factor) {
		const rect = this.rect();
		const middle = this.middle(rect);
		const matrix = this.matrix();

		factor = Math.max(factor, this.coverScale(matrix, rect, middle));

		this.base = null;
		this.set(this.apply(matrix, ...this.around([factor, 0, 0, factor], middle)));
	}

	zoomLevel() {
		const [a, b] = this.matrix();
		return Math.hypot(a, b);
	}
}
