<?php

use Kirby\Exception\PermissionException;
use Kirby\Http\Response;
use Oweb\ImageEditor\ImageEditor;

$pattern = 'image-editor/(account|pages/[^/]+|site|users/[^/]+)/files/([^/]+)';

return [
    [
        'pattern' => $pattern . '/source',
        'method'  => 'GET',
        'action'  => function (string $path, string $filename) {
            $file = $this->file($path, $filename);

            if (ImageEditor::file($file) === null) {
                throw new PermissionException(
                    message: 'The file cannot be edited'
                );
            }

            return Response::file($file->root(), [
                'headers' => ['Cache-Control' => 'no-store']
            ]);
        }
    ],
    [
        'pattern' => $pattern . '/save',
        'method'  => 'POST',
        'action'  => function (string $path, string $filename) {
            ImageEditor::unlocked();

            $file = $this->file($path, $filename);

            return $this->upload(
                callback: fn (string $source) => ImageEditor::replace($file, $source),
                single: true,
                preflight: function () use ($file) {
                    if ($file->guards()->isAvailable('replace') !== true) {
                        throw new PermissionException(
                            message: 'The file cannot be replaced'
                        );
                    }
                }
            );
        }
    ],
    [
        'pattern' => $pattern . '/saveas',
        'method'  => 'POST',
        'action'  => function (string $path, string $filename) {
            ImageEditor::unlocked();

            $file = $this->file($path, $filename);
            $name = $this->requestBody('name');

            return $this->upload(
                callback: fn (string $source) => ImageEditor::create($file, $source, $name),
                single: true,
                preflight: function () use ($file) {
                    if (ImageEditor::canCreate($file) !== true) {
                        throw new PermissionException(
                            message: 'The file cannot be created'
                        );
                    }
                }
            );
        }
    ]
];
