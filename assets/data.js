/* HMS demo — sample data and configuration.
 * Everything here is fictional test data. Mirrors the planning docs:
 *   tenants + branches (Doc 01/05), roles & permissions (Doc 05 §4), modules + plans (Doc 03),
 *   staff vs user (Doc 02 §B), notification channels (Doc 07).
 *
 * Three separate ideas for people who work at the hospital:
 *   - Employee (Staff)  : everyone on the payroll. `type` = their job (Doctor, Nurse, HR…).
 *   - Role              : a bundle of permissions = what they may do in HMS.
 *   - Login (User)      : optional account to sign in. Not every employee needs one.
 * Patients are NOT employees; they only ever see the patient portal.
 */

/* ---------- Modules & plans (Doc 03) ---------- */
const MODULES = [
  { key: 'patients',      label: 'Patient Registry',       phase: 'Core' },
  { key: 'billing',       label: 'Billing & Payments',     phase: 'Core' },
  { key: 'appointments',  label: 'Appointments / OPD',     phase: 'Phase 1' },
  { key: 'emr',           label: 'EMR / Consultations',    phase: 'Phase 1' },
  { key: 'prescriptions', label: 'Prescriptions',          phase: 'Phase 1' },
  { key: 'lab',           label: 'Laboratory (LIS)',       phase: 'Phase 2' },
  { key: 'pharmacy',      label: 'Pharmacy & Inventory',   phase: 'Phase 2' },
  { key: 'radiology',     label: 'Radiology (RIS)',        phase: 'Phase 2' },
  { key: 'reports',       label: 'Reports & Analytics',    phase: 'Phase 2' },
  { key: 'ipd',           label: 'IPD / Bed Management',   phase: 'Phase 3' },
  { key: 'emergency',     label: 'Emergency',              phase: 'Phase 3' },
  { key: 'hr',            label: 'HR, Attendance & Payroll', phase: 'Phase 3' },
];
const CORE_MODULES = ['patients', 'billing'];

const PLANS = {
  starter: { label: 'Clinic Starter', modules: ['patients', 'billing', 'appointments', 'emr', 'prescriptions'] },
  pro:     { label: 'Hospital Pro',   modules: MODULES.map(m => m.key) },
};

/* ---------- Permissions (action:resource) ---------- */
const PERMISSIONS = [
  { group: 'Staff & access', icon: 'id-card', items: [
    ['staff:read', 'View employees'], ['staff:create', 'Add employees'], ['staff:update', 'Edit employee details'],
    ['staff:deactivate', 'Deactivate employees'], ['credential:issue', 'Create logins & reset passwords'],
    ['role:assign', 'Assign roles to employees'], ['role:manage', 'Create & edit roles'] ] },
  { group: 'HR & payroll', icon: 'briefcase', module: 'hr', items: [
    ['attendance:read', 'View attendance'], ['attendance:record', 'Record attendance'], ['attendance:approve', 'Approve corrections'],
    ['leave:approve', 'Approve leave'], ['shift:manage', 'Manage shifts & rosters'],
    ['payroll:read', 'View payroll'], ['payroll:process', 'Run payroll'], ['payslip:publish', 'Publish payslips'] ] },
  { group: 'Patients & appointments', icon: 'calendar-check', items: [
    ['patient:read', 'View patients'], ['patient:create', 'Register patients'], ['doctor:read', 'View doctors & schedules'],
    ['appointment:read', 'View appointments'], ['appointment:create', 'Book & reschedule'], ['appointment:cancel', 'Cancel appointments'] ] },
  { group: 'Clinical', icon: 'stethoscope', items: [
    ['encounter:write', 'Consultations & notes'], ['prescription:write', 'Write prescriptions'], ['prescription:upload', 'Upload paper prescriptions'], ['lab:order', 'Order lab & imaging'],
    ['bed:manage', 'Admit, transfer, discharge'], ['emergency:manage', 'Emergency triage'], ['pharmacy:manage', 'Pharmacy stock & dispensing'] ] },
  { group: 'Billing & finance', icon: 'receipt', items: [
    ['invoice:create', 'Create invoices'], ['payment:collect', 'Collect payments'], ['payment:refund', 'Issue refunds'], ['report:finance', 'Financial reports'] ] },
  { group: 'Administration', icon: 'settings', items: [
    ['settings:manage', 'Hospital settings & departments'], ['channels:manage', 'Communication channels'], ['audit:read', 'View audit log'] ] },
];
const ALL_PERMS = PERMISSIONS.flatMap(g => g.items.map(i => i[0]));
const PERM_LABEL = Object.fromEntries(PERMISSIONS.flatMap(g => g.items));

