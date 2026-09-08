const express = require('express');
const controller = require('../controllers/pagesController');
const { requireUser, requireGuest, requireAdmin, requireAdminGuest } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/loginLimiter');

const router = express.Router();

router.get('/', controller.getHome);
router.get('/privacy', controller.getPrivacy);
router.get('/contact', controller.getContact);
router.get('/dashboard', requireUser, controller.getDashboard);
router.get('/route', requireUser, controller.getRoute);
router.get('/news', requireUser, controller.getNews);
router.get('/nearest-station', requireUser, controller.getNearestStation);
router.get('/timetable', requireUser, controller.getTimetable);
router.get('/section/:id', requireUser, controller.getSectionById);

module.exports = router;
