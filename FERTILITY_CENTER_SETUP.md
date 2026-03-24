# Fertility Center Registration System - Setup & Documentation

## Overview

This is a complete production-ready Fertility Center Registration System built with Node.js, Express, MySQL, and plain HTML/CSS. The system handles multi-step registration, document uploads, admin approval workflow, and email notifications via Zoho SMTP.

---

## 🗂️ PROJECT STRUCTURE

```
hitaishihealthcare/
├── fertilityRegister.html          # Frontend multi-step form (9 steps)
├── schema_fertility_centers.sql    # Database schema
├── server.js                       # Express server (updated with fertility routes)
├── db.js                           # MySQL connection pool
├── .env                            # Environment variables
├── routes/
│   ├── fertilityRegister.js        # Registration API endpoint
│   └── adminFertility.js           # Admin approval/rejection APIs
├── middleware/
│   └── fertilityValidation.js      # Validation rules and handlers
├── utils/
│   └── mailer.js                   # Zoho SMTP email configuration
└── uploads/fertility-centers/      # Document storage (auto-created)
```

---

## 🗄️ DATABASE SETUP

### 1. Create the Table

Run this SQL query in your MySQL database:

```sql
-- From schema_fertility_centers.sql
CREATE TABLE IF NOT EXISTS fertility_centers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Basic Info
  center_name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100) UNIQUE NOT NULL,
  establishment_year INT,
  center_type VARCHAR(100),
  description LONGTEXT,
  logo VARCHAR(500),
  gallery_images JSON,

  -- Location
  country VARCHAR(100),
  state VARCHAR(100),
  city VARCHAR(100),
  area VARCHAR(150),
  address LONGTEXT,
  pincode VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Contact
  primary_phone VARCHAR(15),
  alternate_phone VARCHAR(15),
  email VARCHAR(255) NOT NULL UNIQUE,
  website VARCHAR(255),
  emergency_contact VARCHAR(15),

  -- Doctors (JSON Array)
  doctors JSON,

  -- Services (JSON Array)
  services JSON,

  -- Facilities (JSON)
  facilities JSON,

  -- Success Metrics
  ivf_success_rate DECIMAL(5, 2),
  total_cycles INT,
  years_experience INT,
  certifications JSON,

  -- Pricing
  ivf_cost_range VARCHAR(100),
  iui_cost DECIMAL(10, 2),
  consultation_fee DECIMAL(10, 2),
  packages JSON,

  -- Working Hours
  opening_time TIME,
  closing_time TIME,
  working_days VARCHAR(100),
  emergency_available BOOLEAN DEFAULT FALSE,

  -- Documents
  license_certificate VARCHAR(500),
  doctor_certificates JSON,
  accreditation_docs JSON,
  id_proof VARCHAR(500),

  -- Account
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,

  -- Additional
  insurance JSON,
  languages JSON,
  awards JSON,

  -- System Fields
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indices
  INDEX idx_status (status),
  INDEX idx_email (email),
  INDEX idx_registration_number (registration_number),
  INDEX idx_created_at (created_at)
);
```

---

## 🔧 INSTALLATION & SETUP

### 1. Install Dependencies

```bash
npm install express-validator bcrypt nodemailer express-fileupload
```

### 2. Environment Variables (.env)

Add these to your `.env` file:

```env
# Existing variables
AI_KEY=AIzaSyB3ebJaiaYFyB30sGAx1PmfmgnDPFCajKk
SESSION_SECRET=7e888a780e8bcd15b2ea36715e9685058b7b3276c3ff9ae5a56c36d9700aa09c1c1159b40fd1d21a504bc141fda2e43b29e582845f00f34f5a00be9d9669e6c3
ADMIN_UNLOCK_TOKEN=9e8acf788e1f33c1608f8e84d4e10d2a8248e2d2ece2d0ddd9c80cdc1a93afeae010fdbbc86f8ae50cd57eb77a7d482733f99f26b1d64c5d5da84f3bf9395c97
PORT=5001

# Zoho Email Configuration
ZOHO_EMAIL=support@hitaishihealthcare.com
ZOHO_PASS=JPUuP26FEcQy

# Admin Email (for notifications)
ADMIN_EMAIL=admin@hitaishihealthcare.com
```

### 3. Database Connection

Update `db.js` if needed (currently using localhost:3306):

```javascript
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '2142',
  database: 'hitaishi_healthcare',
  port: 3306
});
```

---

## 🚀 API ENDPOINTS

### 1. Registration Endpoint

**POST** `/api/fertility/register`

