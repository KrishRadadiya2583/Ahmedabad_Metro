const FareRequest = require('../models/FareRequest');
const { sendTicketEmail } = require('./mailer');

const ticketMinutes = () => Math.max(1, Number(process.env.TICKET_VALID_MINUTES || 180));

const deliverTicketEmail = (user, ticket) => {
  setImmediate(async () => {
    try {
      if (await sendTicketEmail({ user, ticket })) {
        await FareRequest.updateOne(
          { _id: ticket._id, emailSentAt: null },
          { $set: { emailSentAt: new Date() } }
        );
      }
    } catch (error) {
      console.error('Ticket email failed:', error.message);
    }
  });
};

module.exports = { ticketMinutes, deliverTicketEmail };