/* ---------- Tenant roles (permission bundles; each hospital can edit/clone) ---------- */
const TENANT_ROLES = {
  admin:        { label: 'Admin',            system: true, locked: true, desc: 'Full access to this hospital. Cannot be edited.', perms: '*' },
  hr_manager:   { label: 'HR Manager',       system: true, desc: 'Employees, attendance, leave and payroll',
                  perms: ['staff:read', 'staff:create', 'staff:update', 'attendance:read', 'attendance:record', 'attendance:approve', 'leave:approve', 'shift:manage', 'payroll:read', 'payroll:process', 'payslip:publish'] },
  receptionist: { label: 'Receptionist',     system: true, desc: 'Front desk: patients, appointments, invoices',
                  perms: ['patient:read', 'patient:create', 'doctor:read', 'appointment:read', 'appointment:create', 'appointment:cancel', 'invoice:create', 'prescription:upload'] },
  accountant:   { label: 'Accountant',       system: true, desc: 'Billing, collections, refunds and payroll view',
                  perms: ['invoice:create', 'payment:collect', 'payment:refund', 'report:finance', 'payroll:read'] },
  doctor:       { label: 'Doctor',           system: true, desc: 'Consultations, prescriptions, orders',
                  perms: ['patient:read', 'doctor:read', 'appointment:read', 'encounter:write', 'prescription:write', 'prescription:upload', 'lab:order', 'bed:manage'] },
  nurse:        { label: 'Nurse',            system: true, desc: 'Ward care, vitals, emergency triage',
                  perms: ['patient:read', 'appointment:read', 'bed:manage', 'emergency:manage', 'prescription:upload'] },
  pharmacist:   { label: 'Pharmacy account', system: true, desc: 'One login per pharmacy: prescriptions sent to it, dispensing and its own sales slips',
                  perms: ['pharmacy:manage'] },
  lab_tech:     { label: 'Lab Technician',   system: true, desc: 'Lab orders and results',
                  perms: ['patient:read', 'lab:order'] },
  employee:     { label: 'Employee (basic)', system: true, desc: 'Self-service only: own attendance, leave and payslips', perms: [] },
};

/* ---------- Job types (what someone does) → suggested role ---------- */
const STAFF_TYPES = [
  { key: 'Doctor',         icon: 'stethoscope',    tone: 'teal',    role: 'doctor',       desc: 'Consultants, residents, surgeons' },
  { key: 'Nurse',          icon: 'heart-pulse',    tone: 'rose',    role: 'nurse',        desc: 'Ward, ICU and OPD nursing' },
  { key: 'HR',             icon: 'briefcase',      tone: 'violet',  role: 'hr_manager',   desc: 'Hiring, attendance, payroll' },
  { key: 'Receptionist',   icon: 'concierge-bell', tone: 'sky',     role: 'receptionist', desc: 'Front desk and appointments' },
  { key: 'Accountant',     icon: 'calculator',     tone: 'amber',   role: 'accountant',   desc: 'Billing and finance' },
  { key: 'Pharmacist',     icon: 'pill',           tone: 'emerald', role: 'pharmacist',   desc: 'Pharmacy counter and stock' },
  { key: 'Lab Technician', icon: 'flask-round',    tone: 'sky',     role: 'lab_tech',     desc: 'Samples and results' },
  { key: 'Administration', icon: 'building-2',     tone: 'slate',   role: 'admin',        desc: 'Hospital management' },
  { key: 'Support Staff',  icon: 'hard-hat',       tone: 'slate',   role: 'employee',     desc: 'Ward attendants, housekeeping, security' },
];
const DEPARTMENTS = ['Cardiology', 'Pediatrics', 'Orthopedics', 'Dermatology', 'General Medicine', 'Gynecology', 'ENT', 'Nursing', 'Front Office', 'Human Resources', 'Accounts', 'Pharmacy', 'Laboratory', 'Administration', 'Facilities'];

/* ---------- Demo personas (the "View as" switcher) ---------- */
const ROLES = {
  admin:        { label: 'Admin',        person: 'Dr. Anita Sen', title: 'Hospital Admin', tenantRole: 'admin',        icon: 'shield-check',   tone: 'teal',    desc: 'Runs the hospital: staff, roles, settings' },
  hr:           { label: 'HR',           person: 'Neha Gupta',    title: 'HR Manager',     tenantRole: 'hr_manager',   icon: 'briefcase',      tone: 'violet',  desc: 'Employees, attendance, payroll' },
  receptionist: { label: 'Receptionist', person: 'Priya Das',     title: 'Front Desk',     tenantRole: 'receptionist', icon: 'concierge-bell', tone: 'sky',     desc: 'Patients, appointments, invoices' },
  accountant:   { label: 'Accountant',   person: 'Amit Roy',      title: 'Accountant',     tenantRole: 'accountant',   icon: 'calculator',     tone: 'amber',   desc: 'Billing, collections, payroll view' },
  doctor:       { label: 'Doctor',       person: 'Dr. Arjun Rao', title: 'Cardiologist',   tenantRole: 'doctor',       icon: 'stethoscope',    tone: 'emerald', desc: 'Consultations and prescriptions' },
  employee:     { label: 'Employee',     person: 'Bablu Mondal',  title: 'Ward Attendant', tenantRole: 'employee',     icon: 'user',           tone: 'slate',   desc: 'Self-service: attendance, leave, payslips' },
  pharmacy:     { label: 'Pharmacy',     person: 'Main Pharmacy', title: 'Pharmacy account', tenantRole: 'pharmacist', icon: 'pill', tone: 'emerald', desc: 'One login per pharmacy: prescriptions and sales', system: true, pharmacy: 'PH-01' },
  patient:      { label: 'Patient',      person: 'Rahul Sharma',  title: 'Patient', tenantRole: null,     icon: 'heart',          tone: 'rose',    desc: 'Patient portal: visits, reports, bills' },
};

