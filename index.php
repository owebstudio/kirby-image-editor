<?php

use Kirby\Cms\App as Kirby;
use Oweb\ImageEditor\ImageEditorField;
use Oweb\ImageEditor\License\License;

require_once __DIR__ . '/lib/license/autoload.php';

load([
    'Oweb\ImageEditor\ImageEditor'      => 'lib/ImageEditor.php',
    'Oweb\ImageEditor\ImageEditorField' => 'lib/ImageEditorField.php'
], __DIR__);

$license = new License(
    plugin: 'owebstudio/image-editor',
    products: [15776],
    name: 'Image Editor',
    url: 'https://owebstudio.lemonsqueezy.com/checkout/buy/8a06fd59-6e0c-4426-9c1b-95581fd7374a'
);

Kirby::plugin('owebstudio/image-editor', $license->extend([
    'api' => [
        'routes' => require_once __DIR__ . '/config/api.php'
    ],
    'fields' => [
        'image-editor' => ImageEditorField::class
    ],
    'translations' => require_once __DIR__ . '/config/translations.php'
]), ...$license->args());
