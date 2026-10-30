<?php

use Kirby\Cms\App as Kirby;
use Oweb\TuiImageEditor\License\License;

require_once __DIR__ . '/lib/license/autoload.php';

$license = new License(
    plugin: 'owebstudio/tui-image-editor',
    products: [15776],
    name: 'Image Editor Field',
    url: 'https://owebstudio.com/kirby/plugins/image-editor-field'
);

Kirby::plugin('owebstudio/tui-image-editor', $license->extend([
    'options' => require_once __DIR__ . '/config/options.php',
    'fields' => require_once __DIR__ . '/config/fields.php',
    'translations' => require_once __DIR__ . '/config/translations.php'
]), ...$license->args());
