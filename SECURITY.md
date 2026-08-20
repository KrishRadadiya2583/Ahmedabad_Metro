# Security Policy

## Reporting a vulnerability

Please do not publish security vulnerabilities in a public issue. Report them privately to the project owner or to the address configured as `SUPPORT_EMAIL` in the deployed application.

Include the affected route, reproduction steps, potential impact, and any suggested mitigation. Never include real passwords, payment secrets, session cookies, or customer information.

## Secret handling

- Never commit `.env` or provider credentials.
- Configure production secrets in the hosting provider's environment settings.
- Rotate any credential immediately if it is accidentally exposed.
- Use Razorpay test keys outside production.
- Use a unique session secret containing at least 32 characters.
