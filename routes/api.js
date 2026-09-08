const express = require('express');
const controller = require('../controllers/apiController');
const { requireUser, requireGuest, requireAdmin, requireAdminGuest } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/loginLimiter');

const router = express.Router();

router.get('/api/nearby-stations', requireUser, controller.getApiNearbyStations);
router.get('/api/metro-map', requireUser, controller.getApiMetroMap);
router.post('/api/payment/order', requireUser, controller.postApiPaymentOrder);
router.post('/api/payment/verify', requireUser, controller.postApiPaymentVerify);
router.use('/api', controller.useApi);

module.exports = router;
