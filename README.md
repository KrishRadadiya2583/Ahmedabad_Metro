# Ahmedabad Metro Dashboard

A responsive Node.js and Express application for planning Ahmedabad Metro journeys, calculating fares, purchasing QR tickets, downloading PDF tickets, and managing booking history.

## Features

- Account registration, login, profile, and MongoDB-backed sessions
- Fare calculation across Ahmedabad, Gandhinagar, and GIFT City corridors
- Razorpay checkout and server-side payment signature verification
- QR tickets with authenticated PDF download and device sharing
- Ticket delivery by email when SMTP is configured
- Route maps, station details, timetable, and nearest-station lookup
- User ticket history and protected admin dashboard
- Responsive navigation, footer, privacy policy, and contact page

## Technology

- Node.js 20+
- Express and EJS
- MongoDB with Mongoose
- Razorpay
- Nodemailer
- PDFKit and QRCode

## Project structure

```text
app.js                 Express application composition
server.js              Database, HTTP server, and shutdown lifecycle
config/                Environment, database, and session configuration
controllers/           HTTP handlers grouped by application feature
data/                  Metro network and station reference data
middleware/            Authentication, security, locals, and error handling
models/                 Mongoose schemas and models
routes/                 Feature routers composed by routes/index.js
services/               External integrations and domain services
utils/                  Small stateless formatting helpers
public/                 Browser JavaScript, styles, and static media
views/                  EJS pages and reusable partials
```

Keep URL and middleware declarations in routes, request handlers in controllers,
reusable business logic in services, persistence definitions in models, and process
startup in `server.js`.

The route layer is separated by responsibility:

```text
routes/index.js         Single route aggregator used by app.js
routes/pages.js         Public pages and passenger information
routes/auth.js          Registration, login, and logout
routes/profile.js       Passenger profile
routes/tickets.js       Fare calculation and ticket views
routes/admin.js         Administrator authentication and reporting
routes/api.js           Map, station, and payment API endpoints
```

Each feature router delegates to its matching controller (for example,
`routes/tickets.js` delegates to `controllers/ticketsController.js`). Shared login
throttling lives in middleware, while payment, email delivery, and external map
access live in services.

## Local setup

1. Install Node.js 20 or newer and MongoDB.
2. Clone the repository and install dependencies:

   ```bash
   npm ci
   ```

3. Copy `.env.example` to `.env` and replace the example values.
4. Start the application:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

Run the validation checks with:

```bash
npm run check
```

## Environment variables

| Variable | Required in production | Purpose |
|---|---:|---|
| `MONGO_URL` | Yes | MongoDB connection string |
| `NODE_ENV` | Yes | Set to `production` when deployed |
| `SESSION_SECRET` | Yes | Random secret of at least 32 characters |
| `ADMIN_EMAIL` | Yes | Administrator login email |
| `ADMIN_PASSWORD_HASH` | Yes | Bcrypt hash of the administrator password |
| `RAZORPAY_KEY_ID` | For payments | Razorpay public key |
| `RAZORPAY_KEY_SECRET` | For payments | Razorpay secret key |
| `EMAIL_USER` | For email | Gmail/SMTP account used to send tickets |
| `EMAIL_PASS` | For email | Google app password, not the account password |
| `SUPPORT_EMAIL` | Recommended | Address displayed on contact and footer pages |
| `TICKET_VALID_MINUTES` | No | Ticket validity; defaults to `180` |
| `IMAGEKIT_URL_ENDPOINT` | No | Optional public media delivery endpoint |

Generate an admin password hash locally:

```bash
node -e "console.log(require('bcryptjs').hashSync('replace-with-a-strong-password', 12))"
```

Never commit `.env`, API keys, database credentials, app passwords, or generated session secrets.

## Free-tier deployment

The included [`render.yaml`](render.yaml) configures a Render web service. A MongoDB Atlas M0 cluster can provide the database.

1. Create an Atlas M0 cluster, database user, and network access rule.
2. Push this repository to GitHub.
3. In Render, create a Blueprint and select this repository.
4. Enter every environment variable marked `sync: false`.
5. Deploy and confirm that `/health` returns an `ok` status.

Render free services have an ephemeral filesystem, but this application stores persistent account, session, and ticket data in MongoDB. Generated PDFs are streamed directly and do not require persistent disk storage.

### Email limitation on Render Free

Render Free blocks common outbound SMTP ports, so the current Gmail/Nodemailer transport cannot deliver ticket emails there. The rest of the application works without email configuration. Before relying on production email, replace SMTP delivery with an HTTPS transactional-email API or select a host that permits the configured mail transport.

## GitHub publishing

After creating an empty GitHub repository:

```bash
git init
git add .
git commit -m "Initial Ahmedabad Metro application"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Review the staged files before committing with `git status` and confirm that `.env` is not listed.

## Disclaimer

This project is an independent passenger-information application. Verify fares, schedules, service alerts, and branding permissions with the relevant metro authority before public or commercial use.

## License

Licensed under the [MIT License](LICENSE).
