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

    <k-image-editor-dialog v-bind="$props" ref="dialog" @submit="modifiedImage"/>
  </k-field>
</template>

<script>
import FieldDialog from "./FieldDialog.vue"

export default {
  extends: 'k-files-field',
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
  computed: {},
  methods: {
    initImageEditor(index) {
      const image = this.selected[index];

      if (image) {
        this.$refs.dialog.open(image);
      }
    },
    modifiedImage(data) {
      const oldFile = data["oldFile"];
      const newFile = data["newFile"];

      this.selected = this.selected.filter((item) => item.id !== oldFile.id);
      this.selected.push(newFile);

      this.$emit("input", this.selected);
      this.onInput();
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
