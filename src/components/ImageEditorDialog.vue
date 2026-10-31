<template>
	<k-dialog
		:cancel-button="false"
		:submit-button="false"
		:visible="visible"
		class="k-image-editor-dialog"
		size="huge"
		@cancel="$emit('cancel')"
		@submit="onSubmit"
	>
		<div class="k-image-editor">
			<div class="k-image-editor-stage">
				<div ref="canvas" class="k-image-editor-canvas" :style="{ '--filter': preview }" />

				<k-box v-if="error" icon="alert" theme="negative" class="k-image-editor-error">
					{{ error }}
				</k-box>
				<k-icon v-else-if="loading" type="loader" class="k-image-editor-loader" />

				<div v-if="!loading && !error" class="k-image-editor-zoom">
					<k-button-group layout="collapsed">
						<k-button
							:title="shortcut('zoom.out', '-')"
							icon="image-editor-zoom-out"
							size="sm"
							variant="filled"
							@click="zoom(0.8)"
						/>
						<k-button
							:title="shortcut('zoom.fit', '0')"
							icon="image-editor-fit"
							size="sm"
							variant="filled"
							@click="fit"
						/>
						<k-button
							:title="shortcut('zoom.in', '+')"
							icon="image-editor-zoom-in"
							size="sm"
							variant="filled"
							@click="zoom(1.25)"
						/>
					</k-button-group>
					<span class="k-image-editor-size">{{ output.width }} × {{ output.height }} px</span>
				</div>
			</div>

			<aside class="k-image-editor-tools">
				<k-box v-if="license.locked" :theme="license.theme" class="k-image-editor-license">
					<k-text>{{ license.message }}</k-text>
					<k-button v-if="license.dialog" :dialog="license.dialog" icon="key" size="sm">
						{{ license.button }}
					</k-button>
				</k-box>

				<section v-if="has('crop') && editor.ratio === null" class="k-image-editor-section">
					<h3 class="k-label">{{ $t("owebstudio.image-editor.crop") }}</h3>
					<div class="k-image-editor-options">
						<k-button
							v-for="(preset, index) in editor.ratios"
							:key="index"
							:current="preset.value === ratio"
							:disabled="isDisabled"
							:text="preset.text"
							size="sm"
							variant="filled"
							@click="setRatio(preset.value)"
						/>
						<k-button
							v-if="ratio !== null && ratio !== 1"
							:disabled="isDisabled"
							:title="$t('owebstudio.image-editor.ratio.swap')"
							icon="image-editor-swap"
							size="sm"
							variant="filled"
							@click="swap"
						/>
					</div>
				</section>

				<section v-if="has('rotate')" class="k-image-editor-section">
					<h3 class="k-label">{{ $t("owebstudio.image-editor.rotate") }}</h3>
					<div class="k-image-editor-options">
						<k-button
							:disabled="isDisabled"
							:text="$t('owebstudio.image-editor.rotate.left')"
							:title="shortcut('rotate.left', 'shift+R')"
							icon="image-editor-rotate-left"
							size="sm"
							variant="filled"
							@click="rotate(-90)"
						/>
						<k-button
							:disabled="isDisabled"
							:text="$t('owebstudio.image-editor.rotate.right')"
							:title="shortcut('rotate.right', 'R')"
							icon="image-editor-rotate-right"
							size="sm"
							variant="filled"
							@click="rotate(90)"
						/>
					</div>
					<label class="k-image-editor-slider">
						<span>{{ $t("owebstudio.image-editor.rotate.angle") }}</span>
						<k-range-input
							:disabled="isDisabled"
							:max="45"
							:min="-45"
							:step="0.5"
							:tooltip="{ after: '°' }"
							:value="angle"
							@input="straighten"
						/>
					</label>
				</section>

				<section v-if="has('flip')" class="k-image-editor-section">
					<h3 class="k-label">{{ $t("owebstudio.image-editor.flip") }}</h3>
					<div class="k-image-editor-options">
						<k-button
							:disabled="isDisabled"
							:text="$t('owebstudio.image-editor.flip.horizontal')"
							:title="shortcut('flip.horizontal', 'H')"
							icon="image-editor-flip-horizontal"
							size="sm"
							variant="filled"
							@click="flip('x')"
						/>
						<k-button
							:disabled="isDisabled"
							:text="$t('owebstudio.image-editor.flip.vertical')"
							:title="shortcut('flip.vertical', 'V')"
							icon="image-editor-flip-vertical"
							size="sm"
							variant="filled"
							@click="flip('y')"
						/>
					</div>
				</section>

				<section v-if="has('resize')" class="k-image-editor-section">
					<h3 class="k-label">{{ $t("owebstudio.image-editor.resize") }}</h3>
					<div class="k-image-editor-resize">
						<label>
							<span>{{ $t("owebstudio.image-editor.width") }}</span>
							<k-number-input
								:disabled="isDisabled"
								:max="20000"
								:min="1"
								:step="1"
								:value="size.width ?? crop.width"
								@input="setSize('width', $event)"
							/>
						</label>
						<k-button
							:current="size.lock"
							:disabled="isDisabled"
							:icon="size.lock ? 'lock' : 'unlock'"
							:title="$t('owebstudio.image-editor.resize.lock')"
							size="sm"
							variant="filled"
							@click="toggleLock"
						/>
						<label>
							<span>{{ $t("owebstudio.image-editor.height") }}</span>
							<k-number-input
								:disabled="isDisabled"
								:max="20000"
								:min="1"
								:step="1"
								:value="size.height ?? crop.height"
								@input="setSize('height', $event)"
							/>
						</label>
					</div>
					<p v-if="output.limited" class="k-image-editor-help">
						{{ $t("owebstudio.image-editor.resize.max", output) }}
					</p>
				</section>

				<section v-if="has('filter')" class="k-image-editor-section">
					<h3 class="k-label">{{ $t("owebstudio.image-editor.filter") }}</h3>
					<label v-for="name in sliders" :key="name" class="k-image-editor-slider">
						<span>{{ $t("owebstudio.image-editor.filter." + name) }}</span>
						<k-range-input
							:disabled="isDisabled"
							:max="100"
							:min="-100"
							:value="filters[name]"
							@input="setFilter(name, $event)"
						/>
					</label>
					<div class="k-image-editor-options">
						<k-button
							v-for="name in toggles"
							:key="name"
							:current="filters[name]"
							:disabled="isDisabled"
							:text="$t('owebstudio.image-editor.filter.' + name)"
							size="sm"
							variant="filled"
							@click="setFilter(name, !filters[name])"
						/>
					</div>
				</section>
			</aside>
		</div>

		<template #footer>
			<footer class="k-image-editor-footer">
				<template v-if="mode === 'confirm'">
					<k-text class="k-image-editor-question">
						{{ $t("owebstudio.image-editor.save.confirm") }}
					</k-text>
					<k-button-group>
						<k-button
							:disabled="isSaving"
							:text="$t('cancel')"
							icon="cancel"
							variant="filled"
							@click="mode = null"
						/>
						<k-button
							:icon="isSaving ? 'loader' : 'check'"
							:disabled="isSaving"
							:text="$t('owebstudio.image-editor.save.overwrite')"
							theme="negative"
							variant="filled"
							@click="save"
						/>
					</k-button-group>
				</template>

				<template v-else-if="mode === 'saveas'">
					<label class="k-image-editor-filename">
						<span class="sr-only">{{ $t("name") }}</span>
						<k-text-input
							ref="name"
							:autofocus="true"
							:disabled="isSaving"
							:value="name"
							spellcheck="false"
							@input="name = $event"
						/>
						<span>.{{ format.extension }}</span>
					</label>
					<k-button-group>
						<k-button
							:disabled="isSaving"
							:text="$t('cancel')"
							icon="cancel"
							variant="filled"
							@click="mode = null"
						/>
						<k-button
							:icon="isSaving ? 'loader' : 'check'"
							:disabled="isSaving || !name"
							:text="$t('save')"
							theme="positive"
							variant="filled"
							@click="saveAs"
						/>
					</k-button-group>
				</template>

				<template v-else>
					<k-button-group layout="collapsed">
						<k-button
							:disabled="isDisabled || !canUndo"
							:title="shortcut('undo', 'meta+Z')"
							icon="undo"
							variant="filled"
							@click="undo"
						/>
						<k-button
							:disabled="isDisabled || !canRedo"
							:title="shortcut('redo', 'meta+shift+Z')"
							class="k-image-editor-redo"
							icon="undo"
							variant="filled"
							@click="redo"
						/>
						<k-button
							:disabled="isDisabled || !canUndo"
							:title="$t('owebstudio.image-editor.reset')"
							icon="refresh"
							variant="filled"
							@click="reset"
						/>
					</k-button-group>
					<k-button-group>
						<k-button
							:text="$t('cancel')"
							icon="cancel"
							variant="filled"
							@click="$emit('cancel')"
						/>
						<k-button
							v-if="file.create"
							:disabled="isDisabled || license.locked"
							:text="$t('owebstudio.image-editor.save.as')"
							icon="copy"
							variant="filled"
							@click="openSaveAs"
						/>
						<k-button
							v-if="canSave"
							:disabled="isDisabled || license.locked"
							:text="$t('save')"
							icon="check"
							theme="positive"
							variant="filled"
							@click="mode = 'confirm'"
						/>
					</k-button-group>
				</template>
			</footer>
		</template>
	</k-dialog>
