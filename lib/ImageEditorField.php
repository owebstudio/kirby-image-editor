<?php

namespace Oweb\ImageEditor;

use Kirby\Cms\File;
use Kirby\Cms\ModelWithContent;
use Kirby\Form\Field\FilePickerField;
use Kirby\Reflection\Attributes\Prop;

/**
 * File picker field with an image editor for each picked image
 */
class ImageEditorField extends FilePickerField
{
    /**
     * Maximum height of the saved image in pixels
     */
    #[Prop(export: false)]
    protected int|null $maxHeight = null;

    /**
     * Maximum width of the saved image in pixels
     */
    #[Prop(export: false)]
    protected int|null $maxWidth = null;

    /**
     * Tools of the editor: `crop`, `rotate`, `flip`, `resize`, `filter`
     */
    #[Prop(export: false)]
    protected array|null $menu = null;

    /**
     * JPEG and WebP quality from 1 to 100
     */
    #[Prop(export: false)]
    protected int|null $quality = null;

    /**
     * Fixed crop ratio, e.g. `16/9`
     */
    #[Prop(export: false)]
    protected float|int|string|null $ratio = null;

    /**
     * Crop ratio presets, e.g. `[free, 1/1, 16/9]`
     */
    #[Prop(export: false)]
    protected array|null $ratios = null;

    public function config(): array
    {
        return ImageEditor::config();
    }

    public function props(): array
    {
        return [
            ...parent::props(),
            'editor'  => ImageEditor::editor([
                'maxHeight' => $this->maxHeight,
                'maxWidth'  => $this->maxWidth,
                'menu'      => $this->menu,
                'quality'   => $this->quality,
                'ratio'     => $this->ratio,
                'ratios'    => $this->ratios
            ]),
            'license' => ImageEditor::license()->panel()
        ];
    }

    /**
     * Only images the editor can open can be picked
     */
    public function query(): string
    {
        $query = $this->query ?? match (true) {
            $this->model() instanceof File => 'file.siblings',
            default                        => $this->model()::CLASS_ALIAS . '.files'
        };

        return $query . '.filterBy("isResizable", true)';
    }

    /**
     * @param File $model
     */
    public function toItem(ModelWithContent $model): array
    {
        return [
            ...parent::toItem($model),
            'editor' => ImageEditor::file($model)
        ];
    }

    /**
     * Only images can be uploaded, unless the
     * upload template has its own accept rules
     */
    public function uploads(): array|false
    {
        $uploads = parent::uploads();

        if ($uploads !== false && ($uploads['accept'] ?? '*') === '*') {
            $uploads['accept'] = implode(',', ImageEditor::INPUT);
        }

        return $uploads;
    }
}
