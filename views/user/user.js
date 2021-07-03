const FADE_SPEED = 200;

/**
 * Opens the fullscreen viewer with the specified resource
 * @param {String} url URL of the resource
 * @param {String} type mimetype of the resource
 */
function updateViewer(url, type) {
	$('#viewer-frame').html(`<${type.includes('video') ? 'video controls' : 'img'} src="${url}">`);
	$('#viewer').show(0, () => $('#viewer').fadeTo(FADE_SPEED, 1.0));
}

/**
 * Close the fullscreen resource viewer
 */
function closeViewer() {
	$('#viewer-frame').html('<!-- None -->');
	$('#viewer').fadeTo(FADE_SPEED, 0.0, () => $('#viewer').hide());
}

/**
 * Copy the provided URL to the clipboard
 * @param {String} url URL to copy
 */
function copyUrl(url) {
	console.log('Attempting clipboard operation (1/3)')
	let failed = false;
	navigator.permissions.query({ name: "clipboard-write" })
		.then((result) => (result.state == "granted" || result.state == "prompt") && navigator.clipboard.writeText(url).then())
		.catch((err) => (console.error(err), navigator.clipboard.writeText(url)))
		.then(() => console.log('Copied to clipboard (2/3)'))
		.catch((err) => (console.error(err), failed = true))
		.finally(() => console.log(`Clipboard operation ${failed ? 'failed' : 'succeeded'} (3/3)`));
}