</template>

<script>
import Editor from "../editor/Editor.js";
import upload from "../editor/upload.js";
import { apply, css, defaults } from "../editor/filters.js";

const encodable = {};

/**
 * Checks if the browser can save images of this type
 */
function canEncode(type) {
	if (encodable[type] === undefined) {
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = 1;
		encodable[type] = canvas.toDataURL(type).startsWith("data:" + type);
	}

	return encodable[type];
}

export default {
	props: {
		editor: {
			type: Object,
			default: () => ({})
		},
		file: {
			type: Object,
			required: true
		},
		license: {
			type: Object,
			default: () => ({})
		},
		visible: Boolean
	},
	emits: ["cancel", "submit"],
	data() {
		return {
			angle: 0,
			canRedo: false,
			canUndo: false,
			crop: { width: this.file.width ?? 0, height: this.file.height ?? 0 },
			error: null,
			filters: defaults(),
			isSaving: false,
			loading: true,
			mode: null,
			name: this.file.name + "-edited",
			ratio: null,
			size: { width: null, height: null, lock: true },
			turned: false
		};
	},
	computed: {
		canSave() {
			return (
				this.file.replace === true &&
				["image/jpeg", "image/png", "image/webp"].includes(this.file.mime) &&
				canEncode(this.file.mime)
			);
		},
		/**
		 * Type of the saved image: the original type if the
		 * browser can save it, otherwise WebP or PNG
		 */
		format() {
			let type = this.file.mime;

			if (["image/jpeg", "image/png", "image/webp"].includes(type) === false || canEncode(type) === false) {
				type = canEncode("image/webp") ? "image/webp" : "image/png";
			}

			const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
			const extension = type === this.file.mime ? this.file.extension : extensions[type];

			return { extension, type };
		},
		isDisabled() {
			return this.loading || this.error !== null || this.isSaving;
		},
		/**
		 * Size of the saved image
		 */
		output() {
			let width = this.size.width || this.crop.width;
			let height = this.size.height || this.crop.height;

			const scale = Math.min(
				1,
				(this.editor.maxWidth ?? Infinity) / width,
				(this.editor.maxHeight ?? Infinity) / height
			);

			return {
				width: Math.max(1, Math.round(width * scale)),
				height: Math.max(1, Math.round(height * scale)),
				limited: scale < 1
			};
		},
		preview() {
			return css(this.filters) || "none";
		},
		sliders() {
			return ["brightness", "contrast", "saturation"];
		},
		toggles() {
			return ["grayscale", "sepia", "invert"];
		}
	},
	watch: {
		filters: {
			handler() {
				this.schedule();
			},
			deep: true
		}
	},
	async mounted() {
		try {
			const response = await fetch(
				this.$panel.urls.api + "/image-editor/" + this.file.api + "/source",
				{ headers: { "x-csrf": this.$panel.system.csrf } }
			);

			if (response.ok === false) {
				throw new Error();
			}

			this.source = URL.createObjectURL(await response.blob());
			this.cropper = new Editor(this.$refs.canvas, this.source, this.onChange);

			await this.cropper.init();

			if (this.editor.ratio !== null) {
				this.setRatio(this.editor.ratio);
			}

			this.loading = false;
			this.commit();

			this.observer = new ResizeObserver(() => this.cropper.refit());
			this.observer.observe(this.$refs.canvas);

			// capture to handle the shortcuts before the Panel does
			window.addEventListener("keydown", this.onKeydown, true);
		} catch {
			this.loading = false;
			this.error = this.$t("owebstudio.image-editor.error.load");
		}
	},
	beforeUnmount() {
		window.removeEventListener("keydown", this.onKeydown, true);
		clearTimeout(this.timeout);
		this.observer?.disconnect();
		this.cropper?.destroy();

		if (this.source) {
			URL.revokeObjectURL(this.source);
		}
	},
	methods: {
		/**
		 * Renders the edited image as it will be saved
		 */
		async blob() {
			const { width, height } = this.output;
			const type = this.format.type;
			const canvas = this.cropper.render(width, height, type === "image/jpeg" ? "#fff" : null);

			apply(canvas, this.filters);

			return new Promise((resolve, reject) => {
				canvas.toBlob(
					(blob) => (blob ? resolve(blob) : reject(new Error("The image could not be created"))),
					type,
					this.editor.quality ?? 0.9
				);
			});
		},
		commit() {
			clearTimeout(this.timeout);

			if (this.cropper && !this.loading && !this.error) {
				this.cropper.commit(this.settings());
				this.updateHistory();
			}
		},
		extra(settings) {
			if (!settings) {
				return;
			}

			this.restoring = true;
			this.filters = settings.filters;
			this.ratio = settings.ratio;
			this.size = settings.size;
			this.turned = settings.turned;
			this.angle = this.cropper.angle;
			this.updateCrop();
			this.updateHistory();
			this.$nextTick(() => (this.restoring = false));
		},
		fit() {
			this.cropper.fit();
		},
		flip(axis) {
			this.cropper.flip(axis);
		},
		has(tool) {
			return (this.editor.menu ?? []).includes(tool);
		},
		onChange() {
			this.updateCrop();
			this.schedule();
		},
		onKeydown(event) {
			if (this.isDisabled) {
				return;
			}

			// confirm or leave the save step without closing the editor
			if (this.mode !== null) {
				if (event.key === "Escape") {
					this.mode = null;
				} else if (event.key === "Enter") {
					this.onSubmit();
				} else {
					return;
				}

				event.preventDefault();
				event.stopPropagation();
				return;
			}

			const target = event.target;
			const isInput = ["input", "select", "textarea"].includes(target.localName) || target.isContentEditable;
			const meta = event.metaKey || event.ctrlKey;
			const key = event.key.toLowerCase();
			let handled = true;

			if (meta && key === "z") {
				event.shiftKey ? this.redo() : this.undo();
			} else if (meta && key === "y") {
				this.redo();
			} else if (meta && key === "s") {
				if (this.license.locked) {
					// nothing to save
				} else if (this.canSave) {
					this.mode = "confirm";
				} else if (this.file.create) {
					this.openSaveAs();
				}
			} else if (isInput || meta || event.altKey) {
				handled = false;
			} else if (key === "r" && this.has("rotate")) {
				this.rotate(event.shiftKey ? -90 : 90);
			} else if (key === "h" && this.has("flip")) {
				this.flip("x");
			} else if (key === "v" && this.has("flip")) {
				this.flip("y");
			} else if (key === "+" || key === "=") {
				this.zoom(1.25);
			} else if (key === "-") {
				this.zoom(0.8);
			} else if (key === "0") {
				this.fit();
			} else {
				handled = false;
			}

			// keep the Panel from handling the shortcut as well
			if (handled) {
				event.preventDefault();
				event.stopPropagation();
			}
		},
		onSubmit() {
			if (this.mode === "confirm") {
				return this.save();
			}

			if (this.mode === "saveas" && this.name) {
				return this.saveAs();
			}
		},
		openSaveAs() {
			this.mode = "saveas";
			this.$nextTick(() => this.$refs.name?.focus?.());
		},
		redo() {
			this.extra(this.cropper.redo());
		},
		reset() {
			const initial = this.cropper.history[0];

			this.cropper.restore(initial);
			this.extra(initial.extra);
			this.commit();
		},
		rotate(degrees) {
			this.cropper.rotate(degrees);

			// a fixed ratio stays as it is
			if (this.editor.ratio !== null) {
				return this.setRatio(this.editor.ratio);
			}

			this.turned = !this.turned;
		},
		async save() {
			await this.send("save", {}, { overwrite: true });
		},
		async saveAs() {
			await this.send("saveas", { name: this.name }, { overwrite: false });
		},
		schedule() {
			if (this.restoring) {
				return;
			}

			clearTimeout(this.timeout);
			this.timeout = setTimeout(() => this.commit(), 400);
		},
		async send(action, attributes, data) {
			this.isSaving = true;

			try {
				const blob = await this.blob();
				const filename = (action === "save" ? this.file.name : this.name || this.file.name) + "." + this.format.extension;
				const result = await upload(this, blob, {
					attributes,
					filename,
					url: this.$panel.urls.api + "/image-editor/" + this.file.api + "/" + action
				});

				this.$emit("submit", { ...data, file: result, original: this.file });
			} catch (error) {
				this.$panel.notification.error(error);
			} finally {
				this.isSaving = false;
			}
		},
		setFilter(name, value) {
			this.filters[name] = value;
		},
		setRatio(value) {
			const [a, b] = this.cropper.matrix();

			// the original ratio turns with the image
			this.ratio = value;
			this.turned = value === "original" && Math.abs(b) > Math.abs(a);
			this.cropper.setRatio(this.toRatio());
		},
		setSize(side, value) {
			const other = side === "width" ? "height" : "width";
			const ratio = this.crop.width / this.crop.height;

			value = parseInt(value);

			if (!value || value < 1) {
				return;
			}

			this.size[side] = value;

			if (this.size.lock) {
				this.size[other] = Math.max(1, Math.round(side === "width" ? value / ratio : value * ratio));
			} else {
				this.size[other] ??= this.crop[other];
			}

			this.schedule();
		},
		settings() {
			return {
				filters: this.filters,
				ratio: this.ratio,
				size: this.size,
				turned: this.turned
			};
		},
		shortcut(key, keys) {
			const mac = this.$helper.keyboard.metaKey() === "cmd";

			keys = keys
				.replace("meta+", mac ? "⌘" : "Ctrl+")
				.replace("shift+", mac ? "⇧" : "Shift+");

			return this.$t("owebstudio.image-editor." + key) + " (" + keys + ")";
		},
		straighten(angle) {
			this.angle = Number(angle);
			this.cropper.straighten(this.angle);
		},
		swap() {
			this.turned = !this.turned;
			this.cropper.setRatio(this.toRatio());
		},
		/**
		 * The crop ratio as number, turned for portrait or landscape
		 */
		toRatio() {
			if (this.ratio === null) {
				return null;
			}

			const natural = this.cropper.natural();
			const ratio = this.ratio === "original" ? natural.width / natural.height : this.ratio;

			return this.turned ? 1 / ratio : ratio;
		},
		toggleLock() {
			this.size.lock = !this.size.lock;

			if (this.size.lock && this.size.width) {
				this.setSize("width", this.size.width);
			}

			this.schedule();
		},
		undo() {
			this.extra(this.cropper.undo());
		},
		updateCrop() {
			const crop = this.cropper.cropSize();

			// a new crop starts with its own size
			if (crop.width !== this.crop.width || crop.height !== this.crop.height) {
				this.crop = crop;

				if (!this.restoring) {
					this.size = { width: null, height: null, lock: this.size.lock };
				}
			}
		},
		updateHistory() {
			this.canUndo = this.cropper.canUndo();
			this.canRedo = this.cropper.canRedo();
		},
		zoom(factor) {
			this.cropper.zoom(factor);
		}
	}
};
</script>

