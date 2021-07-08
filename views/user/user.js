const FADE_SPEED = 150;
const ELEMENT_MAP = {
	image: 'img',
	video: 'video',
	audio: 'audio'
};

function stopPropagation(event) {
	return event.stopPropagation();
}

/**
 * Opens the fullscreen viewer with the specified resource
 * @param {String} url URL of the resource
 * @param {String} type mimetype of the resource
 * @param {Object} is "Is image/video/audio/other" object of the resource
 */
function updateViewer(resourceId, url, originalname, type, is) {
	// Fix type & is, if necessary
	type = type.split('/')[0];
	if (!is) is = {
		image: type.includes('image'),
		video: type.includes('video'),
		audio: type.includes('audio')
	};

	// Create the element to nest inside the #viewer-frame
	let element = $(`<${ELEMENT_MAP[type] || 'code'}>${`</${ELEMENT_MAP[type] || 'code'}>`}`, {
		id: 'viewer-resource',
		src: url,
		title: originalname,
		alt: originalname,
		controls: true,
		loop: true,
		muted: is.video,
		playsinline: is.video,
		preload: 'metadata'
	});

	// If the element is a code block, simply put the text
	if (!ELEMENT_MAP[type]) element.text(originalname);

	// Build & display the viewer
	$('#content').removeClass('unblur');
	$('#viewer-frame').append(element);
	$('#viewer-resource').after(`<br><br>${$(`.buttons.${resourceId}`).html()}`);
	$(`#viewer-frame > .resource-buttons.${resourceId}`).on('click', stopPropagation);
	$('#viewer').show(0, () => $('#viewer').fadeTo(FADE_SPEED, 1.0));
}

/**
 * Close the fullscreen resource viewer
 */
function closeViewer() {
	$('#content').addClass('unblur');
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

/**
 * Deletes a resource then reloads the page
 * @param {String} url Delete URL to call
 * @returns false because StackOverflow said so
 */
function deleteResource(url) {
	fetch(url)
		.then(() => window.location.reload())
		.catch((err) => (console.error(err), alert('Error, check console for details!')));
	return false;
}

/**
 * Deletes the active session cookie and directs the user to login
 */
function logout() {
	fetch('/dashboard/logout')
		.then(() => window.location = '/dashboard')
		.catch((err) => (console.error(err), alert('Error, check console for details!')));
}
