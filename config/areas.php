<?php

use Kirby\Cms\File;
use Oweb\ImageEditor\ImageEditor;

return [
    'site' => fn () => [
        'buttons' => [
            'file.image-editor' => fn (File $file) => ImageEditor::button($file)
        ]
    ]
];
