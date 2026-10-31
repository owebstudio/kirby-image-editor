<template>
	<k-field
		v-bind="$props"
		:class="['k-models-field', 'k-filepicker-field', 'k-image-editor-field', $attrs.class]"
		:input="false"
		:link="undefined"
		:style="$attrs.style"
	>
		<template v-if="!disabled" #options>
			<k-button-group
				ref="buttons"
				:buttons="buttons"
				layout="collapsed"
				size="xs"
				variant="filled"
				class="k-field-options"
			/>
		</template>

		<k-box v-if="license.locked" :theme="license.theme" class="k-image-editor-license">
			<k-text>{{ license.message }}</k-text>
			<k-button v-if="license.dialog" :dialog="license.dialog" icon="key" size="sm">
				{{ license.button }}
			</k-button>
		</k-box>

		<k-dropzone :disabled="!hasDropzone" @drop="drop">
			<component is="k-validator" v-bind="{ min, max, required }" :count="value.length">
				<k-collection
					v-bind="collection"
					v-on="!disabled ? { empty: open } : {}"
					@sort="onSort"
					@sort-change="$emit('change', $event)"
				>
					<template v-if="!disabled" #options="{ item, index }">
						<k-button
							v-if="item.editor"
							:title="$t('owebstudio.image-editor.edit')"
							icon="wand"
							@click="edit(index)"
						/>
						<k-button
							:title="$t('remove')"
							icon="remove"
							@click="remove(index)"
						/>
					</template>
				</k-collection>
			</component>
		</k-dropzone>
	</k-field>
</template>

<script>
export default {
	extends: "k-filepicker-field",
	props: {
		editor: {
			type: Object,
			default: () => ({})
		},
		license: {
			type: Object,
			default: () => ({})
		}
	},
	methods: {
		edit(index) {
			const item = this.selected[index];

			this.$panel.dialog.open({
				component: "k-image-editor-dialog",
				props: {
					editor: this.editor,
					file: item.editor,
					license: this.license
				},
				on: {
					submit: (result) => this.onEdited(index, result)
				}
			});
		},
		async onEdited(index, { file, overwrite }) {
			this.$panel.dialog.close();

			if (overwrite === true) {
				// load the item again for the new preview
				this.selected = this.selected.toSpliced(index, 1);
				await this.fetch();
			} else {
				this.$emit("input", this.value.toSpliced(index, 1, file.uuid ?? file.id));
				await this.$panel.content.update();
			}

			this.$panel.notification.success();
			this.$panel.events.emit("model.update");
		}
	}
};
</script>

<style>
.k-image-editor-field .k-image-editor-license {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-3);
	margin-bottom: var(--spacing-2);
}
</style>
