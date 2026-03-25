// routes/fertilityRegister.js
// Complete Fertility Center Registration System - All-in-One Backend
// getting error

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const fileUpload = require('express-fileupload');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs').promises;
const db = require('../db');

require('dotenv').config();

/* =====================
   FILE UPLOAD MIDDLEWARE
===================== */
router.use(fileUpload({ useTempFiles: true, tempFileDir: '/tmp/' }));

/* =====================
   DATABASE SETUP
===================== */
const initializeDatabase = () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS fertility_centers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      center_name VARCHAR(255) NOT NULL,
      registration_number VARCHAR(100) UNIQUE NOT NULL,
      establishment_year INT,
      center_type VARCHAR(100),
      description LONGTEXT,
      logo VARCHAR(500),
      gallery_images JSON,
      country VARCHAR(100),
      state VARCHAR(100),
      city VARCHAR(100),
      area VARCHAR(150),
      address LONGTEXT,
      pincode VARCHAR(10),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      primary_phone VARCHAR(15),
      alternate_phone VARCHAR(15),
      email VARCHAR(255) NOT NULL UNIQUE,
      website VARCHAR(255),
      emergency_contact VARCHAR(15),
      doctors JSON,
      services JSON,
      facilities JSON,
      ivf_success_rate DECIMAL(5, 2),
      total_cycles INT,
      years_experience INT,
      certifications JSON,
      ivf_cost_range VARCHAR(100),
      iui_cost DECIMAL(10, 2),
      consultation_fee DECIMAL(10, 2),
      packages JSON,
      opening_time TIME,
      closing_time TIME,
      working_days VARCHAR(100),
      emergency_available BOOLEAN DEFAULT FALSE,
      license_certificate VARCHAR(500),
      doctor_certificates JSON,
      accreditation_docs JSON,
      id_proof VARCHAR(500),
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      insurance JSON,
      languages JSON,
      awards JSON,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_email (email),
      INDEX idx_registration_number (registration_number),
      INDEX idx_created_at (created_at)
    )
  `;

  db.query(createTableSQL, (err) => {
    if (err) {
      console.error('❌ Failed to create table:', err);
    } else {
      console.log('✅ Fertility centers table verified/created');
    }
  });
};

// Initialize database on startup
initializeDatabase();

/* =====================
   ZOHO SMTP CONFIGURATION
===================== */
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL || 'support@hitaishihealthcare.com',
    pass: process.env.ZOHO_PASS
  }
});

// Verify email connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service error:', error);
  } else {
    console.log('✅ Email service configured');
  }
});

/* =====================
   EMAIL TEMPLATES
===================== */
const emailTemplates = {
  adminRegistrationNotification: (centerData) => ({
    subject: `New Fertility Center Registration - ${centerData.centerName}`,
    html: `
      <h2>New Fertility Center Registration Received</h2>
      <p>A new fertility center has registered on the platform.</p>
      <hr>
      <h3>Center Details:</h3>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Center Name:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${centerData.centerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Registration Number:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${centerData.registrationNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Center Type:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${centerData.centerType}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Location:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${centerData.city}, ${centerData.state}, ${centerData.country}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Contact Email:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${centerData.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Primary Phone:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${centerData.primaryPhone}</td>
        </tr>
      </table>
      <hr>
      <p>Please review the registration and take appropriate action through the admin panel.</p>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">© 2024 Hitaishi Healthcare. All rights reserved.</p>
    `
  }),

  userRegistrationAcknowledgment: (centerName, email) => ({
    subject: 'Registration Received - Hitaishi Healthcare',
    html: `
      <h2>Welcome, ${centerName}!</h2>
      <p>Thank you for registering with Hitaishi Healthcare. We have received your fertility center registration.</p>
      <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e40af;">Registration Status: <strong>Under Review</strong></h3>
        <p>Our admin team will carefully review your submission and verify all the documents.</p>
      </div>
      <h4>What happens next:</h4>
      <ol>
        <li>Our team will verify all documents you provided</li>
        <li>We will conduct background verification for 2-3 business days</li>
        <li>You will receive an email notification once the review is complete</li>
      </ol>
      <h4>Need Help?</h4>
      <p>If you have any questions, please contact us at support@hitaishihealthcare.com</p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">© 2024 Hitaishi Healthcare. All rights reserved.<br>This email was sent to ${email}</p>
    `
  }),

  centerApprovalNotification: (centerName, email, registrationNumber) => ({
    subject: 'Your Center Has Been Approved! 🎉 - Hitaishi Healthcare',
    html: `
      <h2>Congratulations, ${centerName}!</h2>
      <p>Your fertility center has been successfully approved and is now listed on Hitaishi Healthcare.</p>
      <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #065f46;">STATUS: ✓ APPROVED</h3>
        <p><strong>Registration Number:</strong> ${registrationNumber}</p>
      </div>
      <h4>You can now:</h4>
      <ul>
        <li>Access your center dashboard</li>
        <li>Manage appointments and bookings</li>
        <li>View performance analytics</li>
        <li>Update center information and services</li>
        <li>Manage doctor profiles and certifications</li>
      </ul>
      <p><a href="https://hitaishihealthcare.com/provider-dashboard" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Access Dashboard</a></p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">© 2024 Hitaishi Healthcare. All rights reserved.<br>This email was sent to ${email}</p>
    `
  }),

  adminApprovalConfirmation: (centerName, registrationNumber) => ({
    subject: `Fertility Center Approved - ${centerName}`,
    html: `
      <h2>Fertility Center Registration Approved</h2>
      <p>You have approved the registration for: <strong>${centerName}</strong></p>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Registration Number:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${registrationNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong style="color: #10b981;">APPROVED</strong></td>
        </tr>
      </table>
      <p style="color: #666; font-size: 12px;">© 2024 Hitaishi Healthcare. All rights reserved.</p>
    `
  }),

  centerRejectionNotification: (centerName, email, reason) => ({
    subject: 'Registration Status Update - Hitaishi Healthcare',
    html: `
      <h2>${centerName}</h2>
      <p>Thank you for registering with Hitaishi Healthcare. After careful review, we are unable to approve your registration at this time.</p>
      <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #7f1d1d;">STATUS: REJECTED</h3>
      </div>
      <h4>Reason for Rejection:</h4>
      <p>${reason}</p>
      <h4>What you can do:</h4>
      <ul>
        <li>Review the reason for rejection carefully</li>
        <li>Address the concerns mentioned</li>
        <li>Reapply with updated information (after 30 days)</li>
      </ul>
      <h4>Need Assistance?</h4>
      <p>Email: support@hitaishihealthcare.com</p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">© 2024 Hitaishi Healthcare. All rights reserved.<br>This email was sent to ${email}</p>
    `
  }),

  adminRejectionConfirmation: (centerName, registrationNumber, reason) => ({
    subject: `Fertility Center Rejected - ${centerName}`,
    html: `
      <h2>Fertility Center Registration Rejected</h2>
      <p>You have rejected the registration for: <strong>${centerName}</strong></p>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Registration Number:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${registrationNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${reason}</td>
        </tr>
      </table>
      <p style="color: #666; font-size: 12px;">© 2024 Hitaishi Healthcare. All rights reserved.</p>
    `
  })
};

// Send email function
const sendEmail = async (to, template) => {
  try {
    const mailOptions = {
      from: process.env.ZOHO_EMAIL || 'support@hitaishihealthcare.com',
      to: to,
      ...template
    };
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
};

/* =====================
   VALIDATION MIDDLEWARE
===================== */
const validateFertilityRegistration = [
  body('centerName').trim().notEmpty().withMessage('Center name is required').isLength({ min: 3 }).withMessage('Center name must be at least 3 characters'),
  body('registrationNumber').trim().notEmpty().withMessage('Registration number is required').isLength({ min: 5 }).withMessage('Invalid registration number'),
  body('establishmentYear')
    .toInt()
    .isInt({ min: 1900, max: 2099 }).withMessage('Invalid establishment year'),
  body('centerType').trim().notEmpty().withMessage('Center type is required').isIn(['Hospital', 'Clinic', 'Research Center', 'Diagnostic Center']).withMessage('Invalid center type'),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('country').trim().notEmpty().withMessage('Country is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('pincode').trim().notEmpty().withMessage('Pincode is required').matches(/^[0-9]{6}$/).withMessage('Pincode must be 6 digits'),
  body('latitude').optional().toFloat().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional().toFloat().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('primaryPhone').trim().notEmpty().withMessage('Primary phone is required').matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
  body('alternatePhone').optional({ checkFalsy: true }).matches(/^[0-9]{10}$/).withMessage('Alternate phone must be 10 digits'),
  body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format').normalizeEmail(),
  body('website').optional({ checkFalsy: true }).isURL().withMessage('Invalid website URL'),
  body('emergencyContact').optional({ checkFalsy: true }).matches(/^[0-9]{10}$/).withMessage('Emergency contact must be 10 digits'),
  body('username').trim().notEmpty().withMessage('Username is required').isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters').matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, dashes, and underscores'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/).withMessage('Password must contain uppercase, number, and special character'),
  body('ivfSuccessRate').optional().toFloat().isFloat({ min: 0, max: 100 }).withMessage('Success rate must be between 0-100'),
  body('totalCycles').optional().toInt().isInt({ min: 0 }).withMessage('Total cycles must be positive'),
  body('yearsExperience').optional().toInt().isInt({ min: 0 }).withMessage('Years must be positive'),
  body('consultationFee').optional().toFloat().isFloat({ min: 0 }).withMessage('Consultation fee must be positive'),
  body('iuiCost').optional().toFloat().isFloat({ min: 0 }).withMessage('IUI cost must be positive')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("❌ Validation Errors:", errors.array()); // DEBUG: Log exact validation errors
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

const validateFiles = (req, res, next) => {
  const errors = [];
  if (!req.files || !req.files.licenseCertificate) {
    errors.push('License certificate is required');
  }
  if (!req.files || !req.files.idProof) {
    errors.push('ID proof is required');
  }

  const fileFields = ['licenseCertificate', 'idProof', 'logo'];
  const multiFileFields = ['doctorCertificates', 'accreditationDocs'];

  fileFields.forEach(field => {
    if (req.files && req.files[field]) {
      const file = req.files[field];
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.mimetype)) {
        errors.push(`${field}: Only JPG, PNG, and PDF allowed`);
      }
      if (file.size > 2 * 1024 * 1024) {
        errors.push(`${field}: File size must not exceed 2MB`);
      }
    }
  });

  multiFileFields.forEach(field => {
    if (req.files && req.files[field]) {
      const files = Array.isArray(req.files[field]) ? req.files[field] : [req.files[field]];
      files.forEach(file => {
        const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!validTypes.includes(file.mimetype)) {
          errors.push(`${field}: Only JPG, PNG, and PDF allowed`);
        }
        if (file.size > 2 * 1024 * 1024) {
          errors.push(`${field}: File size must not exceed 2MB`);
        }
      });
    }
  });

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'File validation failed',
      errors: errors
    });
  }
  next();
};

const validateJSONArrays = (req, res, next) => {
  const jsonFields = ['doctors', 'services', 'facilities', 'languages', 'insurance', 'certifications', 'awards'];
  for (let field of jsonFields) {
    if (req.body[field]) {
      try {
        req.body[field] = typeof req.body[field] === 'string' ? JSON.parse(req.body[field]) : req.body[field];
      } catch (err) {
        console.warn(`⚠️ JSON parse error for ${field}:`, err.message);
        // Safe fallback: convert to empty array if parsing fails
        req.body[field] = [];
      }
    } else {
      // Ensure field exists as empty array if not provided
      req.body[field] = [];
    }
  }
  next();
};

/* =====================
   ROUTES - REGISTRATION
===================== */
router.post('/fertility/register',
  validateFertilityRegistration,
  handleValidationErrors,
  validateJSONArrays,
  validateFiles,
  async (req, res) => {
    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      const { 
        centerName, registrationNumber, establishmentYear, centerType, description,
        country, state, city, area, address, pincode, latitude, longitude,
        primaryPhone, alternatePhone, email, website, emergencyContact,
        doctors, services, facilities, languages, insurance,
        ivfSuccessRate, totalCycles, yearsExperience, consultationFee,
        ivfCostRange, iuiCost, certifications, awards,
        username, password
      } = req.body;

      // Check unique constraints
      const [existingReg] = await connection.query(
        'SELECT id FROM fertility_centers WHERE registration_number = ? OR email = ? OR username = ?',
        [registrationNumber, email, username]
      );

      if (existingReg.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: 'Registration number, email, or username already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Handle file uploads
      const uploadDir = path.join(__dirname, '../uploads/fertility-centers');
      await fs.mkdir(uploadDir, { recursive: true });

      let logoPath = null;
      let licensePath = null;
      let idProofPath = null;

      // Single file uploads
      if (req.files?.logo) {
        const logoFile = req.files.logo;
        const logoFilename = `logo-${Date.now()}-${logoFile.name}`;
        logoPath = path.join(uploadDir, logoFilename);
        await logoFile.mv(logoPath);
        logoPath = `/uploads/fertility-centers/${logoFilename}`;
      }

      if (req.files?.licenseCertificate) {
        const licenseFile = req.files.licenseCertificate;
        const licenseFilename = `license-${Date.now()}-${licenseFile.name}`;
        licensePath = path.join(uploadDir, licenseFilename);
        await licenseFile.mv(licensePath);
        licensePath = `/uploads/fertility-centers/${licenseFilename}`;
      }

      if (req.files?.idProof) {
        const idFile = req.files.idProof;
        const idFilename = `id-${Date.now()}-${idFile.name}`;
        idProofPath = path.join(uploadDir, idFilename);
        await idFile.mv(idProofPath);
        idProofPath = `/uploads/fertility-centers/${idFilename}`;
      }

      // Multiple file uploads
      let doctorCertPaths = [];
      if (req.files?.doctorCertificates) {
        const files = Array.isArray(req.files.doctorCertificates) 
          ? req.files.doctorCertificates 
          : [req.files.doctorCertificates];

        for (let file of files) {
          const filename = `doctor-cert-${Date.now()}-${file.name}`;
          const filepath = path.join(uploadDir, filename);
          await file.mv(filepath);
          doctorCertPaths.push(`/uploads/fertility-centers/${filename}`);
        }
      }

      let accreditationPaths = [];
      if (req.files?.accreditationDocs) {
        const files = Array.isArray(req.files.accreditationDocs) 
          ? req.files.accreditationDocs 
          : [req.files.accreditationDocs];

        for (let file of files) {
          const filename = `accred-${Date.now()}-${file.name}`;
          const filepath = path.join(uploadDir, filename);
          await file.mv(filepath);
          accreditationPaths.push(`/uploads/fertility-centers/${filename}`);
        }
      }

      // Prepare data
      const centerData = {
        center_name: centerName,
        registration_number: registrationNumber,
        establishment_year: establishmentYear,
        center_type: centerType,
        description: description,
        logo: logoPath,
        gallery_images: JSON.stringify([]),
        
        country: country,
        state: state,
        city: city,
        area: area || null,
        address: address,
        pincode: pincode,
        latitude: latitude || null,
        longitude: longitude || null,
        
        primary_phone: primaryPhone,
        alternate_phone: alternatePhone || null,
        email: email,
        website: website || null,
        emergency_contact: emergencyContact || null,
        
        doctors: JSON.stringify(doctors),
        services: JSON.stringify(services),
        facilities: JSON.stringify(facilities),
        languages: JSON.stringify(languages),
        insurance: JSON.stringify(insurance),
        
        ivf_success_rate: ivfSuccessRate || null,
        total_cycles: totalCycles || null,
        years_experience: yearsExperience || null,
        certifications: JSON.stringify(certifications || []),
        
        ivf_cost_range: ivfCostRange || null,
        iui_cost: iuiCost || null,
        consultation_fee: consultationFee || null,
        packages: JSON.stringify([]),
        
        opening_time: null,
        closing_time: null,
        working_days: null,
        emergency_available: false,
        
        license_certificate: licensePath,
        doctor_certificates: JSON.stringify(doctorCertPaths),
        accreditation_docs: JSON.stringify(accreditationPaths),
        id_proof: idProofPath,
        
        username: username,
        password: hashedPassword,
        
        awards: JSON.stringify(awards || []),
        status: 'pending'
      };

      // Insert into database
      const [result] = await connection.query(
        `INSERT INTO fertility_centers SET ?`,
        centerData
      );

      await connection.commit();

      // Send emails
      try {
        await sendEmail(email, emailTemplates.userRegistrationAcknowledgment(centerName, email));
        await sendEmail(
          process.env.ADMIN_EMAIL || 'admin@hitaishihealthcare.com',
          emailTemplates.adminRegistrationNotification({...centerData, centerName, id: result.insertId})
        );
      } catch (emailError) {
        console.error('Email error:', emailError);
      }

      return res.status(201).json({
        success: true,
        message: 'Registration submitted successfully. Check your email for confirmation.',
        centerId: result.insertId,
        registrationNumber: registrationNumber
      });

    } catch (error) {
      await connection.rollback();
      console.error('Registration error:', error);

      return res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
);

/**
 * GET /api/fertility/register/:id
 * Get fertility center details (for verification)
 */
router.get('/fertility/register/:id', async (req, res) => {
  try {
    const [results] = await db.promise().query(
      'SELECT * FROM fertility_centers WHERE id = ?',
      [req.params.id]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    const center = results[0];
    return res.status(200).json({
      success: true,
      data: center
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve center details'
    });
  }
});

// Admin route to list centers with filtering
router.get('/admin/fertility-centers', verifyAdminToken, async (req, res) => {
  try {
    const { status, zipcode, area } = req.query;

    let query = `SELECT * FROM fertility_centers WHERE 1=1`;
    const params = [];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (zipcode) {
      query += ` AND pincode = ?`;
      params.push(zipcode);
    }

    if (area) {
      query += ` AND area LIKE ?`;
      params.push(`%${area}%`);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await db.promise().query(query, params);

    res.json({ success: true, data: rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch centers" });
  }
});

// Admin route to get filter options
router.get('/admin/fertility-filters', verifyAdminToken, async (req, res) => {
  try {
    const [zipcodes] = await db.promise().query(
      `SELECT DISTINCT pincode FROM fertility_centers`
    );

    const [areas] = await db.promise().query(
      `SELECT DISTINCT area FROM fertility_centers`
    );

    res.json({
      zipcodes: zipcodes.map(z => z.pincode),
      areas: areas.map(a => a.area)
    });

  } catch (err) {
    res.status(500).json({ message: "Filter load failed" });
  }
});

// Admin route to approve center
router.put('/admin/fertility/approve/:id', verifyAdminToken, async (req, res) => {
  try {
    const id = req.params.id;

    const [rows] = await db.promise().query(
      `SELECT * FROM fertility_centers WHERE id = ?`, [id]
    );

    if (!rows.length) return res.status(404).json({ message: "Not found" });

    const center = rows[0];

    await db.promise().query(
      `UPDATE fertility_centers SET status='approved' WHERE id=?`, [id]
    );

    // ✅ send email
    await sendEmail(
      center.email,
      emailTemplates.centerApprovalNotification(
        center.center_name,
        center.email,
        center.registration_number
      )
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Approval failed" });
  }
});

// Admin route to reject center with reason
router.put('/admin/fertility/reject/:id', verifyAdminToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const id = req.params.id;

    const [rows] = await db.promise().query(
      `SELECT * FROM fertility_centers WHERE id = ?`, [id]
    );

    if (!rows.length) return res.status(404).json({ message: "Not found" });

    const center = rows[0];

    await db.promise().query(
      `UPDATE fertility_centers SET status='rejected' WHERE id=?`, [id]
    );

    // ✅ send email
    await sendEmail(
      center.email,
      emailTemplates.centerRejectionNotification(
        center.center_name,
        center.email,
        reason
      )
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Rejection failed" });
  }
});



/**
 * GET /api/fertility/check-availability
 * Check if registration number, email, or username is available
 */
router.get('/fertility/check-availability', async (req, res) => {
  try {
    const { registrationNumber, email, username } = req.query;
    const errors = {};

    if (registrationNumber) {
      const [result] = await db.promise().query(
        'SELECT id FROM fertility_centers WHERE registration_number = ?',
        [registrationNumber]
      );
      if (result.length > 0) errors.registrationNumber = 'Registration number already exists';
    }

    if (email) {
      const [result] = await db.promise().query(
        'SELECT id FROM fertility_centers WHERE email = ?',
        [email]
      );
      if (result.length > 0) errors.email = 'Email already registered';
    }

    if (username) {
      const [result] = await db.promise().query(
        'SELECT id FROM fertility_centers WHERE username = ?',
        [username]
      );
      if (result.length > 0) errors.username = 'Username already taken';
    }

    return res.status(200).json({
      success: Object.keys(errors).length === 0,
      errors: errors
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Availability check failed'
    });
  }
});

/* =====================
   ADMIN ROUTES - AUTHENTICATE
===================== */
const verifyAdminToken = (req, res, next) => {
  const adminToken = req.headers.authorization?.split(' ')[1];
  if (!adminToken || adminToken !== process.env.ADMIN_UNLOCK_TOKEN) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }
  next();
};

/* =====================
   ADMIN ROUTES - LIST CENTERS
===================== */
router.get('/admin/fertility', verifyAdminToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';
    const search = req.query.search || '';

    const offset = (page - 1) * limit;

    let query = 'SELECT id, center_name, email, primary_phone, city, state, status, created_at FROM fertility_centers WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (center_name LIKE ? OR email LIKE ? OR registration_number LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [centers] = await db.promise().query(query, params);

    let countQuery = 'SELECT COUNT(*) as total FROM fertility_centers WHERE 1=1';
    const countParams = [];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (search) {
      countQuery += ' AND (center_name LIKE ? OR email LIKE ? OR registration_number LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await db.promise().query(countQuery, countParams);
    const total = countResult[0].total;

    return res.status(200).json({
      success: true,
      data: centers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve fertility centers'
    });
  }
});

/* =====================
   ADMIN ROUTES - GET DETAILS
===================== */
router.get('/admin/fertility/:id', verifyAdminToken, async (req, res) => {
  try {
    const [results] = await db.promise().query(
      'SELECT * FROM fertility_centers WHERE id = ?',
      [req.params.id]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    const center = results[0];

    try {
      center.doctors = JSON.parse(center.doctors);
      center.services = JSON.parse(center.services);
      center.facilities = JSON.parse(center.facilities);
      center.languages = JSON.parse(center.languages);
      center.insurance = JSON.parse(center.insurance);
      center.certifications = JSON.parse(center.certifications);
      center.awards = JSON.parse(center.awards);
      center.doctor_certificates = JSON.parse(center.doctor_certificates);
      center.accreditation_docs = JSON.parse(center.accreditation_docs);
      center.gallery_images = JSON.parse(center.gallery_images);
      center.packages = JSON.parse(center.packages);
    } catch (e) {
      console.error('JSON parse error:', e);
    }

    return res.status(200).json({
      success: true,
      data: center
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve center details'
    });
  }
});

/* =====================
   ADMIN ROUTES - APPROVE
===================== */
router.put('/admin/fertility/:id/approve', verifyAdminToken, async (req, res) => {
  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [centers] = await connection.query(
      'SELECT * FROM fertility_centers WHERE id = ?',
      [req.params.id]
    );

    if (centers.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    const center = centers[0];

    if (center.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Center status is ${center.status}, cannot approve`
      });
    }

    await connection.query(
      'UPDATE fertility_centers SET status = ?, updated_at = NOW() WHERE id = ?',
      ['approved', req.params.id]
    );

    await connection.commit();

    try {
      await sendEmail(
        center.email,
        emailTemplates.centerApprovalNotification(
          center.center_name,
          center.email,
          center.registration_number
        )
      );

      await sendEmail(
        process.env.ADMIN_EMAIL || 'admin@hitaishihealthcare.com',
        emailTemplates.adminApprovalConfirmation(
          center.center_name,
          center.registration_number
        )
      );
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Fertility center approved successfully',
      data: {
        id: req.params.id,
        status: 'approved'
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve center'
    });
  } finally {
    connection.release();
  }
});

