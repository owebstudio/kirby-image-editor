<template>
  <k-dialog ref="dialog" size="fullscreen">
    <template>
      <tui-image-editor ref="editor" :include-ui="true" :options="options"/>
    </template>

    <template slot="footer">
      <k-button-group>
        <k-button icon="cancel" :text="$t('cancel')" @click="$refs.dialog.close()"/>
        <k-button icon="check" :text="$t('save')" @click="submit"/>
      </k-button-group>
    </template>
  </k-dialog>
</template>

<script>
import "tui-color-picker/dist/tui-color-picker.css";
import "tui-image-editor/dist/tui-image-editor.css";
import {ImageEditor} from "@toast-ui/vue-image-editor";

export default {
  components: {
    "tui-image-editor": ImageEditor
  },
  props: {
    cssMaxHeight: Number,
    cssMaxWidth: Number,
    endpoints: Object,
    menu: Array,
    menuBarPosition: String
  },
  data() {
    return {
      image: {}
    };
  },
  computed: {
    options() {
      return {
        includeUI: {
          loadImage: {
            path: null,
            name: null
          },
          theme: {
            "header.display": "none"
          },
          menu: this.$props['menu'],
          menuBarPosition: this.$props['menuBarPosition'],
          uiSize: {
            width: '100%',
            height: '100%'
          }
        },
        cssMaxWidth: this.$props['cssMaxWidth'],
        cssMaxHeight: this.$props['cssMaxHeight'],
        usageStatistics: false
      };
    }
  },
  methods: {
    open(image) {
      this.image = image;

      this.options.includeUI.loadImage.name = this.image.text;
      this.options.includeUI.loadImage.path = this.image.image.url;

      this.$refs.dialog.open();
    },
    async submit() {
      const image = this.$refs.editor.invoke('toDataURL');

      if (image) {
        const newFile = await this.$api.post(this.endpoints.field + "/modify", {
          id: this.image.id,
          filename: this.image.filename,
          image: image
        });

        if (newFile) {
          this.$emit('submit', {
            'oldFile': this.image,
            'newFile': newFile,
          })
        }
      }

      this.$refs.dialog.close();
    }
  }
}
</script>

<style>
.k-dialog[data-size="fullscreen"] {
  width: 100vw;
  height: 100vh;
}

.k-dialog[data-size="fullscreen"] .k-dialog-body {
  display: contents;
}
</style>
