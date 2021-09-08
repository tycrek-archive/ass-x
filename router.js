if (require.main === module) {
	console.log('ass-x is not meant to be run via CLI!');
	process.exit(1);
}

// Import info & packages
const { name, version } = require('./package.json');
const { name: nameAss, version: versionAss } = require('../package.json');
const { useSsl } = require('../config.json');
const { CODE_OK, CODE_UNAUTHORIZED } = require('../MagicNumbers.json');
const random = require('../src/generators/gfycat');
const { formatTimestamp, formatBytes, getResourceColor } = require('../src/utils');
const path = require('path');

// Setup Express router
const express = require('express');
const router = express.Router();

// Setup sessions
const session = require('express-session');
const MemoryStore = require('memorystore')(session);

// Data & users
const users = require('../src/auth');
const data = require('../src/data');
const activeTokens = {};

// Constants
const GFYCAT = 7;
const TIME_24H = 86400000;
const PAGE_SIZE = process.env.NODE_ENV === 'production' ? 30 : 5;
const INVALID_STRING = 'Invalid token';
const FRONTEND_BRAND_COMBO = `${name} v${version}<br>(Powered by ${nameAss} v${versionAss})${Object.prototype.hasOwnProperty.call(process.env, 'ASS_ENV') ? `<br>env: ${process.env.ASS_ENV}` : ''}`;

// Functions

/**
 * Returns an absolute path to a view for Pug using process.cwd()
 * @param {String} view The view to build a path for
 * @returns {String} An absolute path
 */
function getRenderPath(view) {
	return path.join(process.cwd(), name, 'views/', `${view}.pug`);
}

function verifySession(req, _res, next) {
	Object.prototype.hasOwnProperty.call(activeTokens, req.session.token || INVALID_STRING) ? next() : next(INVALID_STRING);
}

function deepGetResourceColor(resource) {
	return getResourceColor(resource.opengraph.color || null, resource.vibrant);
}

// Routes
router.use(express.json());
router.use(session({
	name,
	secure: useSsl,
	resave: true,
	saveUninitialized: false,
	cookie: { maxAge: TIME_24H },
	secret: random({ gfyLength: GFYCAT }),
	store: new MemoryStore({ checkPeriod: TIME_24H }),
}));

// Verify session
router.use('/user', verifySession);
router.use('/user', (err, _req, res, next) => err === INVALID_STRING ? res.redirect('/dashboard/login') : next(err));

// Redirect index to either login or dashboard
router.get('/', (req, res) => res.redirect(`/dashboard/${req.session.token ? 'user' : 'login'}`));

// Render login
router.get('/login', (_, res) => res.render(getRenderPath('login'), { brand: FRONTEND_BRAND_COMBO }));

// Parse page information
router.get('/user', (req, _res, next) => {
	const pageNumber = parseInt(req.query.page) || 1;
	req.pages = {
		page: pageNumber,
		size: PAGE_SIZE,
		pagination: (pageNumber - 1) * PAGE_SIZE,
		previous: pageNumber - 1,
		next: pageNumber + 1
	};
	next();
});

// Render user dashboard
router.get('/user', async (req, res, next) => {
	data.get()
		.then((d) => d
			.filter(([, resource]) => resource.token === activeTokens[req.session.token])
			.map(([resourceId, resource]) =>
			(resource.meta = {
				size: formatBytes(resource.size),
				color: deepGetResourceColor(resource),
				timestamp: formatTimestamp(resource.timestamp),
				borderCss: `` +
					`.thumbnail.${resourceId} {` +
					`border-color: rgba(0, 0, 0, 0) rgba(0, 0, 0, 0) rgba(0, 0, 0, 0) ${deepGetResourceColor(resource)};` +
					`transition: border-color 50ms linear;` +
					`}` +
					`.thumbnail.${resourceId}:hover { border-color: ${deepGetResourceColor(resource)}; }`
			}, [resourceId, resource])))
		.then((uploads) =>
			res.render(getRenderPath('user'), {
				pages: req.pages,
				brand: FRONTEND_BRAND_COMBO,
				user: users[activeTokens[req.session.token]],
				uploads: uploads.sort(([, a], [, b]) => b.timestamp - a.timestamp).slice(req.pages.pagination, req.pages.pagination + PAGE_SIZE),
				totalUploads: uploads.length
			}))
		.catch(next);
});

// Process login attempt
router.post('/login', (req, res) => {
	const token = req.body.token.replace(/[^0-9a-z]/gi, '');
	if (Object.prototype.hasOwnProperty.call(users, token)) {
		const sessionToken = random({ gfyLength: GFYCAT });
		req.session.token = sessionToken;
		activeTokens[sessionToken] = token;
		res.sendStatus(CODE_OK);
	} else res.status(CODE_UNAUTHORIZED).send(`Invalid token!`);
});

// Process logout request
router.get('/logout', (req, res) => {
	delete activeTokens[req.session.token];
	res.sendStatus(200);
});

module.exports = {
	router,
	enabled: true,
	brand: `${name} v${version}`,
	endpoint: '/dashboard',
};
