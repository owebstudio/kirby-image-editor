<?php

namespace Oweb\ImageEditor;

use Kirby\Cms\App as Kirby;
use Kirby\Cms\File;
use Kirby\Exception\InvalidArgumentException;
use Kirby\Exception\PermissionException;
use Kirby\Filesystem\F;
use Kirby\Filesystem\Mime;
use Kirby\Toolkit\I18n;
use Oweb\ImageEditor\License\License;

/**
 * Shared logic of the image editor field,
 * the file view button and the API routes
 */
class ImageEditor
{
    /**
     * Image types the editor can open
     */
    public const INPUT = ['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp'];

    /**
     * Image types the editor can save
     */
    public const OUTPUT = ['image/jpeg', 'image/png', 'image/webp'];

    /**
     * Options that can be set in the config and in blueprints
     */
    public const OPTIONS = ['maxHeight', 'maxWidth', 'menu', 'quality', 'ratio', 'ratios'];

    public const PLUGIN = 'owebstudio/image-editor';

    /**
     * Available tools, in the order of the editor's sections
     */
    public const TOOLS = ['crop', 'rotate', 'flip', 'resize', 'filter'];

    /**
     * Returns the view button for the file view,
     * or nothing if the file cannot be edited
     */
    public static function button(File $file): array|null
    {
        if (($data = static::file($file)) === null) {
            return null;
        }

        if ($data['replace'] === false && $data['create'] === false) {
            return null;
        }

        return [
            'component' => 'k-image-editor-view-button',
            'props'     => [
                'editor'  => static::editor(static::config()),
                'file'    => $data,
                'icon'    => 'wand',
                'license' => static::license()->panel(),
                'text'    => I18n::translate('owebstudio.image-editor.edit')
            ]
        ];
    }

    /**
     * Checks if the current user may save
     * a copy of the file next to the original
     */
    public static function canCreate(File $file): bool
    {
        $copy = new File([
            'filename' => $file->name() . '-edited.' . $file->extension(),
            'parent'   => $file->parent(),
            'template' => $file->template()
        ]);

        return $copy->guards()->isAvailable('create');
    }

    /**
     * Returns the options from the config,
     * also read from the former `owebstudio.tui-image-editor` prefix
     */
    public static function config(): array
    {
        $kirby  = Kirby::instance();
        $config = [];

        foreach (static::OPTIONS as $option) {
            $value = $kirby->option('owebstudio.image-editor.' . $option) ??
                     $kirby->option('owebstudio.tui-image-editor.' . $option);

            if ($value !== null) {
                $config[$option] = $value;
            }
        }

        return $config;
    }

    /**
     * Saves the edited image as a new file next to the original
     */
    public static function create(File $file, string $source, string|null $name = null): array
    {
        try {
            $mime = static::mime($source);
            $name = F::safeBasename($name ?? '', false);

            if ($name === '') {
                $name = F::safeBasename($file->name() . '-edited', false);
            }

            $newFile = $file->parent()->createFile([
                'filename' => $name . '.' . static::extension($file, $mime),
                'source'   => $source,
                'template' => $file->template()
            ], true);
        } finally {
            F::remove($source);
        }

        return static::result($newFile);
    }

    /**
     * Normalizes the editor settings for the Panel
     */
    public static function editor(array $options): array
    {
        $quality = (int)($options['quality'] ?? 90);

        return [
            'maxHeight' => static::size($options['maxHeight'] ?? null),
            'maxWidth'  => static::size($options['maxWidth'] ?? null),
            'menu'      => static::menu($options['menu'] ?? null),
            'quality'   => max(1, min(100, $quality)) / 100,
            'ratio'     => static::ratio($options['ratio'] ?? null),
            'ratios'    => static::ratios($options['ratios'] ?? null)
        ];
    }

    /**
     * Returns the extension for the edited image:
     * the original one if the type did not change
     */
    public static function extension(File $file, string $mime): string
    {
        if (Mime::fromExtension($file->extension()) === $mime) {
            return $file->extension();
        }

        return Mime::toExtension($mime);
    }

