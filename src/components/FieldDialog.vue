<template>
  <k-dialog ref="dialog" size="fullscreen">
    <template>
      <tui-image-editor
          ref="editor"
          :include-ui="true"
          :options="options"
      />
      <k-form-dialog
          ref="rename"
          v-model="value"
          :fields="fields"
          @close="$emit('close')"
          @submit="onSaveAs"
      />

      <k-dialog
          ref="overwrite"
          :submit-button="$t('confirm')"
          theme="negative"
          @submit="onSave"
      >
        <k-text>{{ $t("owebstudio.tui-image-editor.save.confirm") }}</k-text>
      </k-dialog>
    </template>

    <template slot="footer">
      <k-button-group>
        <k-button
            class="k-button-cancel"
            icon="cancel"
            :text="$t('cancel')"
            @click="$refs.dialog.close()"
        />
        <k-button
            class="k-button-save-as"
            icon="download"
            :text="$t('owebstudio.tui-image-editor.save.as')"
            @click="rename"
        />
        <k-button
            class="k-button-save"
            icon="check"
            :text="$t('save')"
            @click="save"
        />
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
    model: Object,
    menu: Array,
    menuBarPosition: String
  },
  data() {
    return {
      value: {
        name: this.generateFilename()
      }
    }
  },
  computed: {
    fields() {
      return {
        name: {
          label: this.$t("name"),
          type: "slug",
          icon: "title",
          allow: "@._-",
          after: "." + this.extension(),
          required: true
        }
      };
    },
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
    filename() {
      return this.model.filename.split('.').slice(0, -1).join('.');
    },
    generateFilename() {
      return this.filename() + "-tuiie-" + (this.$helper.uuid()).slice(0, 13);
    },
    format() {
      let format = "png";
      const extension = this.extension();
      if (["jpg", "jpeg"].includes(extension)) {
        format = "jpeg";
      }

      return format;
    },
    extension() {
      const supports = ["png", "jpg", "jpeg"];
      const extension = this.model.filename.split('.').pop().toLowerCase();

      if (supports.includes(extension)) {
        return extension;
      }

      return "png";
    },
    open() {
      this.options.includeUI.loadImage.name = this.model.text;
      this.options.includeUI.loadImage.path = this.model.image.url;

      this.$refs.dialog.open();
    },
    rename() {
      return this.$refs.rename.open();
    },
    save() {
      return this.$refs.overwrite.open();
    },
    async onSave() {
      const image = this.$refs.editor.invoke("toDataURL", {
        format: this.format()
      });

      if (image) {
        const newFile = await this.$api.post(this.endpoints.field + "/save", {
          id: this.model.id,
          filename: this.model.filename,
          image: image
        });

        if (newFile) {
          this.$emit("submit", {
            "oldFile": this.model,
            "newFile": newFile,
            "overwrite": true
          })
        }
      }

      this.$refs.dialog.close();
    },
    async onSaveAs() {
      this.$refs.rename.close();


      const image = this.$refs.editor.invoke("toDataURL", {
        format: this.format()
      });

      if (image) {
        const newFile = await this.$api.post(this.endpoints.field + "/saveas", {
          id: this.model.id,
          filename: this.model.filename,
          rename: this.value.name,
          image: image
        });

        if (newFile) {
          this.$emit("submit", {
            "oldFile": this.model,
            "newFile": newFile,
            "overwrite": false
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

.k-dialog[data-size="fullscreen"] footer .k-button-cancel {
  margin-right: auto;
}
</style>
