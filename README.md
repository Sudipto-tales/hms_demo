# hms_demo

Interactive front-end demo of **HMS Cloud** — a multi-tenant Hospital Management System.

**Live demo:** https://sudipto-tales.github.io/hms_demo/

Pages (on GitHub Pages they open without `.html`, e.g. `/hms_demo/dashboard`):

- `/` (`index.html`) — sign-in
- `/verify` — phone verification page opened from the sign-in QR code
- `/dashboard` — the app (staff, roles, care, pharmacy, HR, billing, subscription, account, payments)
- `/card#…` — a patient's health card on its own, opened by scanning the QR on the back of the card

Demo logins:

| Login | Password | Notes |
| --- | --- | --- |
| `admin` | `Admin@123` | security answer `Pune` |
| `doctor` | `Doctor@123` | |
| `reception` | `Front@123` | |
| `pharmacy` | `Pharma@123` | a pharmacy is one system with a single login |

Use **View as** in the header to switch to any role, including Pharmacy and Patient.

## What to try

- **Paper prescriptions** — front desk or doctor photographs the prescription (camera or file/PDF). It is saved on the patient profile and portal and sent to the chosen pharmacy.
- **Pharmacies** — the admin adds pharmacies (each gets exactly one login), pauses them, and compares sales and revenue. A pharmacy login sees only its queue, dispenses and issues payment slips.
- **Invoice templates** — Payments › Invoice Template: Classic (with logo), Minimal (no logo) or Modern (colour band). Used for invoices, receipts and pharmacy slips.
- **Health card** — patient profile › Overview, or My Health Card in the portal. Tap to flip; the QR opens the card on any phone.
- **Bills** — unpaid bills show a floating pay button (patient portal) or a Collect button (patient profile).
- **Media storage** — user menu › Media storage: keep downloads on the device or point them to a Google Drive / OneDrive / Dropbox folder link.
- **Assistant** — the floating robot bottom-right answers questions and jumps to the right page.

Signing in keeps you signed in on this browser for 8 hours, or until you use **Sign out**. Opening the dashboard without a session sends you back to sign-in.

Plain HTML + Tailwind (CDN) + vanilla JS. No build step and no backend: all data is fictional and lives in memory.
Payment gateway keys, bank details and OTPs in the demo are random look-alikes — nothing is sent anywhere.
Payment, account and gateway pages are behind a 6-digit PIN: any 6 digits work in the demo.
Clean URLs: `assets/route.js` links pages without `.html` on a real host and keeps the file names when opened from disk or `localhost`.
Not built yet: pharmacy medicine bulk upload (CSV / Excel), purchase orders and stock.
