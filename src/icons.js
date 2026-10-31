const line = (d) =>
	`<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

export default {
	"image-editor-fit": line("M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"),
	"image-editor-flip-horizontal": line("M12 3v18M9 7 3 17h6zM15 7l6 10h-6z"),
	"image-editor-flip-vertical": line("M3 12h18M7 9 17 3v6zM7 15l10 6v-6z"),
	"image-editor-rotate-left": line("M4 4v5h5M4.6 15a8 8 0 1 0 1.3-8.4L4 9"),
	"image-editor-rotate-right": line("M20 4v5h-5M19.4 15a8 8 0 1 1-1.3-8.4L20 9"),
	"image-editor-swap": line("M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"),
	"image-editor-zoom-in": line("M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5M8 11h6M11 8v6"),
	"image-editor-zoom-out": line("M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5M8 11h6")
};