Request Body (multipart/form-data):
```json
{
  "centerName": "ABC Fertility Center",
  "registrationNumber": "FC-2024-001",
  "establishmentYear": 2015,
  "centerType": "Hospital",
  "description": "Leading fertility center...",
  "country": "India",
  "state": "Karnataka",
  "city": "Bangalore",
  "address": "123 Medical Street",
  "pincode": "560001",
  "primaryPhone": "9876543210",
  "email": "center@example.com",
  "doctors": "[{\"name\": \"Dr. Name\", \"specialization\": \"...\"}]",
  "services": "[\"IVF\", \"IUI\"]",
  "facilities": "[\"Lab\", \"Ultrasound\"]",
  "username": "centerlogin",
  "password": "Secure@123"
}
```

Response (Success - 201):
```json
{
  "success": true,
  "message": "Registration submitted successfully",
  "centerId": 1,
  "registrationNumber": "FC-2024-001"
}
```

### 2. Check Availability

**GET** `/api/fertility/check-availability?registrationNumber=FC-2024-001&email=center@example.com&username=centerlogin`

Response:
```json
{
  "success": true,
  "errors": {}
}
```

### 3. Admin - List Registrations

**GET** `/api/admin/fertility?page=1&limit=10&status=pending&search=center`

Headers:
```
Authorization: Bearer 9e8acf788e1f33c1608f8e84d4e10d2a8248e2d2ece2d0ddd9c80cdc1a93afeae010fdbbc86f8ae50cd57eb77a7d482733f99f26b1d64c5d5da84f3bf9395c97
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "center_name": "ABC Fertility Center",
      "email": "center@example.com",
      "status": "pending",
      "created_at": "2024-03-24 10:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

### 4. Admin - Get Center Details

**GET** `/api/admin/fertility/:id`

Headers: (Include Authorization token)

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "center_name": "ABC Fertility Center",
    "...": "all center fields with parsed JSON"
  }
}
```

### 5. Admin - Approve Registration

**PUT** `/api/admin/fertility/:id/approve`

Headers: (Include Authorization token)

Response:
```json
{
  "success": true,
  "message": "Fertility center approved successfully",
  "data": {
    "id": 1,
    "status": "approved"
  }
}
```

### 6. Admin - Reject Registration

**PUT** `/api/admin/fertility/:id/reject`

Headers: (Include Authorization token)

Request Body:
```json
{
  "reason": "Documentation incomplete. Please provide updated certifications."
}
```

Response:
```json
{
  "success": true,
  "message": "Fertility center rejected successfully",
  "data": {
    "id": 1,
    "status": "rejected",
    "reason": "..."
  }
}
```

### 7. Admin - Get Statistics

**GET** `/api/admin/fertility/stats/overview`

Response:
```json
{
  "success": true,
  "data": {
    "total": 15,
    "pending": 5,
    "approved": 8,
    "rejected": 2
  }
}
```

---

## 📋 FRONTEND - Multi-Step Form

### File: `fertilityRegister.html`

The form has **9 steps**:

1. **Basic Information** - Center name, registration number, type, description
2. **Location** - Country, state, city, address, pincode, GPS coordinates
3. **Contact** - Phone numbers, email, website, languages
4. **Medical Staff** - Add multiple doctors with qualifications
5. **Services & Facilities** - Select services (IVF, IUI, etc.) and facilities
6. **Success Metrics & Pricing** - Success rates, costs, experience
7. **Document Upload** - License, certificates, ID proof
8. **Account Setup** - Username, password (with strength validation)
9. **Review & Submit** - Final review before submission

### Features:
- ✅ Progressive step indicator with completion status
- ✅ Real-time validation with error messages
- ✅ File upload with preview and size validation (max 2MB)
- ✅ Drag-and-drop file upload
- ✅ Add/remove doctors dynamically
- ✅ Password strength indicator
- ✅ Mobile responsive design
- ✅ Smooth animations and transitions
- ✅ Success page after submission

### Usage:
1. Navigate to: `http://localhost:5001/fertilityRegister.html`
2. Fill out the 9-step form
3. System validates at each step
4. Submit sends multipart/form-data to backend
5. Success page displayed on completion

---

## 📧 EMAIL FLOW

### Email Sequence:

#### 1. On Registration Submission:
- **To User**: "Your registration is under review"
- **To Admin**: "New Fertility Center Registration Received"

#### 2. On Admin Approval:
- **To User**: "Your center has been approved" ✅
- **To Admin**: "Center approved successfully"

#### 3. On Admin Rejection:
- **To User**: "Your registration was rejected" 
- **To Admin**: "Center rejected"

### Zoho SMTP Configuration:
```
Host: smtp.zoho.com
Port: 465 (SSL)
Email: support@hitaishihealthcare.com
Password: (from .env)
```