    /**
     * Returns what the editor needs to know about the file,
     * or nothing if the editor cannot open it
     */
    public static function file(File $file): array|null
    {
        if (in_array($file->mime(), static::INPUT, true) === false) {
            return null;
        }

        return [
            'api'       => $file->apiUrl(true),
            'create'    => static::canCreate($file),
            'extension' => $file->extension(),
            'filename'  => $file->filename(),
            'height'    => $file->height(),
            'id'        => $file->id(),
            'mime'      => $file->mime(),
            'name'      => $file->name(),
            'replace'   => $file->guards()->isAvailable('replace'),
            'uuid'      => $file->uuid()?->toString(),
            'width'     => $file->width()
        ];
    }

    public static function license(): License
    {
        return License::for(static::PLUGIN);
    }

    /**
     * Normalizes the tools of the editor;
     * tools of the former TOAST UI editor are ignored
     */
    public static function menu(mixed $menu): array
    {
        $menu = array_values(array_intersect((array)$menu, static::TOOLS));

        return $menu === [] ? static::TOOLS : $menu;
    }

    /**
     * Returns the MIME type of the uploaded image,
     * which must be one the editor can save
     */
    public static function mime(string $source): string
    {
        $mime = F::mime($source);

        if (in_array($mime, static::OUTPUT, true) === false) {
            throw new InvalidArgumentException(
                message: 'The image data is invalid'
            );
        }

        return $mime;
    }

    /**
     * Converts a ratio like `16/9`, `16:9` or `1.5` to a number,
     * `free` to `null` and keeps `original`
     */
    public static function ratio(mixed $ratio): float|string|null
    {
        if ($ratio === null || $ratio === 'free') {
            return null;
        }

        if ($ratio === 'original') {
            return $ratio;
        }

        if (is_string($ratio) === true && preg_match('!^\s*(\d+(?:\.\d+)?)\s*[/:x]\s*(\d+(?:\.\d+)?)\s*$!', $ratio, $match) === 1) {
            $ratio = (float)$match[2] > 0 ? (float)$match[1] / (float)$match[2] : 0;
        }

        if (is_numeric($ratio) === true && (float)$ratio > 0) {
            return round((float)$ratio, 6);
        }

        return null;
    }

    /**
     * Returns the crop ratio presets with labels
     */
    public static function ratios(mixed $ratios): array
    {
        $presets = [];

        foreach ((array)($ratios ?? ['free', 'original', '1/1', '4/3', '3/2', '16/9']) as $ratio) {
            $value = static::ratio($ratio);

            if ($value === null && $ratio !== 'free') {
                continue;
            }

            $text = match ($ratio) {
                'free', 'original' => I18n::translate('owebstudio.image-editor.ratio.' . $ratio),
                default            => str_replace(['/', 'x'], ':', str_replace(' ', '', (string)$ratio))
            };

            $presets[] = [
                'text'  => $text,
                'value' => $value
            ];
        }

        return $presets;
    }

    /**
     * Replaces the original image with the edited one
     */
    public static function replace(File $file, string $source): array
    {
        try {
            if (static::mime($source) !== $file->mime()) {
                throw new InvalidArgumentException(
                    key: 'file.mime.differs',
                    data: ['mime' => $file->mime()]
                );
            }

            $newFile = $file->replace($source, true);
        } finally {
            F::remove($source);
        }

        return static::result($newFile);
    }

    /**
     * Returns the file data for the Panel after saving
     */
    public static function result(File $file): array
    {
        return [
            'filename' => $file->filename(),
            'id'       => $file->id(),
            'link'     => $file->panel()->url(true),
            'uuid'     => $file->uuid()?->toString()
        ];
    }

    protected static function size(mixed $size): int|null
    {
        return is_numeric($size) === true && (int)$size > 0 ? (int)$size : null;
    }

    /**
     * Saving is locked on live sites without a license key
     */
    public static function unlocked(): void
    {
        $license = static::license();

        if ($license->isLocked() === true) {
            throw new PermissionException(
                message: $license->message()
            );
        }
    }
}