<style>
.k-image-editor-dialog.k-dialog {
	--dialog-width: 100rem;
	height: calc(100dvh - var(--dialog-margin) * 2);
}
.k-image-editor-dialog > .k-dropzone {
	flex-grow: 1;
}
.k-image-editor-dialog .k-dialog-body {
	flex-grow: 1;
	display: flex;
	min-height: 0;
	padding: 0;
}

.k-image-editor {
	display: flex;
	flex-grow: 1;
	min-width: 0;
	min-height: 0;
}
.k-image-editor-stage {
	position: relative;
	flex-grow: 1;
	min-width: 0;
	background: var(--color-gray-900);
}
.k-image-editor-canvas,
.k-image-editor-canvas cropper-canvas {
	position: absolute;
	inset: 0;
}
.k-image-editor-canvas cropper-image {
	filter: var(--filter);
}
.k-image-editor-loader,
.k-image-editor-error {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}
.k-image-editor-loader {
	color: var(--color-gray-400);
}
.k-image-editor-zoom {
	position: absolute;
	left: var(--spacing-3);
	right: var(--spacing-3);
	bottom: var(--spacing-3);
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-3);
	pointer-events: none;
}
.k-image-editor-zoom > * {
	pointer-events: auto;
}
.k-image-editor-size {
	padding: var(--spacing-1) var(--spacing-2);
	border-radius: var(--rounded);
	background: rgb(0 0 0 / 60%);
	color: var(--color-white);
	font-family: var(--font-mono);
	font-size: var(--text-xs);
}

