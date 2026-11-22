# hms_demo

Interactive front-end demo of **HMS Cloud** — a multi-tenant Hospital Management System.

**Live demo:** https://sudipto-tales.github.io/hms_demo/

- `index.html` — admin dashboard (staff, roles, care, HR, billing, subscription, account, payments)
- `login.html` / `verify.html` — sign-in flows (admin: `admin` / `Admin@123`, security answer `Pune`)

Plain HTML + Tailwind (CDN) + vanilla JS. No build step and no backend: all data is fictional and lives in memory.
Payment gateway keys, bank details and OTPs in the demo are random look-alikes — nothing is sent anywhere.
Payment, account and gateway pages are behind a 6-digit PIN: any 6 digits work in the demo.
