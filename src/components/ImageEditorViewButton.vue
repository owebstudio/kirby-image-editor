<template>
	<k-view-button v-bind="$attrs" @click="open" />
</template>

<script>
export default {
	inheritAttrs: false,
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
		}
	},
	methods: {
		open() {
			this.$panel.dialog.open({
				component: "k-image-editor-dialog",
				props: {
					editor: this.editor,
					file: this.file,
					license: this.license
				},
				on: {
					submit: async ({ file, overwrite }) => {
						this.$panel.dialog.close();
						this.$panel.notification.success();

						if (overwrite === true) {
							await this.$panel.view.refresh();
						} else {
							await this.$panel.view.open(file.link);
						}
					}
				}
			});
		}
	}
};
</script>
