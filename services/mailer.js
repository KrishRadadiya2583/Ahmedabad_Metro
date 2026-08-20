const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const { getJourneyDetails } = require('../data/stations');

const configured = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const stationName = value => String(value || '').replace(/_/g, ' ');

const renderTicketEmail = ({ user, ticket, code, routeDetails }) => `
<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background-color:#eef4f8;font-family:Arial,Helvetica,sans-serif;color:#14243a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#eef4f8;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 36px rgba(18,52,86,.12);">
          <tr>
            <td align="center" style="padding:30px 24px;background-color:#0d4fa3;background-image:linear-gradient(135deg,#073b83,#087f8c);color:#ffffff;">
              <div style="display:inline-block;width:48px;height:48px;line-height:48px;margin-bottom:12px;border:2px solid rgba(255,255,255,.7);border-radius:14px;font-size:25px;font-weight:800;text-align:center;">M</div>
              <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#bfeee6;">Gujarat smart mobility</div>
              <h1 style="margin:7px 0 4px;font-size:28px;line-height:1.2;color:#ffffff;">Ahmedabad Metro</h1>
              <p style="margin:0;font-size:14px;color:#dbeaff;">Your digital journey ticket</p>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding:28px 28px 12px;text-align:left;">
              <span style="display:inline-block;padding:7px 14px;border-radius:999px;background:#e5f8ee;color:#147746;font-size:12px;font-weight:700;">✓ TICKET CONFIRMED</span>
              <h2 style="margin:18px 0 7px;font-size:23px;color:#14243a;">Ready to travel, ${escapeHtml(user.name)}!</h2>
              <p style="margin:0;color:#66778c;font-size:14px;line-height:1.6;">Scan the QR code below at the entry and exit gates.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dce6ef;border-radius:14px;background:#f8fbfd;">
                <tr>
                  <td width="42%" align="left" style="padding:20px 18px;"><div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#74859a;text-transform:uppercase;">From</div><div style="margin-top:6px;font-size:17px;font-weight:700;color:#0d4fa3;">${escapeHtml(stationName(ticket.startStation))}</div></td>
                  <td width="16%" align="center" style="color:#0b8f76;font-size:24px;font-weight:700;">→</td>
                  <td width="42%" align="right" style="padding:20px 18px;"><div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#74859a;text-transform:uppercase;">To</div><div style="margin-top:6px;font-size:17px;font-weight:700;color:#0d4fa3;">${escapeHtml(stationName(ticket.endStation))}</div></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dce6ef;border-radius:13px;background:#f8fbfd;color:#14243a;">
                <tr><td style="padding:18px 20px 8px;font-size:15px;font-weight:700;">Complete ticket details</td></tr>
                <tr><td style="padding:4px 20px;font-size:13px;"><strong>Passenger:</strong> ${escapeHtml(user.name)}</td></tr>
                <tr><td style="padding:4px 20px;font-size:13px;"><strong>Purchased:</strong> ${ticket.paidAt.toLocaleString('en-IN')}</td></tr>
                <tr><td style="padding:4px 20px;font-size:13px;"><strong>Payment ID:</strong> ${escapeHtml(ticket.razorpayPaymentId)}</td></tr>
                <tr><td style="padding:4px 20px 10px;font-size:13px;"><strong>Service:</strong> ${escapeHtml(routeDetails.linesUsed.join(' → '))}</td></tr>
                ${routeDetails.interchanges.length ? `<tr><td style="padding:4px 20px 10px;font-size:13px;"><strong>Interchange:</strong> ${routeDetails.interchanges.map(change => `${escapeHtml(stationName(change.station))} (${escapeHtml(change.fromLine)} → ${escapeHtml(change.toLine)})`).join('<br>')}</td></tr>` : '<tr><td style="padding:4px 20px 10px;font-size:13px;"><strong>Route:</strong> Direct train — no interchange required</td></tr>'}
                <tr><td style="padding:4px 20px 18px;font-size:12px;line-height:1.6;color:#66778c;"><strong>Stations:</strong> ${routeDetails.journey.map(station => escapeHtml(stationName(station))).join(' → ')}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 28px 20px;">
              <div style="display:inline-block;padding:12px;border:2px solid #0b8f76;border-radius:16px;background:#ffffff;box-shadow:0 8px 22px rgba(11,143,118,.14);">
                <img src="cid:ticket-qr" width="240" height="240" alt="Metro ticket QR code" style="display:block;width:240px;max-width:100%;height:auto;border:0;">
              </div>
              <div style="margin-top:10px;font-size:11px;font-weight:700;letter-spacing:1px;color:#0b8f76;">SCAN AT METRO GATE</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#102f57;border-radius:13px;color:#ffffff;">
                <tr>
                  <td width="33%" align="center" style="padding:17px 8px;border-right:1px solid #315074;"><div style="font-size:10px;color:#a9bdd4;text-transform:uppercase;">Fare paid</div><strong style="display:block;margin-top:5px;font-size:20px;color:#ffffff;">₹${ticket.totalPrice}</strong></td>
                  <td width="33%" align="center" style="padding:17px 8px;border-right:1px solid #315074;"><div style="font-size:10px;color:#a9bdd4;text-transform:uppercase;">Ticket ID</div><strong style="display:block;margin-top:5px;font-size:14px;color:#ffffff;">#${code}</strong></td>
                  <td width="34%" align="center" style="padding:17px 8px;"><div style="font-size:10px;color:#a9bdd4;text-transform:uppercase;">Distance</div><strong style="display:block;margin-top:5px;font-size:14px;color:#ffffff;">${Number(ticket.distance).toFixed(2)} km</strong></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 24px;background:#eaf8f5;border-top:1px dashed #aacfc8;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#397568;text-transform:uppercase;">Valid until</div>
              <div style="margin-top:6px;font-size:16px;font-weight:700;color:#123e43;">${ticket.expiresAt.toLocaleString('en-IN')}</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 28px 28px;">
              <p style="margin:0 0 8px;color:#617286;font-size:12px;line-height:1.6;">Keep this email available until your journey is complete.<br>This ticket is valid only for the selected route and passenger.</p>
              <p style="margin:16px 0 0;color:#9aa7b5;font-size:10px;">Safe journeys · Fast connections · Greener Ahmedabad</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const sendTicketEmail = async ({ user, ticket }) => {
  if (!configured()) return false;
  const code = ticket._id.toString().slice(-8).toUpperCase();
  const routeDetails = getJourneyDetails(ticket.startStation, ticket.endStation);
  const qrPayload = JSON.stringify({ ticketId: ticket._id.toString(), paymentId: ticket.razorpayPaymentId, from: ticket.startStation, to: ticket.endStation, expiresAt: ticket.expiresAt.toISOString() });
  const qrImage = await QRCode.toBuffer(qrPayload, { width: 240, margin: 2 });
  const subject = `Your metro ticket #${code}`;
  const html = renderTicketEmail({ user, ticket, code, routeDetails });
  const text = [
    `Ahmedabad Metro ticket #${code}`,
    `Passenger: ${user.name}`,
    `From: ${stationName(ticket.startStation)}`,
    `To: ${stationName(ticket.endStation)}`,
    `Distance: ${Number(ticket.distance).toFixed(2)} km`,
    `Fare paid: ₹${ticket.totalPrice}`,
    `Purchased: ${ticket.paidAt.toLocaleString('en-IN')}`,
    `Valid until: ${ticket.expiresAt.toLocaleString('en-IN')}`,
    `Payment ID: ${ticket.razorpayPaymentId}`,
    `Lines: ${routeDetails.linesUsed.join(' → ')}`,
    `Stations: ${routeDetails.journey.map(stationName).join(' → ')}`
  ].join('\n');

  await createTransporter().sendMail({
    from: `Ahmedabad Metro <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject,
    html,
    text,
    attachments: [{ filename: `metro-ticket-${code}.png`, content: qrImage, cid: 'ticket-qr' }]
  });
  return true;
};

module.exports = { sendTicketEmail, configured };
