import ImageEditorDialog from "./components/ImageEditorDialog.vue";
import ImageEditorField from "./components/ImageEditorField.vue";
import icons from "./icons.js";

panel.plugin("owebstudio/image-editor", {
	components: {
		"k-image-editor-dialog": ImageEditorDialog
	},
	fields: {
		"image-editor": ImageEditorField
	},
	icons
});
