const express = require('express');
const controller = require('../controllers/profileController');
const { requireUser, requireGuest, requireAdmin, requireAdminGuest } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/loginLimiter');

const router = express.Router();

router.get('/profile', requireUser, controller.getProfile);
router.post('/profile', requireUser, controller.postProfile);

module.exports = router;