/* ---------- Navigation (filtered by modules + role permissions) ---------- */
const NAV = [
  { group: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', children: [
      { id: 'dashboard:overview',  label: 'Overview' },
      { id: 'dashboard:clinical',  label: 'Clinical Overview', module: 'emr',     perm: 'encounter:write' },
      { id: 'dashboard:analytics', label: 'Analytics',         module: 'reports', perm: 'report:finance' },
    ]},
  ]},
  { group: 'People', items: [
    { id: 'staff', label: 'Staff & Users', icon: 'id-card', perm: 'staff:read', children: [
      { id: 'staff:list',  label: 'All Employees' },
      { id: 'staff:new',   label: 'Add Employee',        perm: 'staff:create' },
      { id: 'staff:roles', label: 'Roles & Permissions', perm: 'role:manage' },
    ]},
    { id: 'doctors', label: 'Doctors', icon: 'stethoscope', perm: 'doctor:read', children: [
      { id: 'doctors:list',      label: 'All Doctors' },
      { id: 'doctors:schedules', label: 'Schedules' },
    ]},
    { id: 'patients', label: 'Patients', icon: 'users', module: 'patients', perm: 'patient:read', children: [
      { id: 'patients:list', label: 'All Patients' },
      { id: 'patients:new',  label: 'Register Patient', perm: 'patient:create' },
    ]},
  ]},
  { group: 'Care', items: [
    { id: 'appointments', label: 'Appointments', icon: 'calendar-check', module: 'appointments', perm: 'appointment:read', children: [
      { id: 'appointments:calendar', label: 'Calendar' },
      { id: 'appointments:queue',    label: 'OPD Queue' },
    ]},
    { id: 'departments',   label: 'Departments',   icon: 'building-2',     perm: 'settings:manage' },
    { id: 'consultations', label: 'Consultations', icon: 'clipboard-list', module: 'emr',           perm: 'encounter:write' },
    { id: 'prescriptions', label: 'Prescriptions', icon: 'file-text',      module: 'prescriptions', perm: 'prescription:write|prescription:upload' },
    { id: 'laboratory',    label: 'Laboratory',    icon: 'flask-round',    module: 'lab',           perm: 'lab:order' },
    { id: 'radiology',     label: 'Radiology',     icon: 'scan-line',      module: 'radiology',     perm: 'lab:order' },
    { id: 'pharmacy',      label: 'Pharmacy',      icon: 'pill',           module: 'pharmacy',      perm: 'pharmacy:manage', children: [
      { id: 'pharmacy:queue', label: 'Prescriptions' },
      { id: 'pharmacy:sales', label: 'Sales & Slips' },
    ]},
  ]},
  { group: 'HR & Payroll', items: [
    { id: 'attendance', label: 'Attendance',       icon: 'user-check',   module: 'hr', perm: 'attendance:read' },
    { id: 'leave',      label: 'Leave Requests',   icon: 'calendar-off', module: 'hr', perm: 'leave:approve' },
    { id: 'payroll',    label: 'Payroll',          icon: 'wallet',       module: 'hr', perm: 'payroll:read' },
    { id: 'shifts',     label: 'Shift Management', icon: 'clock',        module: 'hr', perm: 'shift:manage' },
  ]},
  { group: 'Operations', items: [
    { id: 'billing',   label: 'Billing & Payments', icon: 'receipt',    module: 'billing',   perm: 'invoice:create' },
    { id: 'beds',      label: 'Bed Management',     icon: 'bed-double', module: 'ipd',       perm: 'bed:manage' },
    { id: 'emergency', label: 'Emergency',          icon: 'siren',      module: 'emergency', perm: 'emergency:manage', badge: 'emergency' },
  ]},
  { group: 'Administration', items: [
    { id: 'pharmacies', label: 'Pharmacies',  icon: 'store',       module: 'pharmacy', perm: 'settings:manage' },
    { id: 'channels', label: 'Communication', icon: 'send',        perm: 'channels:manage' },
    { id: 'settings', label: 'Settings',      icon: 'settings',    perm: 'settings:manage' },
    { id: 'subscription', label: 'Subscription',    icon: 'gem',         perm: 'settings:manage' },
    { id: 'account',      label: 'Account Details', icon: 'landmark',    perm: 'settings:manage' },
    { id: 'payments',     label: 'Payments',        icon: 'credit-card', perm: 'report:finance', children: [
      { id: 'payments:gateways', label: 'Payment Gateways', perm: 'settings:manage' },
      { id: 'payments:sheet',    label: 'Payment Sheet' },
      { id: 'payments:links',    label: 'Payment Links', perm: 'payment:collect' },
      { id: 'payments:invoice',  label: 'Invoice Template', perm: 'settings:manage' },
    ]},
    { id: 'audit',    label: 'Audit Log',     icon: 'scroll-text', perm: 'audit:read' },
  ]},
  { group: 'My Work', self: true, items: [
    { id: 'me:attendance', label: 'My Attendance', icon: 'fingerprint' },
    { id: 'me:leave',      label: 'My Leave',      icon: 'plane' },
    { id: 'me:payslips',   label: 'My Payslips',   icon: 'file-badge' },
  ]},
];

