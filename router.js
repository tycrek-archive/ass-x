if (require.main === module) {
	console.log('ass-x is not meant to be run via CLI!');
	process.exit(1);
}

// Import info & packages
const { name, version } = require('./package.json');
const { name: nameAss, version: versionAss } = require('../package.json');
const { useSsl } = require('../config.json');
const { CODE_OK, CODE_UNAUTHORIZED } = require('../MagicNumbers.json');
const random = require('../generators/gfycat');
const { formatTimestamp, formatBytes, getResourceColor } = require('../utils');
const path = require('path');

// Setup Express router
const express = require('express');
const router = express.Router();

// Setup sessions
const session = require('express-session');
const MemoryStore = require('memorystore')(session);

// Data & users
const users = require('../auth');
const data = require('../data');
const activeTokens = {};

// Constants
const GFYCAT = 7;
const TIME_24H = 86400000;
const PAGE_SIZE = process.env.NODE_ENV === 'production' ? 30 : 5;
const INVALID_STRING = 'Invalid token';
const FRONTEND_BRAND_COMBO = `${name} v${version}<br>(Powered by ${nameAss} v${versionAss})`;

// Functions

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

// Render login & dashboard
router.get('/login', (_, res) => res.render(getRenderPath('login'), { brand: FRONTEND_BRAND_COMBO }));
router.get('/user', (req, res) => {

	// Set up page data
	const pageNumber = parseInt(req.query.page || 1);
	const pagination = (pageNumber - 1) * PAGE_SIZE;
	const pages = {
		page: pageNumber,
		size: PAGE_SIZE,
		pagination,
		previous: pageNumber - 1,
		next: pageNumber + 1
	};

	// Upload list
	const uploads = Object.entries(data).filter(([, resource]) => resource.token === activeTokens[req.session.token]).map(([resourceId, resource]) => (resource.meta = {
		size: formatBytes(resource.size),
		color: deepGetResourceColor(resource),
		timestamp: formatTimestamp(resource.timestamp),
		borderCss: `` +
			`.thumbnail.${resourceId} {` +
			`border-color: rgba(0, 0, 0, 0) rgba(0, 0, 0, 0) rgba(0, 0, 0, 0) ${deepGetResourceColor(resource)};` +
			`transition: border-color 50ms linear;` +
			`}` +
			`.thumbnail.${resourceId}:hover { border-color: ${deepGetResourceColor(resource)}; }`
	}, [resourceId, resource]));

	res.render(getRenderPath('user'), {
		pages,
		brand: FRONTEND_BRAND_COMBO,
		user: users[activeTokens[req.session.token]],
		uploads: uploads.reverse().slice(pagination, pagination + PAGE_SIZE),
		totalUploads: uploads.length
	});
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
