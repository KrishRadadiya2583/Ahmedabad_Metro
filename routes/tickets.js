const express = require('express');
const controller = require('../controllers/ticketsController');
const { requireUser, requireGuest, requireAdmin, requireAdminGuest } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/loginLimiter');

const router = express.Router();

router.get('/fare', requireUser, controller.getFare);
router.post('/fare', requireUser, controller.postFare);
router.get('/tickets', requireUser, controller.getTickets);
router.get('/tickets/:id/download', requireUser, controller.getTicketsByIdDownload);
router.get('/tickets/:id', requireUser, controller.getTicketsById);

module.exports = router;
