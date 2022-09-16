<?php

use Kirby\Cms\App as Kirby;
use Kirby\Filesystem\F;
use Kirby\Cms\File;

return [
    'image-editor' => [
        'extends' => 'files',
        'props' => [
            'cssMaxHeight' => function (int $value = null) {
                return $value ?? Kirby::instance()->option('owebstudio.tui-image-editor.cssMaxHeight');
            },
            'cssMaxWidth' => function (int $value = null) {
                return $value ?? Kirby::instance()->option('owebstudio.tui-image-editor.cssMaxWidth');
            },
            'menu' => function (array $value = null) {
                return $value ?? Kirby::instance()->option('owebstudio.tui-image-editor.menu');
            },
            'menuBarPosition' => function (string $value = null) {
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

                        $id = get('id');
                        $filename = get('filename');
                        $image = get('image');

                        if (empty($image) === false && $file = $parent->file($filename)) {
                            try {
                                $data = explode(',', $image);
                                $content = base64_decode($data[1]);

                                F::write($file->root(), $content);

                                $newFile = new File([
                                    'filename' => $file->filename(),
                                    'parent' => $parent
                                ]);

                                return $newFile->panel()->pickerData([
                                    'image' => $field->image,
                                    'info' => $field->info ?? false,
                                    'layout' => $field->layout,
                                    'model' => $field->model(),
                                    'text' => $field->text,
                                ]);
                            } catch (Exception $e) {
                                //
                            }
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

                        $id = get('id');
                        $filename = get('filename');
                        $rename = get('rename');
                        $image = get('image');

                        if (empty($image) === false && $file = $parent->file($filename)) {
                            try {
                                $newFileName = ($rename ?? ($file->name() . '-tuiie-' . uniqid())) . '.png';
                                $newFilePath = $parent->root() . '/' . $newFileName;

                                $data = explode(',', $image);
                                $content = base64_decode($data[1]);

                                F::write($newFilePath, $content);

                                $newFile = new File([
                                    'filename' => $newFileName,
                                    'parent' => $parent
                                ]);

                                return $newFile->panel()->pickerData([
                                    'image' => $field->image,
                                    'info' => $field->info ?? false,
                                    'layout' => $field->layout,
                                    'model' => $field->model(),
                                    'text' => $field->text,
                                ]);
                            } catch (Exception $e) {
                                //
                            }
                        }

                        return null;
                    }
                ]
            ];
        },
    ]
];
