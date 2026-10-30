<?php

use Kirby\Cms\App as Kirby;
use Kirby\Exception\InvalidArgumentException;
use Kirby\Filesystem\F;
use Kirby\Filesystem\Mime;

return [
    'image-editor' => [
        'extends' => 'files',
        'props' => [
            'cssMaxHeight' => function (?int $value = null) {
                return $value ?? Kirby::instance()->option('owebstudio.tui-image-editor.cssMaxHeight');
            },
            'cssMaxWidth' => function (?int $value = null) {
                return $value ?? Kirby::instance()->option('owebstudio.tui-image-editor.cssMaxWidth');
            },
            'menu' => function (?array $value = null) {
                return $value ?? Kirby::instance()->option('owebstudio.tui-image-editor.menu');
            },
            'menuBarPosition' => function (?string $value = null) {
                return $value ?? Kirby::instance()->option('owebstudio.tui-image-editor.menuBarPosition');
            }
        ],
        'computed' => [
            'query' => function () {
                $query = $this->query ?? $this->parentModel::CLASS_ALIAS . '.files';

                // make sure fetching resizable files
                return $query . '.filterBy("isResizable", true)';
            }
        ],
        'methods' => [
            'imageSource' => function (string $image, string $extension): string {
                $data = explode(',', $image, 2);
                $mime = match ($data[0]) {
                    'data:image/jpeg;base64' => 'image/jpeg',
                    'data:image/png;base64' => 'image/png',
                    default => null
                };
                $content = base64_decode($data[1] ?? '', true);

                if ($mime === null || empty($content) === true) {
                    throw new InvalidArgumentException('The image data is invalid');
                }

                // keep the extension of the original file if it fits the image data
                $extension = strtolower($extension);

                if (Mime::fromExtension($extension) !== $mime) {
                    $extension = Mime::toExtension($mime);
                }

                $source = sys_get_temp_dir() . '/' . uniqid() . '.' . $extension;

                F::write($source, $content);

                if (F::mime($source) !== $mime) {
                    F::remove($source);
                    throw new InvalidArgumentException('The image data is invalid');
                }

                return $source;
            }
        ],
        'api' => function () {
            return [
                [
                    'pattern' => '/',
                    'action' => function () {
                        $field = $this->field();

                        return $field->filepicker([
                            'image' => $field->image(),
                            'info' => $field->info(),
                            'layout' => $field->layout(),
                            'limit' => $field->limit(),
                            'page' => $this->requestQuery('page'),
                            'query' => $field->query(),
                            'search' => $this->requestQuery('search'),
                            'text' => $field->text()
                        ]);
                    }
                ],
                [
                    'pattern' => 'upload',
                    'method' => 'POST',
                    'action' => function () {
                        $field = $this->field();
                        $uploads = $field->uploads();

                        return $field->upload($this, $uploads, function ($file, $parent) use ($field) {

                            if ($file->isResizable() === false) {
                                throw new Exception('The file "' . $file->filename() . '" you are trying to upload is not resizable.');
                            }

                            return $file->panel()->pickerData([
                                'image' => $field->image(),
                                'info' => $field->info(),
                                'layout' => $field->layout(),
                                'model' => $field->model(),
                                'text' => $field->text(),
                            ]);
                        });
                    }
                ],
                [
                    'pattern' => 'save',
                    'method' => 'POST',
                    'action' => function () {
                        $field = $this->field();
                        $parent = $field->model();

                        $filename = get('filename');
                        $image = get('image');

                        if (empty($image) === false && $file = $parent->file($filename)) {
                            $source = $field->imageSource($image, $file->extension());

                            try {
                                if (F::mime($source) !== $file->mime()) {
                                    throw new InvalidArgumentException([
                                        'key' => 'file.mime.differs',
                                        'data' => ['mime' => $file->mime()]
                                    ]);
                                }

                                $newFile = $file->replace($source);
                            } finally {
                                F::remove($source);
                            }

                            return $newFile->panel()->pickerData([
                                'image' => $field->image,
                                'info' => $field->info ?? false,
                                'layout' => $field->layout,
                                'model' => $field->model(),
                                'text' => $field->text,
                            ]);
                        }

                        return null;
                    }
                ],
                [
                    'pattern' => 'saveas',
                    'method' => 'POST',
                    'action' => function () {
                        $field = $this->field();
                        $parent = $field->model();

                        $filename = get('filename');
                        $rename = get('rename');
                        $image = get('image');

                        if (empty($image) === false && $file = $parent->file($filename)) {
                            $source = $field->imageSource($image, $file->extension());
                            $name = F::safeBasename($rename ?? ($file->name() . '-tuiie-' . uniqid()), false);

                            try {
                                $newFile = $parent->createFile([
                                    'source' => $source,
                                    'filename' => $name . '.' . F::extension($source),
                                    'template' => $file->template()
                                ]);
                            } finally {
                                F::remove($source);
                            }

                            return $newFile->panel()->pickerData([
                                'image' => $field->image,
                                'info' => $field->info ?? false,
                                'layout' => $field->layout,
                                'model' => $field->model(),
                                'text' => $field->text,
                            ]);
                        }

                        return null;
                    }
                ]
            ];
        },
    ]
];