/* Patients never see the staff menu — they get the portal. */
const PATIENT_NAV = [
  { group: 'My Health', patient: true, items: [
    { id: 'dashboard:overview', label: 'Home',             icon: 'house' },
    { id: 'my:appointments',    label: 'My Appointments',  icon: 'calendar-check' },
    { id: 'my:prescriptions',   label: 'Prescriptions',    icon: 'file-text' },
    { id: 'my:card',            label: 'My Health Card',   icon: 'id-card' },
    { id: 'my:reports',         label: 'Lab Reports',      icon: 'flask-round' },
    { id: 'my:bills',           label: 'Bills & Payments', icon: 'receipt' },
  ]},
];

/* What each screen will do — shown on placeholder pages and in the test panel. */
const PAGE_INFO = {
  dashboard:     { title: 'Dashboard', desc: 'Hospital overview and today’s activity, scoped to the current tenant and branch.', phase: 'Core',
                   features: ['KPI cards that hide when a module is off or the role lacks permission', 'Admin setup checklist: staff, roles, logins, payroll', 'Patient, appointment and revenue charts', 'Today’s appointment queue with quick actions'] },
  'dashboard:clinical':  { title: 'Clinical Overview', desc: 'Encounters, diagnoses and pending lab work across departments.', phase: 'Phase 1',
                   features: ['Open encounters by department', 'Top diagnoses (ICD-10) this month', 'Pending lab and radiology orders', 'Critical results awaiting review'] },
  'dashboard:analytics': { title: 'Analytics', desc: 'Financial and operational reports for this hospital only.', phase: 'Phase 2',
                   features: ['Revenue by department and service', 'Doctor productivity and footfall', 'Outstanding dues and collections', 'Export to PDF / CSV'] },
  staff:         { title: 'Staff & Users', desc: 'Every person who works here is an employee. Job type says what they do; role says what they can do in HMS; a login is optional.', phase: 'Core',
                   features: ['Add employees of any job type — doctors and nurses included', 'Assign a role (permission bundle) per branch', 'Create login credentials and send them on WhatsApp / email', 'Reset passwords, disable logins, deactivate employees'] },
  'staff:roles': { title: 'Roles & Permissions', desc: 'Build roles from action:resource permissions. Changes apply to everyone with that role immediately.', phase: 'Core',
                   features: ['System roles to start from: Admin, HR Manager, Doctor, Nurse…', 'Create custom roles or clone existing ones', 'Permission picker grouped by module', 'Plan limits which permissions exist'] },
  patients:      { title: 'Patients', desc: 'One patient record per tenant, shared across branches; visits stay branch-scoped.', phase: 'Core',
                   features: ['Register and search patients by MRN, phone or name', 'Identifiers, next of kin and insurance policies', 'Visit history across all branches', 'Consent capture for DPDP'] },
  doctors:       { title: 'Doctors', desc: 'Doctors are employees with job type “Doctor” plus clinical details.', phase: 'Core',
                   features: ['Specialty, registration number, consultation fee', 'Weekly schedules, leave and slot rules', 'Branch and department assignment', 'Login and role managed like any employee'] },
  appointments:  { title: 'Appointments', desc: 'Booking, calendar and OPD queue — booked → checked-in → completed.', phase: 'Phase 1',
                   features: ['Walk-in, phone and online booking', 'Live OPD queue with check-in', 'Reschedule / cancel with patient notification', 'WhatsApp / SMS reminders via configured channel'] },
  departments:   { title: 'Departments', desc: 'Departments per branch (OPD, IPD, Lab, Radiology, Pharmacy…).', phase: 'Core',
                   features: ['Create departments per branch', 'Assign head of department', 'Link wards, rooms and services'] },
  consultations: { title: 'Consultations (EMR)', desc: 'Vitals, clinical notes and diagnoses on each encounter. Notes are versioned, never overwritten.', phase: 'Phase 1',
                   features: ['Vitals capture', 'Complaint / history / exam / plan notes', 'ICD-10 diagnoses', 'Versioned, append-only records'] },
  prescriptions: { title: 'Prescriptions', desc: 'e-Prescribing linked to the encounter and the pharmacy.', phase: 'Phase 1',
                   features: ['Drug, dose, frequency, duration', 'Upload the paper prescription with the camera, a scan or a PDF', 'Saved on the patient profile and portal', 'Send to in-house pharmacy for dispensing'] },
  laboratory:    { title: 'Laboratory (LIS)', desc: 'Test orders, sample tracking, results and verified reports.', phase: 'Phase 2',
                   features: ['Order tests from the encounter', 'Results with reference ranges and flags', 'Verification before release', 'Report delivery by email'] },
  radiology:     { title: 'Radiology (RIS)', desc: 'Imaging orders and reports.', phase: 'Phase 2',
                   features: ['Modality and body-part orders', 'Report with image references', 'Critical finding alerts'] },
  pharmacy:      { title: 'Pharmacy', desc: 'Each pharmacy is one system with a single login. It sees the prescriptions sent to it, dispenses them and issues payment slips.', phase: 'Phase 2',
                   features: ['Prescriptions sent to this pharmacy — typed or photographed', 'Dispense and issue a payment slip', 'Collect cash / UPI / card or leave it for the patient to pay online', 'Later: medicine master bulk upload (CSV / Excel), purchase orders and stock'] },
  pharmacies:    { title: 'Pharmacies', desc: 'Admin view of every pharmacy: logins, status and sales analytics.', phase: 'Phase 2',
                   features: ['Add a pharmacy — it gets exactly one login', 'Reset the login, pause or reactivate a pharmacy', 'Sales, collections and dues per pharmacy', 'Compare pharmacies side by side'] },
  attendance:    { title: 'Attendance', desc: 'Daily attendance for every employee, by branch and shift.', phase: 'Phase 3',
                   features: ['Check-in / check-out (biometric or app)', 'Late, half-day and absent rules', 'Corrections with approval', 'Feeds payroll automatically'] },
  leave:         { title: 'Leave Requests', desc: 'Leave balances, requests and approvals.', phase: 'Phase 3',
                   features: ['Leave types and yearly quotas', 'Apply from My Leave, approve here', 'Clash check against duty roster'] },
  payroll:       { title: 'Payroll', desc: 'Monthly salary run from attendance, leave and salary structure.', phase: 'Phase 3',
                   features: ['Salary structure per employee', 'Attendance-based pay calculation', 'PF / ESI / TDS deductions', 'Publish payslips to My Payslips'] },
  shifts:        { title: 'Shift Management', desc: 'Duty rosters for doctors, nurses and staff.', phase: 'Phase 3',
                   features: ['Shift templates', 'Weekly roster', 'Swap requests and approvals'] },
  billing:       { title: 'Billing & Payments', desc: 'Invoices, payments, refunds and daily cash reports.', phase: 'Core',
                   features: ['Invoices from consultation, lab, pharmacy and bed charges', 'Cash, card and UPI payments', 'Refunds as a separate audited permission', 'Daily collection report'] },
  beds:          { title: 'Bed Management', desc: 'Live bed board, admissions, transfers and discharge.', phase: 'Phase 3',
                   features: ['Ward and bed board', 'Admit, transfer and discharge', 'Bed tariff added to the invoice', 'Discharge summary'] },
  emergency:     { title: 'Emergency', desc: 'Fast triage and registration for emergency cases.', phase: 'Phase 3',
                   features: ['Quick registration with minimal fields', 'Triage level and bay assignment', 'Alerts to on-call doctors'] },
  channels:      { title: 'Communication Channels', desc: 'Route each message purpose to a channel, provider and credentials.', phase: 'Core',
                   features: ['Email / SMS / WhatsApp providers', 'Purpose routing: OTP, appointments, reports, marketing', 'Send-test before going live', 'Encrypted, masked credentials'] },
  settings:      { title: 'Settings', desc: 'Hospital profile, branches, tax rules and tariffs.', phase: 'Core',
                   features: ['Hospital profile and registration numbers', 'Tax rules and service catalog', 'Working hours and holidays', 'Single-session and security policy'] },
  subscription:  { title: 'Subscription', desc: 'Your HMS plan, usage, billing cycle and GST invoices.', phase: 'Core',
                   features: ['Upgrade / downgrade with proration', 'Usage against plan limits', 'Card & e-mandate for auto-renew', 'Download GST invoices'] },
  account:       { title: 'Account Details', desc: 'Legal entity, billing contact, settlement bank account and owner login.', phase: 'Core',
                   features: ['PAN / GSTIN with validation', 'Billing address for invoices', 'Bank account with penny-drop verification', 'Owner 2-step verification'] },
  payments:      { title: 'Payments', desc: 'Online payment gateways and the full payment sheet.', phase: 'Core',
                   features: ['Connect Razorpay, Stripe, Cashfree, PayU, PhonePe, Paytm', 'Test / live keys, webhooks, routing rules', 'Payment sheet with fees, GST and net', 'Settlements and CSV export'] },
  audit:         { title: 'Audit Log', desc: 'Append-only record of who did what, when, and in which branch.', phase: 'Core',
                   features: ['Every patient-data read/write', 'Logins, password resets, role changes', 'Filter by user, action, date', 'Export for compliance (DPDP)'] },
  me:            { title: 'My Work', desc: 'Self-service for every employee, whatever their role.', phase: 'Phase 3',
                   features: ['Check in / out and see my attendance', 'Apply for leave and see balance', 'Download monthly payslips', 'Update my contact details'] },
  my:            { title: 'Patient Portal', desc: 'What a patient sees after signing in with OTP.', phase: 'Phase 4',
                   features: ['Upcoming and past appointments', 'Prescriptions and lab reports to download', 'Bills and online payment', 'Book a new appointment'] },
  portal:        { title: 'Patient Portal', desc: 'Patients sign in with mobile OTP and see only their own records.', phase: 'Phase 4',
                   features: ['Upcoming appointments and booking', 'Prescriptions and lab reports', 'Bills and online payment', 'Family members on one account'] },
};

