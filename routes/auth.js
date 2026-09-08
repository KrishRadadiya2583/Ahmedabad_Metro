const express = require('express');
const controller = require('../controllers/authController');
const { requireUser, requireGuest, requireAdmin, requireAdminGuest } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/loginLimiter');

const router = express.Router();

router.get('/register', controller.getRegister);
router.post('/register', loginLimiter, requireGuest, controller.postRegister);
router.get('/login', controller.getLogin);
router.post('/login', loginLimiter, requireGuest, controller.postLogin);
router.post('/logout', requireUser, controller.postLogout);

module.exports = router;
