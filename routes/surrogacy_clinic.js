/**
 * ============================================================
 * surrogacy_clinic.js
 * Production-ready Express Router — Surrogacy Clinic Module
 * ============================================================
 * Stack : Node.js | Express Router | MySQL2 Promise Pool | Multer
 * Author: Enterprise Backend Generator
 * ============================================================
 */

"use strict";

const express  = require("express");
const multer   = require("multer");
const bcrypt   = require("bcrypt");
const crypto   = require("crypto");
const path     = require("path");
const fs       = require("fs");
const db = require("../db");

const router = express.Router();

const pool = db.promise();

// ─── Multer — PDF scan report upload ────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "../uploads/scan_reports");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${generateUID()}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype === "application/pdf") cb(null, true);
  else cb(new Error("Only PDF files are accepted for scan reports."), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB cap

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

/** Generate a 32-character UUID without dashes */
const generateUID = () => crypto.randomUUID().replace(/-/g, "");

/**
 * Unified error responder — keeps controllers clean.
 * @param {Response} res  Express response object
 * @param {number}   code HTTP status code
 * @param {string}   msg  Human-readable message
 * @param {*}        [detail] Optional debug detail (omitted in production)
 */
const sendError = (res, code, msg, detail = null) => {
  const payload = { success: false, message: msg };
  if (detail && process.env.NODE_ENV !== "production") payload.detail = String(detail);
  return res.status(code).json(payload);
};

/** Thin wrapper for successful responses */
const sendSuccess = (res, data = {}, msg = "Success", code = 200) =>
  res.status(code).json({ success: true, message: msg, ...data });

/** Quick required-field validator — returns array of missing field names */
const missingFields = (body, fields) =>
  fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === "");

// ═══════════════════════════════════════════════════════════════
//  DATABASE — TABLE CREATION
// ═══════════════════════════════════════════════════════════════

const createSurrogacyClinicsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS surrogacy_clinics (
      id              BIGINT        AUTO_INCREMENT PRIMARY KEY,
      clinic_uid      VARCHAR(32)   UNIQUE NOT NULL,
      clinic_name     VARCHAR(255)  NOT NULL,
      email           VARCHAR(255)  UNIQUE NOT NULL,
      phone           VARCHAR(20),
      country         VARCHAR(100),
      state           VARCHAR(100),
      city            VARCHAR(100),
      address         TEXT,
      license_number  VARCHAR(100),
      specialization  VARCHAR(255),
      password_hash   VARCHAR(255),
      status          ENUM('pending','approved','rejected') DEFAULT 'pending',
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
};

const createSurrogacyCasesTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS surrogacy_cases (
      id                    BIGINT       AUTO_INCREMENT PRIMARY KEY,
      surrogacy_case_id     VARCHAR(32)  UNIQUE NOT NULL,
      parent_uid            VARCHAR(32)  NOT NULL,
      surrogate_uid         VARCHAR(32)  NOT NULL,
      clinic_uid            VARCHAR(32)  NOT NULL,
      assigned_by_admin     VARCHAR(32),
      case_status           ENUM(
                              'new',
                              'clinic_assigned',
                              'medical_screening',
                              'legal_contract',
                              'embryo_transfer',
                              'pregnancy_confirmed',
                              'delivery',
                              'completed',
                              'cancelled'
                            ) DEFAULT 'new',
      payment_stage         VARCHAR(100),
      legal_stage           VARCHAR(100),
      embryo_transfer_date  DATE,
      expected_delivery_date DATE,
      notes                 TEXT,
      created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_clinic_uid        (clinic_uid),
      INDEX idx_parent_uid        (parent_uid),
      INDEX idx_surrogate_uid     (surrogate_uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
};

const createSurrogacyCheckupsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS surrogacy_checkups (
      id                BIGINT       AUTO_INCREMENT PRIMARY KEY,
      checkup_uid       VARCHAR(32)  UNIQUE NOT NULL,
      surrogacy_case_id VARCHAR(32)  NOT NULL,
      clinic_uid        VARCHAR(32)  NOT NULL,
      month_number      INT          NOT NULL,
      visit_date        DATE         NOT NULL,
      doctor_name       VARCHAR(255),
      baby_growth       VARCHAR(255),
      surrogate_health  VARCHAR(255),
      blood_pressure    VARCHAR(50),
      sugar_level       VARCHAR(50),
      scan_report       VARCHAR(255),
      medications       TEXT,
      doctor_notes      TEXT,
      next_visit_date   DATE,
      checkup_status    ENUM('scheduled','completed','missed') DEFAULT 'scheduled',
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_case_id (surrogacy_case_id),
      CONSTRAINT fk_checkup_case
        FOREIGN KEY (surrogacy_case_id)
        REFERENCES surrogacy_cases (surrogacy_case_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
};

/** Initialise all three tables — called during server startup */
const createTables = async () => {
  await createSurrogacyClinicsTable();
  await createSurrogacyCasesTable();
  await createSurrogacyCheckupsTable();
  console.log("[SurrogacyClinic] Database tables verified/created.");
};

// ═══════════════════════════════════════════════════════════════
//  ROUTE 1 — POST /api/surrogacy-clinic/register
// ═══════════════════════════════════════════════════════════════
/**
 * Register a new surrogacy clinic.
 * Hashes password, sets status to 'pending' pending admin approval.
 */
router.post("/surrogacy-clinic/register", async (req, res) => {
  try {
    const required = ["clinic_name", "email", "password"];
    const missing  = missingFields(req.body, required);
    if (missing.length) return sendError(res, 400, `Missing required fields: ${missing.join(", ")}`);

    const {
      clinic_name, email, password,
      phone, country, state, city,
      address, license_number, specialization,
    } = req.body;

    // Check duplicate email
    const [existing] = await pool.query(
      "SELECT id FROM surrogacy_clinics WHERE email = ?", [email]
    );
    if (existing.length) return sendError(res, 409, "A clinic with this email already exists.");

    const clinic_uid    = generateUID();
    const password_hash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO surrogacy_clinics
        (clinic_uid, clinic_name, email, phone, country, state, city,
         address, license_number, specialization, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clinic_uid, clinic_name, email, phone ?? null, country ?? null,
       state ?? null, city ?? null, address ?? null,
       license_number ?? null, specialization ?? null, password_hash]
    );

    return sendSuccess(
      res,
      { clinic_uid },
      "Clinic registered successfully. Awaiting admin approval.",
      201
    );
  } catch (err) {
    return sendError(res, 500, "Registration failed.", err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 2 — POST /api/surrogacy-clinic/login
// ═══════════════════════════════════════════════════════════════
/**
 * Clinic login — validates email + password.
 * Returns clinic_uid and basic profile on success.
 */
router.post("/surrogacy-clinic/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, 400, "Email and password are required.");

    const [rows] = await pool.query(
      `SELECT clinic_uid, clinic_name, email, phone, country, state,
              city, status, password_hash
       FROM surrogacy_clinics WHERE email = ?`,
      [email]
    );
    if (!rows.length) return sendError(res, 401, "Invalid email or password.");

    const clinic = rows[0];
    const valid  = await bcrypt.compare(password, clinic.password_hash);
    if (!valid) return sendError(res, 401, "Invalid email or password.");

    if (clinic.status === "pending")
      return sendError(res, 403, "Your clinic account is pending admin approval.");
    if (clinic.status === "rejected")
      return sendError(res, 403, "Your clinic account has been rejected. Contact support.");

    const { password_hash: _omit, ...profile } = clinic; // strip hash before sending

    return sendSuccess(res, { clinic: profile }, "Login successful.");
  } catch (err) {
    return sendError(res, 500, "Login failed.", err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 3 — GET /api/surrogacy-clinic/:clinic_uid/dashboard
// ═══════════════════════════════════════════════════════════════
/**
 * Clinic dashboard summary:
 *   - Clinic profile
 *   - Assigned cases count
 *   - Active pregnancies count
 *   - Completed cases count
 *   - Next upcoming visits count (checkups scheduled from today onward)
 */
router.get("/surrogacy-clinic/:clinic_uid/dashboard", async (req, res) => {
  try {
    const { clinic_uid } = req.params;

    // Fetch profile
    const [clinicRows] = await pool.query(
      `SELECT clinic_uid, clinic_name, email, phone, country, state,
              city, address, license_number, specialization, status, created_at
       FROM surrogacy_clinics WHERE clinic_uid = ?`,
      [clinic_uid]
    );
    if (!clinicRows.length) return sendError(res, 404, "Clinic not found.");

    // Aggregate case stats in a single query
    const [stats] = await pool.query(
      `SELECT
         COUNT(*) AS total_assigned,
         SUM(CASE WHEN case_status IN
               ('medical_screening','legal_contract','embryo_transfer',
                'pregnancy_confirmed','delivery') THEN 1 ELSE 0 END) AS active_pregnancies,
         SUM(CASE WHEN case_status = 'completed' THEN 1 ELSE 0 END) AS completed_cases
       FROM surrogacy_cases WHERE clinic_uid = ?`,
      [clinic_uid]
    );

    // Upcoming visits from checkups
    const [visitRows] = await pool.query(
      `SELECT COUNT(*) AS upcoming_visits
       FROM surrogacy_checkups sc
       INNER JOIN surrogacy_cases cas ON sc.surrogacy_case_id = cas.surrogacy_case_id
       WHERE cas.clinic_uid = ?
         AND sc.checkup_status = 'scheduled'
         AND sc.visit_date >= CURDATE()`,
      [clinic_uid]
    );

    return sendSuccess(res, {
      clinic          : clinicRows[0],
      total_assigned  : stats[0].total_assigned   ?? 0,
      active_pregnancies: stats[0].active_pregnancies ?? 0,
      completed_cases : stats[0].completed_cases  ?? 0,
      upcoming_visits : visitRows[0].upcoming_visits ?? 0,
    });
  } catch (err) {
    return sendError(res, 500, "Failed to load dashboard.", err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 4 — PUT /api/admin/surrogacy-clinic/:clinic_uid/approve
// ═══════════════════════════════════════════════════════════════
/** Admin approves a pending clinic. */
router.put("/admin/surrogacy-clinic/:clinic_uid/approve", async (req, res) => {
  try {
    const { clinic_uid } = req.params;

    const [result] = await pool.query(
      "UPDATE surrogacy_clinics SET status = 'approved' WHERE clinic_uid = ?",
      [clinic_uid]
    );
    if (!result.affectedRows) return sendError(res, 404, "Clinic not found.");

    return sendSuccess(res, { clinic_uid }, "Clinic approved successfully.");
  } catch (err) {
    return sendError(res, 500, "Approval failed.", err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 5 — PUT /api/admin/surrogacy-clinic/:clinic_uid/reject
// ═══════════════════════════════════════════════════════════════
/** Admin rejects a clinic. */
router.put("/admin/surrogacy-clinic/:clinic_uid/reject", async (req, res) => {
  try {
    const { clinic_uid } = req.params;

    const [result] = await pool.query(
      "UPDATE surrogacy_clinics SET status = 'rejected' WHERE clinic_uid = ?",
      [clinic_uid]
    );
    if (!result.affectedRows) return sendError(res, 404, "Clinic not found.");

    return sendSuccess(res, { clinic_uid }, "Clinic rejected.");
  } catch (err) {
    return sendError(res, 500, "Rejection failed.", err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 6 — POST /api/admin/surrogacy-case/create
// ═══════════════════════════════════════════════════════════════
/**
 * Admin creates a new surrogacy case.
 * Connects parent + surrogate + clinic; status defaults to 'clinic_assigned'.
 */
router.post("/admin/surrogacy-case/create", async (req, res) => {
  try {
    const required = ["parent_uid", "surrogate_uid", "clinic_uid"];
    const missing  = missingFields(req.body, required);
    if (missing.length) return sendError(res, 400, `Missing required fields: ${missing.join(", ")}`);

    const {
      parent_uid, surrogate_uid, clinic_uid,
      assigned_by_admin = null,
      payment_stage = null, legal_stage = null,
      embryo_transfer_date = null, expected_delivery_date = null,
      notes = null,
    } = req.body;

    // Verify clinic exists and is approved
    const [clinicRows] = await pool.query(
      "SELECT clinic_uid FROM surrogacy_clinics WHERE clinic_uid = ? AND status = 'approved'",
      [clinic_uid]
    );
    if (!clinicRows.length)
      return sendError(res, 404, "Clinic not found or not yet approved.");

    const surrogacy_case_id = generateUID();

    await pool.query(
      `INSERT INTO surrogacy_cases
         (surrogacy_case_id, parent_uid, surrogate_uid, clinic_uid,
          assigned_by_admin, case_status, payment_stage, legal_stage,
          embryo_transfer_date, expected_delivery_date, notes)
       VALUES (?, ?, ?, ?, ?, 'clinic_assigned', ?, ?, ?, ?, ?)`,
      [surrogacy_case_id, parent_uid, surrogate_uid, clinic_uid,
       assigned_by_admin, payment_stage, legal_stage,
       embryo_transfer_date, expected_delivery_date, notes]
    );

    return sendSuccess(
      res,
      { surrogacy_case_id },
      "Surrogacy case created and assigned to clinic.",
      201
    );
  } catch (err) {
    return sendError(res, 500, "Case creation failed.", err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 7 — GET /api/admin/surrogacy-cases
// ═══════════════════════════════════════════════════════════════
/**
 * Admin — list all surrogacy cases.
 * Includes clinic info, parent/surrogate IDs, latest checkup summary.
 * Sorted latest first.
 */
router.get("/admin/surrogacy-cases", async (req, res) => {
  try {
    const [cases] = await pool.query(
      `SELECT
         sc.surrogacy_case_id,
         sc.parent_uid,
         sc.surrogate_uid,
         sc.case_status,
         sc.payment_stage,
         sc.legal_stage,
         sc.embryo_transfer_date,
         sc.expected_delivery_date,
         sc.notes,
         sc.created_at,
         cl.clinic_uid,
         cl.clinic_name,
         cl.email      AS clinic_email,
         cl.phone      AS clinic_phone,
         cl.city       AS clinic_city,
         cl.country    AS clinic_country,
         ck.checkup_uid         AS latest_checkup_uid,
         ck.month_number        AS latest_month,
         ck.visit_date          AS latest_visit_date,
         ck.checkup_status      AS latest_checkup_status,
         ck.doctor_name         AS latest_doctor,
         ck.surrogate_health    AS latest_surrogate_health,
         ck.baby_growth         AS latest_baby_growth
       FROM surrogacy_cases sc
       LEFT JOIN surrogacy_clinics cl ON sc.clinic_uid = cl.clinic_uid
       LEFT JOIN surrogacy_checkups ck
         ON ck.surrogacy_case_id = sc.surrogacy_case_id
         AND ck.created_at = (
           SELECT MAX(created_at)
           FROM surrogacy_checkups
           WHERE surrogacy_case_id = sc.surrogacy_case_id
         )
       ORDER BY sc.created_at DESC`
    );

    return sendSuccess(res, { cases, total: cases.length });
  } catch (err) {
    return sendError(res, 500, "Failed to retrieve cases.", err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 8 — GET /api/admin/surrogacy-case/:surrogacy_case_id
// ═══════════════════════════════════════════════════════════════
/**
 * Admin — full case details.
 * Includes clinic profile, all monthly checkups, timeline-ready structure.
 */
router.get("/admin/surrogacy-case/:surrogacy_case_id", async (req, res) => {
  try {
    const { surrogacy_case_id } = req.params;

    // Case + clinic
    const [caseRows] = await pool.query(
      `SELECT
         sc.*,
         cl.clinic_name, cl.email AS clinic_email, cl.phone AS clinic_phone,
         cl.country AS clinic_country, cl.state AS clinic_state,
         cl.city AS clinic_city, cl.address AS clinic_address,
         cl.license_number, cl.specialization, cl.status AS clinic_status
       FROM surrogacy_cases sc
       LEFT JOIN surrogacy_clinics cl ON sc.clinic_uid = cl.clinic_uid
       WHERE sc.surrogacy_case_id = ?`,
      [surrogacy_case_id]
    );
    if (!caseRows.length) return sendError(res, 404, "Case not found.");

    // All checkups ordered by month
    const [checkups] = await pool.query(
      `SELECT * FROM surrogacy_checkups
       WHERE surrogacy_case_id = ?
       ORDER BY month_number ASC`,
      [surrogacy_case_id]
    );

    // Build a simple timeline from case status transitions (derived from checkups)
    const timeline = checkups.map((c) => ({
      month       : c.month_number,
      visit_date  : c.visit_date,
      status      : c.checkup_status,
      doctor      : c.doctor_name,
      notes       : c.doctor_notes,
    }));

    return sendSuccess(res, {
      case    : caseRows[0],
      checkups,
      timeline,
    });
  } catch (err) {
    return sendError(res, 500, "Failed to retrieve case details.", err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 9 — GET /api/surrogacy-clinic/:clinic_uid/cases
// ═══════════════════════════════════════════════════════════════
/** Clinic — see only cases assigned to them. */
router.get("/surrogacy-clinic/:clinic_uid/cases", async (req, res) => {
  try {
    const { clinic_uid } = req.params;

    const [cases] = await pool.query(
      `SELECT
         surrogacy_case_id, parent_uid, surrogate_uid,
         case_status, payment_stage, legal_stage,
         embryo_transfer_date, expected_delivery_date,
         notes, created_at
       FROM surrogacy_cases
       WHERE clinic_uid = ?
       ORDER BY created_at DESC`,
      [clinic_uid]
    );

    return sendSuccess(res, { cases, total: cases.length });
  } catch (err) {
    return sendError(res, 500, "Failed to retrieve clinic cases.", err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 10 — PUT /api/surrogacy-clinic/case/:surrogacy_case_id/status
// ═══════════════════════════════════════════════════════════════
/**
 * Clinic updates case status fields.
 * Accepts partial updates — only supplied fields are changed.
 */
router.put("/surrogacy-clinic/case/:surrogacy_case_id/status", async (req, res) => {
  try {
    const { surrogacy_case_id } = req.params;

    const allowedFields = [
      "case_status",
      "legal_stage",
      "payment_stage",
      "embryo_transfer_date",
      "expected_delivery_date",
      "notes",
    ];

    // Build dynamic SET clause from only provided fields
    const setClauses = [];
    const values     = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (!setClauses.length)
      return sendError(res, 400, "No updatable fields provided.");

    values.push(surrogacy_case_id);

    const [result] = await pool.query(
      `UPDATE surrogacy_cases SET ${setClauses.join(", ")} WHERE surrogacy_case_id = ?`,
      values
    );
    if (!result.affectedRows) return sendError(res, 404, "Case not found.");

    return sendSuccess(res, { surrogacy_case_id }, "Case updated successfully.");
  } catch (err) {
    return sendError(res, 500, "Case update failed.", err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 11 — POST /api/surrogacy-clinic/checkup/add
// ═══════════════════════════════════════════════════════════════
/**
 * Add a monthly checkup entry for a surrogacy case.
 * Optionally uploads a PDF scan report via multipart/form-data.
 */
router.post(
  "/surrogacy-clinic/checkup/add",
  upload.single("scan_report"),
  async (req, res) => {
    try {
      const required = ["surrogacy_case_id", "clinic_uid", "month_number", "visit_date"];
      const missing  = missingFields(req.body, required);
      if (missing.length)
        return sendError(res, 400, `Missing required fields: ${missing.join(", ")}`);

      const {
        surrogacy_case_id, clinic_uid, month_number, visit_date,
        doctor_name = null, baby_growth = null, surrogate_health = null,
        blood_pressure = null, sugar_level = null,
        medications = null, doctor_notes = null,
        next_visit_date = null, checkup_status = "scheduled",
      } = req.body;

      // Verify case belongs to clinic
      const [caseRows] = await pool.query(
        "SELECT surrogacy_case_id FROM surrogacy_cases WHERE surrogacy_case_id = ? AND clinic_uid = ?",
        [surrogacy_case_id, clinic_uid]
      );
      if (!caseRows.length)
        return sendError(res, 404, "Case not found or not assigned to this clinic.");

      const checkup_uid  = generateUID();
      const scan_report  = req.file ? req.file.filename : null; // stored filename

      await pool.query(
        `INSERT INTO surrogacy_checkups
           (checkup_uid, surrogacy_case_id, clinic_uid, month_number, visit_date,
            doctor_name, baby_growth, surrogate_health, blood_pressure, sugar_level,
            scan_report, medications, doctor_notes, next_visit_date, checkup_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [checkup_uid, surrogacy_case_id, clinic_uid, month_number, visit_date,
         doctor_name, baby_growth, surrogate_health, blood_pressure, sugar_level,
         scan_report, medications, doctor_notes, next_visit_date, checkup_status]
      );

      return sendSuccess(
        res,
        { checkup_uid, scan_report },
        "Checkup recorded successfully.",
        201
      );
    } catch (err) {
      return sendError(res, 500, "Failed to add checkup.", err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
//  ROUTE 12 — GET /api/surrogacy-clinic/checkups/:surrogacy_case_id
// ═══════════════════════════════════════════════════════════════
/** Retrieve all monthly checkups for a case, ordered by month ascending. */
router.get("/surrogacy-clinic/checkups/:surrogacy_case_id", async (req, res) => {
  try {
    const { surrogacy_case_id } = req.params;

    const [checkups] = await pool.query(
      `SELECT * FROM surrogacy_checkups
       WHERE surrogacy_case_id = ?
       ORDER BY month_number ASC`,
      [surrogacy_case_id]
    );

    return sendSuccess(res, { checkups, total: checkups.length });
  } catch (err) {
    return sendError(res, 500, "Failed to retrieve checkups.", err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 13 — PUT /api/surrogacy-clinic/checkup/:checkup_uid
// ═══════════════════════════════════════════════════════════════
/**
 * Update a checkup entry.
 * Accepts partial updates for notes, health values, medications, status, etc.
 */
router.put("/surrogacy-clinic/checkup/:checkup_uid", async (req, res) => {
  try {
    const { checkup_uid } = req.params;

    const allowedFields = [
      "doctor_notes",
      "baby_growth",
      "surrogate_health",
      "blood_pressure",
      "sugar_level",
      "medications",
      "next_visit_date",
      "checkup_status",
      "doctor_name",
      "visit_date",
    ];

    const setClauses = [];
    const values     = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (!setClauses.length)
      return sendError(res, 400, "No updatable fields provided.");

    values.push(checkup_uid);

    const [result] = await pool.query(
      `UPDATE surrogacy_checkups SET ${setClauses.join(", ")} WHERE checkup_uid = ?`,
      values
    );
    if (!result.affectedRows) return sendError(res, 404, "Checkup not found.");

    return sendSuccess(res, { checkup_uid }, "Checkup updated successfully.");
  } catch (err) {
    return sendError(res, 500, "Checkup update failed.", err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════
createTables().catch((err) => {
  console.error("❌ Surrogacy clinic table init failed:", err);
});
module.exports = router;