/* ---------- Tenants (Doc 05) ---------- */
const scale = (arr, f) => arr.map(v => Math.round(v * f));
const cloneRoles = () => JSON.parse(JSON.stringify(TENANT_ROLES));

const SUN_SERIES = {
  weekly:  { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
             admitted: [42, 51, 47, 58, 62, 38, 29], discharged: [35, 40, 44, 47, 50, 33, 25] },
  monthly: { labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
             admitted: [182, 196, 205, 199, 238, 262, 288], discharged: [150, 168, 176, 181, 195, 212, 229] },
  yearly:  { labels: ['2020', '2021', '2022', '2023', '2024', '2025', '2026'],
             admitted: [1420, 1780, 2150, 2410, 2690, 2980, 3270], discharged: [1180, 1500, 1850, 2120, 2400, 2650, 2890] },
};
const SUN_REVENUE = [24500, 31200, 28900, 35400, 30100, 22800, 18600, 27300, 33800, 31500, 38900, 34200, 25400, 21700];

/* emp(id, name, type, dept, role, login, lastLogin, extra) */
function emp(id, name, type, dept, role, login, lastLogin, extra = {}) {
  const user = name.replace(/^Dr\.\s*/, '').toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.');
  return { id, name, type, dept, role, login, lastLogin, branch: 0, active: login !== 'deactivated',
           username: login === 'none' ? '' : user, phone: '98' + String(30000000 + (parseInt(id.replace(/\D/g, ''), 10) * 7919) % 69999999).padStart(8, '0'),
           email: user + '@example.com', joined: extra.joined || '2024-04-01', ...extra };
}