/* =====================
   ADMIN ROUTES - REJECT
===================== */
router.put('/admin/fertility/:id/reject', verifyAdminToken, async (req, res) => {
  const connection = await db.promise().getConnection();

  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    await connection.beginTransaction();

    const [centers] = await connection.query(
      'SELECT * FROM fertility_centers WHERE id = ?',
      [req.params.id]
    );

    if (centers.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    const center = centers[0];

    if (center.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Center status is ${center.status}, cannot reject`
      });
    }

    await connection.query(
      'UPDATE fertility_centers SET status = ?, updated_at = NOW() WHERE id = ?',
      ['rejected', req.params.id]
    );

    await connection.commit();

    try {
      await sendEmail(
        center.email,
        emailTemplates.centerRejectionNotification(
          center.center_name,
          center.email,
          reason
        )
      );

      await sendEmail(
        process.env.ADMIN_EMAIL || 'admin@hitaishihealthcare.com',
        emailTemplates.adminRejectionConfirmation(
          center.center_name,
          center.registration_number,
          reason
        )
      );
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Fertility center rejected successfully',
      data: {
        id: req.params.id,
        status: 'rejected',
        reason: reason
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject center'
    });
  } finally {
    connection.release();
  }
});

/* =====================
   ADMIN ROUTES - STATISTICS
===================== */
router.get('/admin/fertility/stats/overview', verifyAdminToken, async (req, res) => {
  try {
    const [stats] = await db.promise().query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM fertility_centers
    `);

    return res.status(200).json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics'
    });
  }
});

module.exports = router;
