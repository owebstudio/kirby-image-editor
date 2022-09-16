<?php

use Kirby\Cms\App as Kirby;

Kirby::plugin('owebstudio/tui-image-editor', [
    'options' => require_once __DIR__ . '/config/options.php',
    'fields' => require_once __DIR__ . '/config/fields.php',
    'translations' => require_once __DIR__ . '/config/translations.php'
]);