---

## 🔒 VALIDATION RULES

### Email
- Valid email format

### Phone
- Exactly 10 digits
- Format: [0-9]{10}

### Registration Number
- Minimum 5 characters
- Unique in database

### Password
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*)
- Example: `Secure@123`

### Files
- Type: JPG, PNG, PDF only
- Size: Maximum 2MB
- Required: License Certificate, ID Proof

### Pincode
- Exactly 6 digits

---

## 🔐 SECURITY MEASURES

✅ Password hashing with bcrypt (10 salt rounds)
✅ Prepared statements to prevent SQL injection
✅ Input validation with express-validator
✅ File type and size validation
✅ Unique constraint enforcement (email, registration number, username)
✅ Admin authentication with token verification
✅ CORS enabled for specific origins
✅ Session management with httpOnly cookies
✅ HTTPS ready (secure flag can be enabled in production)

---

## 🛠️ ADMIN PANEL INTEGRATION

### Access Admin Fertility Panel:
1. Go to Admin Dashboard
2. Add a new section "Fertility Centers"
3. Use the API endpoints with Authorization header

### Quick Test:
```bash
curl -H "Authorization: Bearer 9e8acf788e1f33c1608f8e84d4e10d2a8248e2d2ece2d0ddd9c80cdc1a93afeae010fdbbc86f8ae50cd57eb77a7d482733f99f26b1d64c5d5da84f3bf9395c97" \
  http://localhost:5001/api/admin/fertility
```

---

## 📁 FILE STRUCTURE

### Uploaded Files Location:
```
uploads/
└── fertility-centers/
    ├── logo-1711270400000-centerlogo.png
    ├── license-1711270400001-license.pdf
    ├── doctor-cert-1711270400002-cert.pdf
    ├── id-1711270400003-id.jpg
    └── accred-*.pdf
```

---

## ✅ TESTING CHECKLIST

- [ ] MySQL table created successfully
- [ ] Server starts without errors
- [ ] Frontend form loads at `http://localhost:5001/fertilityRegister.html`
- [ ] Form validation works on each step
- [ ] File upload works with preview
- [ ] Password strength indicator displays correctly
- [ ] Doctors can be added/removed dynamically
- [ ] Form submission sends data to backend
- [ ] Registration email sent to user
- [ ] Admin notification email sent
- [ ] Admin can view pending registrations
- [ ] Admin can approve registration (approval email sent)
- [ ] Admin can reject registration (rejection email sent)
- [ ] Duplicate registration number prevented
- [ ] Duplicate email prevented
- [ ] Duplicate username prevented

---

## 🚨 TROUBLESHOOTING

### Issue: "Database connection error"
**Solution**: Check MySQL is running and credentials in db.js are correct

### Issue: "Email not sending"
**Solution**: Verify Zoho credentials in .env file and internet connection

### Issue: "File upload fails"
**Solution**: Ensure `uploads/fertility-centers/` directory exists and has write permissions

### Issue: "Admin endpoints return 401"
**Solution**: Include proper Authorization header with token from .env ADMIN_UNLOCK_TOKEN

### Issue: "Validation errors persist"
**Solution**: Check browser console for specific validation messages

---

## 📝 NOTES

1. **Status Values**: `pending` → (admin reviews) → `approved` or `rejected`
2. **Doctors**: Stored as JSON array, can add unlimited doctors
3. **Services**: Multi-select, stored as JSON array
4. **Files**: All uploads automatically timestamped to prevent overwrites
5. **Email**: Currently uses Zoho SMTP, can be switched to other providers
6. **Admin Token**: Can be changed in .env file
7. **Passwords**: Hashed with bcrypt, never stored in plain text

---

## 🔄 WORKFLOW DIAGRAM

```
User Registration Form
    ↓
Frontend Validation
    ↓
File Upload Handling
    ↓
POST /api/fertility/register
    ↓
Backend Validation
    ↓
Database Transaction
    ↓
Send Confirmation Emails
    ↓
Success Response
    ↓
Admin Dashboard
    ↓
Review Documents & Data
    ↓
Approve/Reject Decision
    ↓
PUT /api/admin/fertility/:id/approve (or /reject)
    ↓
Update Status in DB
    ↓
Send Status Update Emails
    ↓
Center Gets Dashboard Access (if approved)
```

---

## 📞 SUPPORT

For issues or questions:
1. Check this documentation
2. Review browser console for client-side errors
3. Check server logs for backend errors
4. Verify .env configuration
5. Check database connection and table structure

---

Generated: March 24, 2024
Hitaishi Healthcare - Fertility Center Registration System