function makeTenants() {
  return {
    sun: {
      name: 'Sun Hospital', slug: 'sun', plan: 'pro',
      branches: ['Main Branch · Salt Lake', 'North Wing Clinic · Dum Dum'],
      stats: { patients: 3482, doctors: 186, appts: 248, revenue: 842100, beds: 42, emergency: 7, staff: 412, present: 356, onleave: 18, payroll: 4820000 },
      trends: { patients: ['+8.2%', 1], doctors: ['+2.1%', 1], appts: ['+12%', 1], revenue: ['-1.4%', 0], beds: ['+5', 1], emergency: ['+3', 0],
                staff: ['+6', 1], present: ['86%', 1], onleave: ['+4', 0], payroll: ['+2.3%', 1] },
      breakdown: { confirmed: 104, pending: 45, completed: 77, cancelled: 22 },
      series: JSON.parse(JSON.stringify(SUN_SERIES)),
      revenue: SUN_REVENUE.slice(),
      roles: cloneRoles(),
      wards: [
        { name: 'General Ward', occ: 48, total: 60 },
        { name: 'ICU',          occ: 14, total: 16 },
        { name: 'Private Rooms', occ: 18, total: 30 },
        { name: 'Maternity',    occ: 12, total: 20 },
        { name: 'Pediatric',    occ: 10, total: 18 },
      ],
      employees: [
        emp('EMP-1001', 'Dr. Anita Sen',    'Administration', 'Administration',  'admin',        'active',  'Today, 08:12', { joined: '2019-01-10' }),
        emp('EMP-1002', 'Neha Gupta',       'HR',             'Human Resources', 'hr_manager',   'active',  'Today, 09:02', { joined: '2021-06-14' }),
        emp('EMP-1003', 'Priya Das',        'Receptionist',   'Front Office',    'receptionist', 'active',  'Today, 08:47', { joined: '2022-02-01' }),
        emp('EMP-1004', 'Amit Roy',         'Accountant',     'Accounts',        'accountant',   'active',  'Yesterday, 18:30', { joined: '2020-11-20' }),
        emp('EMP-1010', 'Dr. Arjun Rao',    'Doctor', 'Cardiology',  'doctor', 'active',  'Today, 08:55', { spec: 'Cardiology',  reg: 'WBMC-48213', fee: 900, duty: 'In OPD',     seen: 14, joined: '2020-03-02' }),
        emp('EMP-1011', 'Dr. Kavita Menon', 'Doctor', 'Pediatrics',  'doctor', 'active',  'Today, 09:10', { spec: 'Pediatrics',  reg: 'WBMC-51877', fee: 700, duty: 'In OPD',     seen: 11 }),
        emp('EMP-1012', 'Dr. Vikram Singh', 'Doctor', 'Orthopedics', 'doctor', 'active',  'Today, 07:40', { spec: 'Orthopedics', reg: 'WBMC-39920', fee: 1000, duty: 'In surgery', seen: 6 }),
        emp('EMP-1013', 'Dr. Sana Qureshi', 'Doctor', 'Dermatology', 'doctor', 'active',  'Today, 10:05', { spec: 'Dermatology', reg: 'WBMC-60114', fee: 800, duty: 'On break',   seen: 9 }),
        emp('EMP-1020', 'Mary Joseph',      'Nurse',          'Nursing',         'nurse',        'active',  'Today, 07:58'),
        emp('EMP-1021', 'Ritika Pal',       'Nurse',          'Nursing',         'nurse',        'invited', '—', { joined: '2026-11-18' }),
        emp('EMP-1030', 'Sanjay Kumar',     'Pharmacist',     'Pharmacy',        'pharmacist',   'active',  'Today, 09:30'),
        emp('EMP-1031', 'Farida Begum',     'Lab Technician', 'Laboratory',      'lab_tech',     'active',  'Yesterday, 16:12'),
        emp('EMP-1040', 'Bablu Mondal',     'Support Staff',  'Facilities',      'employee',     'active',  'Today, 06:55'),
        emp('EMP-1041', 'Ramesh Das',       'Support Staff',  'Facilities',      'employee',     'none',    '—'),
        emp('EMP-1042', 'Kalpana Hazra',    'Support Staff',  'Facilities',      'employee',     'disabled', '2 Oct 2026'),
      ],
      get doctors() { return this.employees.filter(e => e.type === 'Doctor' && e.active); },
      appointments: [
        { id: 'A-1041', time: '09:00', patient: 'Rahul Sharma',  mrn: 'SUN-002184', doctor: 'Dr. Arjun Rao',    dept: 'Cardiology',  type: 'OPD',         status: 'completed' },
        { id: 'A-1042', time: '09:30', patient: 'Meera Iyer',    mrn: 'SUN-002201', doctor: 'Dr. Kavita Menon', dept: 'Pediatrics',  type: 'Follow-up',   status: 'completed' },
        { id: 'A-1043', time: '10:15', patient: 'Sourav Ghosh',  mrn: 'SUN-001977', doctor: 'Dr. Arjun Rao',    dept: 'Cardiology',  type: 'OPD',         status: 'checked-in' },
        { id: 'A-1044', time: '10:45', patient: 'Fatima Khan',   mrn: 'SUN-002233', doctor: 'Dr. Vikram Singh', dept: 'Orthopedics', type: 'OPD',         status: 'confirmed' },
        { id: 'A-1045', time: '11:30', patient: 'Ananya Bose',   mrn: 'SUN-002240', doctor: 'Dr. Kavita Menon', dept: 'Pediatrics',  type: 'Teleconsult', status: 'pending' },
        { id: 'A-1046', time: '12:00', patient: 'Joseph Mathew', mrn: 'SUN-001850', doctor: 'Dr. Sana Qureshi', dept: 'Dermatology', type: 'Follow-up',   status: 'confirmed' },
        { id: 'A-1047', time: '14:30', patient: 'Debashis Paul', mrn: 'SUN-002251', doctor: 'Dr. Vikram Singh', dept: 'Orthopedics', type: 'OPD',         status: 'cancelled' },
        { id: 'A-1048', time: '15:15', patient: 'Lakshmi Nair',  mrn: 'SUN-002262', doctor: 'Dr. Sana Qureshi', dept: 'Dermatology', type: 'OPD',         status: 'pending' },
      ],
    },
    moon: {
      name: 'Moon Clinic', slug: 'moon', plan: 'starter',
      branches: ['Main Clinic · Howrah'],
      stats: { patients: 912, doctors: 14, appts: 63, revenue: 128400, beds: 0, emergency: 0, staff: 38, present: 33, onleave: 2, payroll: 612000 },
      trends: { patients: ['+4.6%', 1], doctors: ['+1', 1], appts: ['+6%', 1], revenue: ['+3.2%', 1], beds: ['0', 1], emergency: ['0', 1],
                staff: ['+1', 1], present: ['87%', 1], onleave: ['0', 1], payroll: ['+0.8%', 1] },
      breakdown: { confirmed: 28, pending: 12, completed: 19, cancelled: 4 },
      series: {
        weekly:  { labels: SUN_SERIES.weekly.labels,  admitted: scale(SUN_SERIES.weekly.admitted, .26),  discharged: scale(SUN_SERIES.weekly.discharged, .26) },
        monthly: { labels: SUN_SERIES.monthly.labels, admitted: scale(SUN_SERIES.monthly.admitted, .26), discharged: scale(SUN_SERIES.monthly.discharged, .26) },
        yearly:  { labels: SUN_SERIES.yearly.labels,  admitted: scale(SUN_SERIES.yearly.admitted, .26),  discharged: scale(SUN_SERIES.yearly.discharged, .26) },
      },
      revenue: scale(SUN_REVENUE, .15),
      roles: cloneRoles(),
      wards: [],
      employees: [
        emp('EMP-0101', 'Sumit Ghosh',       'Administration', 'Administration',   'admin',        'active', 'Today, 09:20'),
        emp('EMP-0110', 'Dr. Ritu Banerjee', 'Doctor', 'General Medicine', 'doctor', 'active', 'Today, 09:05', { spec: 'General Medicine', reg: 'WBMC-55310', fee: 500, duty: 'In OPD',   seen: 12 }),
        emp('EMP-0111', 'Dr. Imran Ali',     'Doctor', 'ENT',              'doctor', 'active', 'Today, 10:00', { spec: 'ENT',              reg: 'WBMC-61022', fee: 600, duty: 'In OPD',   seen: 7 }),
        emp('EMP-0112', 'Dr. Pooja Saha',    'Doctor', 'Gynecology',       'doctor', 'invited', '—',          { spec: 'Gynecology',       reg: 'WBMC-58841', fee: 700, duty: 'On break', seen: 5 }),
        emp('EMP-0120', 'Rina Das',          'Receptionist',   'Front Office',     'receptionist', 'active', 'Today, 08:50'),
        emp('EMP-0121', 'Arpita Sen',        'Nurse',          'Nursing',          'nurse',        'none',   '—'),
      ],
      get doctors() { return this.employees.filter(e => e.type === 'Doctor' && e.active); },
      appointments: [
        { id: 'A-0311', time: '09:15', patient: 'Kunal Dey',      mrn: 'MOON-00412', doctor: 'Dr. Ritu Banerjee', dept: 'General Medicine', type: 'OPD',       status: 'completed' },
        { id: 'A-0312', time: '10:00', patient: 'Sneha Mondal',   mrn: 'MOON-00431', doctor: 'Dr. Pooja Saha',    dept: 'Gynecology',       type: 'Follow-up', status: 'checked-in' },
        { id: 'A-0313', time: '11:00', patient: 'Arif Hossain',   mrn: 'MOON-00440', doctor: 'Dr. Imran Ali',     dept: 'ENT',              type: 'OPD',       status: 'confirmed' },
        { id: 'A-0314', time: '12:30', patient: 'Tania Biswas',   mrn: 'MOON-00445', doctor: 'Dr. Ritu Banerjee', dept: 'General Medicine', type: 'OPD',       status: 'pending' },
        { id: 'A-0315', time: '16:00', patient: 'Gopal Chatterjee', mrn: 'MOON-00398', doctor: 'Dr. Imran Ali',   dept: 'ENT',              type: 'Follow-up', status: 'confirmed' },
      ],
    },
  };
}

