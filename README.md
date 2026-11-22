# hms_demo

Interactive front-end demo of **HMS Cloud** — a multi-tenant Hospital Management System.

**Live demo:** https://sudipto-tales.github.io/hms_demo/

- `index.html` — sign-in (the site opens here; admin: `admin` / `Admin@123`, security answer `Pune`)
- `verify.html` — phone verification page opened from the sign-in QR code
- `dashboard.html` — admin dashboard (staff, roles, care, HR, billing, subscription, account, payments)

Signing in keeps you signed in on this browser for 8 hours, or until you use **Sign out**. Opening `dashboard.html` without a session sends you back to sign-in.

Plain HTML + Tailwind (CDN) + vanilla JS. No build step and no backend: all data is fictional and lives in memory.
Payment gateway keys, bank details and OTPs in the demo are random look-alikes — nothing is sent anywhere.
Payment, account and gateway pages are behind a 6-digit PIN: any 6 digits work in the demo.
