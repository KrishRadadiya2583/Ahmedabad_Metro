const express = require('express');
const controller = require('../controllers/adminController');
const { requireUser, requireGuest, requireAdmin, requireAdminGuest } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/loginLimiter');

const router = express.Router();

router.get('/admin/login', requireAdminGuest, controller.getAdminLogin);
router.get('/admin', controller.getAdmin);
router.post('/admin/login', loginLimiter, requireAdminGuest, controller.postAdminLogin);
router.post('/admin/logout', requireAdmin, controller.postAdminLogout);
router.get('/admin/dashboard', requireAdmin, controller.getAdminDashboard);
router.get('/admin/history', requireAdmin, controller.getAdminHistory);

module.exports = router;
