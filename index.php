<?php

use Kirby\Cms\App as Kirby;
use Oweb\TuiImageEditor\License\License;

require_once __DIR__ . '/lib/license/autoload.php';

$license = new License(
    plugin: 'owebstudio/image-editor',
    products: [15776],
    name: 'Image Editor',
    url: 'https://owebstudio.lemonsqueezy.com/checkout/buy/8a06fd59-6e0c-4426-9c1b-95581fd7374a'
);

Kirby::plugin('owebstudio/image-editor', $license->extend([
    'options' => require_once __DIR__ . '/config/options.php',
    'fields' => require_once __DIR__ . '/config/fields.php',
    'translations' => require_once __DIR__ . '/config/translations.php'
]), ...$license->args());