function makeNotifications() {
  return [
    { id: 1, tone: 'rose',    icon: 'siren',          title: 'Emergency case admitted',      text: 'Road accident, Bay 3 — Dr. Vikram Singh notified', time: '5 min ago',  read: false },
    { id: 2, tone: 'violet',  icon: 'user-plus',      title: 'Login not yet activated',      text: 'Ritika Pal (Nurse) hasn’t signed in since invite', time: '12 min ago', read: false },
    { id: 3, tone: 'sky',     icon: 'flask-round',    title: 'Lab report ready',             text: 'Sourav Ghosh · Lipid profile',                     time: '18 min ago', read: false },
    { id: 4, tone: 'amber',   icon: 'package',        title: 'Low stock',                    text: 'Amoxicillin 500 mg — 42 strips left',              time: '1 h ago',    read: true },
    { id: 5, tone: 'emerald', icon: 'indian-rupee',   title: 'Payment received',             text: '₹4,200 · INV-20931',                               time: '2 h ago',    read: true },
  ];
}

const MESSAGES = [
  { from: 'Dr. Arjun Rao',    text: 'Can we move my 4 pm slot to tomorrow?',  time: '10 min' },
  { from: 'Neha Gupta',       text: 'November payroll is ready for your approval.', time: '32 min' },
  { from: 'Pharmacy',         text: 'Purchase order PO-118 is ready to approve.', time: '1 h' },
];

