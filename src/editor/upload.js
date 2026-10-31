/**
 * Sends the edited image like the Panel's own uploads:
 * as a multipart upload, in chunks if it is too large
 * for a single request (see `uploadAsChunks()` in the Panel)
 */
export default async function upload(component, blob, { attributes = {}, filename, url }) {
	const { $helper, $panel } = component;
	const size = $panel.config.upload || 5242880;
	const parts = Math.max(1, Math.ceil(blob.size / size));
	const id = $helper.string.random(16).toLowerCase();
	let response;

	for (let i = 0; i < parts; i++) {
		const start = i * size;
		const end = Math.min(start + size, blob.size);
		const headers = { "x-csrf": $panel.system.csrf };

		if (parts > 1) {
			headers["Upload-Length"] = String(blob.size);
			headers["Upload-Offset"] = String(start);
			headers["Upload-Id"] = id;
		}

		response = await $helper.upload(
			parts > 1 ? blob.slice(start, end, blob.type) : blob,
			{ attributes, filename, headers, url }
		);
	}

	return response.data;
}
