<template>
  <k-field v-bind="$props" class="k-files-field k-image-editor-field">
    <template v-if="more && !disabled" #options>
      <k-button-group class="k-field-options">
        <k-options-dropdown ref="options" v-bind="options" @action="onAction"/>
      </k-button-group>
    </template>

    <k-dropzone :disabled="!moreUpload" @drop="drop">
      <k-collection
          v-bind="collection"
          @empty="prompt"
          @sort="onInput"
          @sortChange="$emit('change', $event)"
      >
        <template #options="{ index }">
          <k-button
              v-if="!disabled"
              class="k-image-editor-icon"
              icon="wand"
              @click="initImageEditor(index)"
          />
          <k-button
              v-if="!disabled"
              :tooltip="$t('remove')"
              icon="remove"
              @click="remove(index)"
          />
        </template>
      </k-collection>
    </k-dropzone>

    <k-files-dialog ref="selector" @submit="select"/>
    <k-upload ref="fileUpload" @success="upload"/>

    <k-image-editor-dialog
        v-if="currentModel"
        v-bind="$props"
        :params="params"
        :model="currentModel"
        ref="dialog"
        @submit="modifiedImage"
    />
  </k-field>
</template>

<script>
import FieldDialog from "./FieldDialog.vue"

export default {
  extends: "k-files-field",
  components: {
    "k-image-editor-dialog": FieldDialog
  },
  props: {
    cssMaxHeight: Number,
    cssMaxWidth: Number,
    endpoints: Object,
    menu: Array,
    menuBarPosition: String,
  },
  data() {
    return {
      currentModel: null,
      params: {
        cssMaxHeight: this.cssMaxHeight,
        cssMaxWidth: this.cssMaxWidth,
        menu: this.menu,
        menuBarPosition: this.menuBarPosition
      }
    };
  },
  computed: {},
  methods: {
    initImageEditor(index) {
      const image = this.selected[index];

      if (image) {
        this.currentModel = image;

        this.$nextTick(() => {
          this.$refs.dialog.open();
        });
      }
    },
    modifiedImage(data) {
      const oldFile = data["oldFile"];
      const newFile = data["newFile"];
      const overwrite = data["overwrite"];

      // update with new file item
      this.selected = this.selected.map(item => {
        if (item.id === oldFile.id) {
          return newFile;
        }
        return item;
      });

      if (overwrite === false) {
        // if used save as update the state
        this.$emit("input", this.selected);
        this.onInput();
      } else {
        // if used save as overwrite, do not update the state
        // unless there are content changes for related field
        let fieldName = this.name
        let contentId = this.$store.state.content.current
        let contentChanges = this.$store.getters['content/changes'](contentId)[fieldName];

        if (contentChanges) {
          this.$emit("input", this.selected);
        }
      }
    }
  }
};
</script>

<style>
.k-image-editor-field .k-cards-items[data-size="auto"] .k-item-content,
.k-image-editor-field .k-cards-items[data-size="small"] .k-item-content {
  padding-right: 4rem !important;
}
</style>