.k-image-editor-tools {
	flex-shrink: 0;
	width: 19rem;
	overflow-y: auto;
	padding: var(--spacing-4);
	border-inline-start: 1px solid var(--color-border);
}
.k-image-editor-license {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing-2);
	margin-bottom: var(--spacing-4);
}
.k-image-editor-section + .k-image-editor-section {
	margin-top: var(--spacing-6);
}
.k-image-editor-section .k-label {
	margin-bottom: var(--spacing-2);
}
.k-image-editor-options {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-1);
}
.k-image-editor-options .k-button[aria-current="true"] {
	--button-color-back: var(--color-blue-500);
	--button-color-text: var(--color-white);
}
.k-image-editor-slider {
	display: block;
	margin-top: var(--spacing-3);
	font-size: var(--text-sm);
}
.k-image-editor-slider > span,
.k-image-editor-resize span {
	display: block;
	margin-bottom: var(--spacing-1);
	color: var(--color-text-dimmed);
	font-size: var(--text-xs);
}
.k-image-editor-slider + .k-image-editor-options {
	margin-top: var(--spacing-3);
}
.k-image-editor-resize {
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	align-items: end;
	gap: var(--spacing-2);
}
.k-image-editor-resize .k-number-input,
.k-image-editor-filename .k-text-input {
	width: 100%;
	height: var(--input-height);
	padding: 0 var(--input-padding);
	border: 1px solid var(--input-color-border);
	border-radius: var(--input-rounded);
	background: var(--input-color-back);
	color: var(--input-color-text);
}
.k-image-editor-help {
	margin-top: var(--spacing-2);
	color: var(--color-text-dimmed);
	font-size: var(--text-xs);
	line-height: var(--leading-normal);
}

.k-image-editor-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-3);
	padding: var(--spacing-3) var(--spacing-4);
	border-top: 1px solid var(--color-border);
}
.k-image-editor-redo .k-icon {
	transform: scaleX(-1);
}
.k-image-editor-question {
	font-size: var(--text-sm);
}
.k-image-editor-filename {
	display: flex;
	align-items: center;
	gap: var(--spacing-1);
	flex-grow: 1;
	max-width: 28rem;
	font-family: var(--font-mono);
	font-size: var(--text-sm);
}

@media screen and (max-width: 45rem) {
	.k-image-editor {
		flex-direction: column;
	}
	.k-image-editor-stage {
		min-height: 50dvh;
	}
	.k-image-editor-tools {
		width: auto;
		border-inline-start: 0;
		border-top: 1px solid var(--color-border);
	}
}
</style>
