chrome.app.runtime.onLaunched.addListener(function() {
	chrome.app.window.create('wirc.html', {
		state: 'normal',
		width: 775,
		height: 400,
		minWidth: 320,
		minHeight: 160,
		id: 'spongy'
	})
})
