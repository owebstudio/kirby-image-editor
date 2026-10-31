import ImageEditorDialog from "./components/ImageEditorDialog.vue";
import ImageEditorField from "./components/ImageEditorField.vue";
import ImageEditorViewButton from "./components/ImageEditorViewButton.vue";
import icons from "./icons.js";

panel.plugin("owebstudio/image-editor", {
	components: {
		"k-image-editor-dialog": ImageEditorDialog,
		"k-image-editor-view-button": ImageEditorViewButton
	},
	fields: {
		"image-editor": ImageEditorField
	},
	icons
});
