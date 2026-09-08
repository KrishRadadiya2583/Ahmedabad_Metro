const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const FareRequest = require('../models/FareRequest');
const { calculateFare, getJourneyDetails, allStations } = require('../data/stations');
const { paymentConfigured } = require('../services/paymentGateway');
const { formatStation } = require('../utils/stations');

allStations.sort();

const getFare = (req, res) => res.render('fare', { title: 'Buy Ticket', allStations, result: null, query: {}, paymentConfigured: paymentConfigured() });

const postFare = (req, res) => {
  const { startStation, endStation } = req.body;
  const result = calculateFare(startStation, endStation);
  res.status(result.valid ? 200 : 400).render('fare', { title: 'Confirm Ticket', allStations, result, query: { startStation, endStation }, paymentConfigured: paymentConfigured() });
};

const getTickets = async (req, res, next) => {
  try { res.render('my-tickets', { title: 'My Tickets', tickets: await FareRequest.find({ user: req.session.userId, status: 'paid' }).sort({ paidAt: -1 }), now: new Date() }); }
  catch (error) { next(error); }
};

const getTicketsByIdDownload = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).render('error', { title: 'Ticket Not Found', message: 'The requested ticket ID is invalid.' });
    const ticket = await FareRequest.findOne({ _id: req.params.id, user: req.session.userId, status: 'paid' });
    if (!ticket) return res.status(404).render('error', { title: 'Ticket Not Found', message: 'This ticket does not exist or does not belong to you.' });
    const routeDetails = getJourneyDetails(ticket.startStation, ticket.endStation);
    const qrPayload = JSON.stringify({ ticketId: ticket._id.toString(), paymentId: ticket.razorpayPaymentId, from: ticket.startStation, to: ticket.endStation, expiresAt: ticket.expiresAt.toISOString() });
    const qrImage = await QRCode.toBuffer(qrPayload, { width: 320, margin: 2, errorCorrectionLevel: 'M' });
    const code = ticket._id.toString().slice(-8).toUpperCase();
    const document = new PDFDocument({ size: 'A4', margin: 46, info: { Title: `Ahmedabad Metro Ticket #${code}`, Author: 'Ahmedabad Metro' } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="metro-ticket-${code}.pdf"`);
    document.pipe(res);

    document.rect(0, 0, document.page.width, 112).fill('#0d4fa3');
    document.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('Ahmedabad Metro', 46, 35);
    document.fontSize(12).font('Helvetica').text('Digital journey ticket', 46, 72);
    document.fillColor('#147746').roundedRect(46, 130, 132, 26, 13).fill('#e5f8ee');
    document.fillColor('#147746').fontSize(11).font('Helvetica-Bold').text('TICKET CONFIRMED', 58, 138);
    document.fillColor('#14243a').fontSize(22).text(`Ticket #${code}`, 46, 178);

    document.roundedRect(46, 218, 503, 76, 10).fill('#f2f7fc');
    document.fillColor('#66778c').fontSize(9).text('FROM', 64, 235).text('TO', 320, 235);
    document.fillColor('#0d4fa3').fontSize(16).font('Helvetica-Bold').text(formatStation(ticket.startStation), 64, 252, { width: 205 }).text(formatStation(ticket.endStation), 320, 252, { width: 205 });

    document.image(qrImage, 198, 314, { width: 200 });
    document.fillColor('#0b8f76').fontSize(10).text('SCAN AT ENTRY AND EXIT GATES', 0, 520, { align: 'center' });

    const detailsTop = 552;
    document.fillColor('#14243a').fontSize(11).font('Helvetica-Bold');
    document.text('Passenger', 46, detailsTop).text('Fare paid', 220, detailsTop).text('Distance', 390, detailsTop);
    document.font('Helvetica').fontSize(11).text(String(req.user.name), 46, detailsTop + 17, { width: 150 }).text(`Rs. ${ticket.totalPrice}`, 220, detailsTop + 17).text(`${Number(ticket.distance).toFixed(2)} km`, 390, detailsTop + 17);
    document.font('Helvetica-Bold').text('Purchased', 46, detailsTop + 52).text('Valid until', 220, detailsTop + 52).text('Payment ID', 390, detailsTop + 52);
    document.font('Helvetica').fontSize(9).text(ticket.paidAt.toLocaleString('en-IN'), 46, detailsTop + 69, { width: 155 }).text(ticket.expiresAt.toLocaleString('en-IN'), 220, detailsTop + 69, { width: 155 }).text(String(ticket.razorpayPaymentId), 390, detailsTop + 69, { width: 155 });

    document.addPage();
    document.fillColor('#0d4fa3').fontSize(20).font('Helvetica-Bold').text('Route instructions');
    document.moveDown(0.7).fillColor('#14243a').fontSize(11).font('Helvetica');
    if (routeDetails.interchanges.length) {
      routeDetails.interchanges.forEach(change => document.text(`Change at ${formatStation(change.station)}: ${change.fromLine} to ${change.toLine}`, { bullet: true }));
    } else {
      document.text('Direct train - no interchange required.', { bullet: true });
    }
    document.moveDown().font('Helvetica-Bold').fontSize(15).text('All stations');
    document.moveDown(0.4).font('Helvetica').fontSize(9).text(routeDetails.journey.map((station, index) => `${index + 1}. ${formatStation(station)}`).join('\n'), { columns: 2, columnGap: 24 });
    document.moveDown().fillColor('#66778c').fontSize(9).text('Valid only for the selected origin, destination and passenger. Keep this ticket available until your journey is complete.');
    document.end();
  } catch (error) { next(error); }
};

const getTicketsById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).render('error', { title: 'Ticket Not Found', message: 'The requested ticket ID is invalid.' });
    const ticket = await FareRequest.findOne({ _id: req.params.id, user: req.session.userId, status: 'paid' });
    if (!ticket) return res.status(404).render('error', { title: 'Ticket Not Found', message: 'This ticket does not exist or does not belong to you.' });
    const qrPayload = JSON.stringify({ ticketId: ticket._id.toString(), paymentId: ticket.razorpayPaymentId, from: ticket.startStation, to: ticket.endStation, expiresAt: ticket.expiresAt.toISOString() });
    const qrCode = await QRCode.toDataURL(qrPayload, { width: 280, margin: 2, errorCorrectionLevel: 'M' });
    res.render('ticket', { title: 'Ticket', ticket, expired: new Date() >= ticket.expiresAt, qrCode, routeDetails: getJourneyDetails(ticket.startStation, ticket.endStation) });
  } catch (error) { next(error); }
};

module.exports = {
  getFare,
  postFare,
  getTickets,
  getTicketsByIdDownload,
  getTicketsById
};
