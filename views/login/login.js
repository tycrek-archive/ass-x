function login() {
	fetch('/dashboard/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token: $('#token').val() })
	})
		.then((res) => res.status === 200 ? window.location = '/dashboard/user' : alert('Invalid token!'))
		.catch((err) => (console.error(err), alert('Error, check console for details')));
}
