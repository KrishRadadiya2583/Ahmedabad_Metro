const express = require('express');
const pages = require('./pages');
const auth = require('./auth');
const profile = require('./profile');
const tickets = require('./tickets');
const admin = require('./admin');
const api = require('./api');

const router = express.Router();

router.use(pages);
router.use(auth);
router.use(profile);
router.use(tickets);
router.use(admin);
router.use(api);

module.exports = router;
