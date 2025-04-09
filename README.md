# Kirby Image Editor Field

Full-featured photo image editor using canvas for Kirby. It is really easy, and it comes with great filters.

![image-editor](https://user-images.githubusercontent.com/3393422/190390702-f467dcf1-4e15-403b-866b-ee9e018ddc51.gif)

## TOAST UI Image Editor

This plugin developed based on [tui.image-editor](https://github.com/nhn/tui.image-editor). You can check out all features and documents from [official website](https://ui.toast.com/tui-image-editor).

### 🎨 Editor features

- Load image to canvas
- Undo/Redo (With shortcut)
- Crop
- Flip
- Rotation
- Resize
- Free drawing
- Line drawing
- Shape
- Icon
- Text
- Mask Filter
- Image Filter

## Installation

1. Download the latest release
2. Unzip downloaded file
3. Copy/paste unzipped folder in your `/site/plugins` folder

## Usage

```yaml
fields:
    editor:
        type: image-editor
        layout: cards
        size: medium
```

## Properties

The field contains all the properties of the files field (layout, size, query, etc..). Also includes followings:

| Property        | Type   | Default                                                                                 | Description                                         |
|:----------------|:-------|:----------------------------------------------------------------------------------------|:----------------------------------------------------|
| cssMaxHeight    | int    | null                                                                                    | Canvas css-max-height                               |
| cssMaxWidth     | int    | null                                                                                    | Canvas css-max-width                                |
| menu            | array  | ['resize', 'crop', 'flip', 'rotate', 'draw', 'shape', 'icon', 'text', 'mask', 'filter'] | It can be selected when only specific menu is used  |
| menuBarPosition | string | left                                                                                    | Menu bar position('top', 'bottom', 'left', 'right') |

## Options

| Option          | Type    | Default                                                                                 | Description                                         |
|:----------------|:--------|:----------------------------------------------------------------------------------------|:----------------------------------------------------|
| cssMaxHeight    | int     | null                                                                                    | Canvas css-max-height                               |
| cssMaxWidth     | int     | null                                                                                    | Canvas css-max-width                                |
| menu            | array   | ['resize', 'crop', 'flip', 'rotate', 'draw', 'shape', 'icon', 'text', 'mask', 'filter'] | It can be selected when only specific menu is used  |
| menuBarPosition | string  | left                                                                                    | Menu bar position('top', 'bottom', 'left', 'right') |

All options optional and the values can be updated in the `config.php` file and prefixed with `owebstudio.tui-image-editor.`.

## Sample options

```php
<?php

// All options optional
// /site/config/config.php
return [
    'owebstudio.tui-image-editor' => [
        'cssMaxWidth' => 1200,
        'cssMaxHeight' => 900,
        'menu' => ['resize', 'crop'],
        'menuBarPosition' => 'bottom'
    ]
];
```
