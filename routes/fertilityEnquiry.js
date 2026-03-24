const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

// ✅ Create table if it doesn't exist
const createTable = `
  CREATE TABLE IF NOT EXISTS fertility_enquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(32) UNIQUE,
    name VARCHAR(100),
    mobile VARCHAR(20),
    email VARCHAR(100),
    city VARCHAR(100),
    zip VARCHAR(20),
    problem TEXT,
    source VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

db.query(createTable, (err) => {
  if (err) {
    console.error('❌ Failed to create fertility_enquiries table:', err.message);
  } else {
    console.log('✅ fertility_enquiries table is ready.');
  }
});

// ✅ Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.in',   // ✅ IMPORTANT
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASS
  },
  tls: {
    rejectUnauthorized: false
    }
});

// ✅ POST route to handle fertility enquiry submissions
router.post('/fertility-enquiry', (req, res) => {
  const { name, mobile, email, city, zip, problem } = req.body;

  // Basic validation
  if (!name || name.trim() === "") {
    return res.status(400).json({ status: false, error: 'Name is required.' });
  }
  if (!mobile || mobile.trim() === "") {
    return res.status(400).json({ status: false, error: 'Mobile is required.' });
  }
  if (!email || email.trim() === "") {
    return res.status(400).json({ status: false, error: 'Email is required.' });
  }
  if (!city || city.trim() === "") {
    return res.status(400).json({ status: false, error: 'City is required.' });
  }
  if (!zip || zip.trim() === "") {
    return res.status(400).json({ status: false, error: 'Zip code is required.' });
  }
  if (!problem || problem.trim() === "") {
    return res.status(400).json({ status: false, error: 'Problem description is required.' });
  }

  // ✅ Generate UID (32-character unique string)
  const uid = crypto.randomBytes(16).toString('hex');

  // ✅ Detect Source
  const origin = req.headers.origin || '';
  const source = origin.includes('localhost') ? 'localhost' : 'production';

  // ✅ Insert into database
  const sql = 'INSERT INTO fertility_enquiries (uid, name, mobile, email, city, zip, problem, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(sql, [uid, name, mobile, email, city, zip, problem, source], (err, result) => {
    if (err) {
      console.error('❌ Database insert error:', err.message);
      return res.status(500).json({ 
        status: false, 
        error: 'Failed to save your enquiry. Please try again.' 
      });
    }

    // ✅ Send confirmation email to USER
    const userMailOptions = {
      from: process.env.ZOHO_EMAIL || 'support@hitaishihealthcare.com',
      to: email,
      subject: 'Thank you for contacting Hitaishi Healthcare - Fertility Consultation',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #0d99d6 0%, #0a7aa3 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Hitaishi Healthcare</h2>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
            <h3 style="color: #0d99d6; margin-top: 0;">Hi ${name},</h3>
            
            <p style="font-size: 16px;">Thank you for submitting your details regarding fertility consultation.</p>
            
            <div style="background: white; border-left: 4px solid #0d99d6; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.8;">
                <strong>Your information is secure and confidential.</strong><br/>
                Our dedicated fertility specialists have received your enquiry and will review your case carefully.<br/>
                We will contact you shortly at your provided mobile number or email to discuss your concerns and available treatment options.
              </p>
            </div>

            <div style="background: #e8f4f8; padding: 20px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #555;">
                <strong>What happens next?</strong><br/>
                • Our specialists will review your case<br/>
                • We'll contact you within 24 hours<br/>
                • We'll discuss personalized treatment options<br/>
                • You can schedule a consultation at your convenience
              </p>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If you have any urgent concerns or need immediate assistance, please call us at our helpline or visit our clinic.
            </p>

            <p style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #999;">
              <strong>Hitaishi Healthcare Services</strong><br/>
              Comprehensive Fertility & Reproductive Health Solutions<br/>
              Email: ${process.env.ZOHO_EMAIL || 'support@hitaishihealthcare.com'}<br/>
              <br/>
              This is an automated response. Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    transporter.sendMail(userMailOptions, (err, info) => {
      if (err) {
        console.error('❌ Error sending user email:', err.message);
        // Continue even if email fails
      } else {
        console.log(`✅ Confirmation email sent to user: ${email}`);
      }
    });

    // ✅ Send detailed email to ADMIN
    const adminMailOptions = {
      from: process.env.ZOHO_EMAIL || 'support@hitaishihealthcare.com',
      to: 'hitaishihealthcare@gmail.com',
      subject: `New Fertility Enquiry - ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #0d99d6 0%, #0a7aa3 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">NEW FERTILITY ENQUIRY</h2>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
            <div style="background: white; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 12px; font-weight: 600; width: 30%; color: #0d99d6;">Enquiry ID:</td>
                  <td style="padding: 12px;"><code style="background: #f0f0f0; padding: 4px 8px; border-radius: 3px;">${uid}</code></td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 12px; font-weight: 600; color: #0d99d6;">Name:</td>
                  <td style="padding: 12px;">${name}</td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 12px; font-weight: 600; color: #0d99d6;">Mobile:</td>
                  <td style="padding: 12px;"><strong>${mobile}</strong></td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 12px; font-weight: 600; color: #0d99d6;">Email:</td>
                  <td style="padding: 12px;"><a href="mailto:${email}" style="color: #0d99d6;">${email}</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 12px; font-weight: 600; color: #0d99d6;">City:</td>
                  <td style="padding: 12px;">${city}</td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 12px; font-weight: 600; color: #0d99d6;">Zip Code:</td>
                  <td style="padding: 12px;">${zip}</td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 12px; font-weight: 600; color: #0d99d6;">Source:</td>
                  <td style="padding: 12px;"><span style="background: #e8f4f8; padding: 4px 8px; border-radius: 3px;">${source}</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 12px; font-weight: 600; color: #0d99d6;">Submitted:</td>
                  <td style="padding: 12px;">${new Date().toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 4px; border-left: 4px solid #0d99d6;">
              <h4 style="margin-top: 0; color: #0d99d6;">Fertility Concern:</h4>
              <p style="margin: 0; line-height: 1.8; white-space: pre-wrap;">${problem}</p>
            </div>

            <div style="margin-top: 30px; padding: 20px; background: #e8f4f8; border-radius: 4px;">
              <p style="margin: 0; font-size: 12px; color: #555;">
                <strong>Action Required:</strong> Please review this enquiry and contact the patient within 24 hours to discuss their fertility concerns and available treatment options.
              </p>
            </div>
          </div>
        </div>
      `
    };

    transporter.sendMail(adminMailOptions, (err, info) => {
      if (err) {
        console.error('❌ Error sending admin email:', err.message);
        // Continue even if email fails
      } else {
        console.log(`✅ Enquiry notification sent to admin`);
      }
    });

    // Success response
    return res.status(200).json({
      status: true,
      message: '✅ Your enquiry has been submitted successfully!',
      uid: uid,
      id: result.insertId
    });
  });
});

module.exports = router;
