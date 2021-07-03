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
const INVALID_STRING = 'Invalid token';

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
const frontendBrandCombo = `${name} v${version}<br>(Powered by ${nameAss} v${versionAss})`;
router.get('/login', (_, res) => res.render(getRenderPath('login'), { brand: frontendBrandCombo }));
router.get('/user', (req, res) => res.render(getRenderPath('user'), {
	brand: frontendBrandCombo,
	user: users[activeTokens[req.session.token]],
	uploads: Object.entries(data).filter(([, resource]) => resource.token === activeTokens[req.session.token]).map(([resourceId, resource]) => (resource.meta = {
		timestamp: formatTimestamp(resource.timestamp),
		size: formatBytes(resource.size),
		color: deepGetResourceColor(resource),
		borderCss: `` +
			`.thumbnail.${resourceId} {` +
			`border-color: rgba(0, 0, 0, 0) rgba(0, 0, 0, 0) rgba(0, 0, 0, 0) ${deepGetResourceColor(resource)};` +
			`transition: border-color 50ms linear;` +
			`}` +
			`.thumbnail.${resourceId}:hover { border-color: ${deepGetResourceColor(resource)}; }`
	}, [resourceId, resource])).reverse(),
}));

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

module.exports = {
	router,
	enabled: true,
	brand: `${name} v${version}`,
	endpoint: '/dashboard',
};
