if (require.main === module) {
	console.log('ass-x is not meant to be run via CLI!');
	process.exit(1);
}

/* const fs = require('fs-extra');
const fetch = require('node-fetch'); */
const express = require('express');
const router = express.Router();

router.all((_, res) => res.send('Coming soon!'));

module.exports = router;