function makeActivity() {
  return [
    { icon: 'user-plus',    tone: 'violet',  text: '<b>Dr. Anita Sen</b> added employee Ritika Pal (Nurse) and sent login invite', time: '4 d ago' },
    { icon: 'shield-check', tone: 'teal',    text: '<b>Dr. Anita Sen</b> gave <b>HR Manager</b> the payroll:process permission', time: '6 d ago' },
    { icon: 'file-text',    tone: 'sky',     text: '<b>Dr. Arjun Rao</b> issued a prescription for Rahul Sharma', time: '40 min ago' },
    { icon: 'indian-rupee', tone: 'emerald', text: '<b>Amit Roy</b> collected ₹4,200 on INV-20931', time: '2 h ago' },
  ];
}

const TOUR_STEPS = [
  { sel: '#sidebar',          title: 'Navigation',         text: 'The menu is built from the hospital’s enabled modules and the permissions in the user’s role. Change the role and watch it change.' },
  { sel: '#roleSwitchWrap',   title: 'View as any role',   text: 'Switch between Admin, HR, Receptionist, Accountant, Doctor, Employee and Patient to show what each person sees.' },
  { sel: '#branchSwitcher',   title: 'Tenant & branch',    text: 'Each hospital lives on its own subdomain (sun.hms.com). Chains switch between branches here; visits and stock stay branch-scoped.' },
  { sel: '#adminChecklist',   title: 'Admin priorities',   text: 'The admin’s first jobs: add employees, give them roles, issue logins, then set up payroll.' },
  { sel: '#statsGrid',        title: 'Live KPIs',          text: 'Numbers for this tenant only. A card disappears if its module is off or the role has no permission for it.' },
  { sel: '#newApptBtn',       title: 'Book an appointment', text: 'Opens the booking form. Saving updates the queue, the KPIs and the appointment chart.' },
  { sel: '#notifWrap',        title: 'Notifications',      text: 'Alerts route through the channel configured for each purpose — SMS, WhatsApp or email.' },
  { sel: '#testModeCard',     title: 'Test mode',          text: 'Turn this off before a real session. While it’s on, the floating panel on the right holds simulations and settings.' },
];
