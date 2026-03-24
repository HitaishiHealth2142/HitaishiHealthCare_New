# Fertility Center Registration System - Configuration Reference

## 📁 FILE SUMMARY

| File | Purpose | Status |
|------|---------|--------|
| `fertilityRegister.html` | Frontend multi-step registration form | ✅ Created |
| `schema_fertility_centers.sql` | MySQL database schema | ✅ Created |
| `routes/fertilityRegister.js` | Registration API endpoints | ✅ Created |
| `routes/adminFertility.js` | Admin approval/rejection APIs | ✅ Created |
| `middleware/fertilityValidation.js` | Input validation middleware | ✅ Created |
| `utils/mailer.js` | Zoho SMTP email configuration | ✅ Created |
| `server.js` | Express server (updated) | ✅ Updated |
| `FERTILITY_CENTER_SETUP.md` | Complete setup guide | ✅ Created |
| `API_EXAMPLES.md` | API examples and test cases | ✅ Created |
| `DEPENDENCIES.md` | Required npm packages | ✅ Created |

---

## 🔧 CONFIGURATION CHECKLIST

### Step 1: Database Setup
- [ ] MySQL server running on localhost:3306
- [ ] Database `hitaishi_healthcare` exists
- [ ] Run schema_fertility_centers.sql to create table
- [ ] Verify table `fertility_centers` created successfully

### Step 2: Environment Variables
- [ ] `.env` file exists with all required variables
- [ ] `ZOHO_EMAIL` configured (support@hitaishihealthcare.com)
- [ ] `ZOHO_PASS` configured (from .env)
- [ ] `ADMIN_UNLOCK_TOKEN` set
- [ ] `ADMIN_EMAIL` configured for admin notifications

### Step 3: Dependencies
- [ ] Run `npm install express-validator bcrypt nodemailer express-fileupload`
- [ ] Verify all packages installed
- [ ] Check node_modules directory

### Step 4: Server Setup
- [ ] Update server.js with fertility routes (✅ Done)
- [ ] Create uploads/fertility-centers directory
- [ ] Ensure express-fileupload plugin loaded

### Step 5: Test Endpoints
- [ ] Test registration endpoint (POST)
- [ ] Test availability check endpoint (GET)
- [ ] Test admin list endpoint (GET)
- [ ] Test admin approve endpoint (PUT)
- [ ] Test admin reject endpoint (PUT)

---

## 📊 DATABASE FIELD EXPLAINED

### Basic Information
```
center_name (VARCHAR)          - Fertility center name
registration_number (VARCHAR)  - Unique registration ID
establishment_year (INT)       - Year center was established
center_type (VARCHAR)          - Hospital/Clinic/Research Center
description (LONGTEXT)         - Center description
logo (VARCHAR)                 - Logo file path
gallery_images (JSON)          - Array of gallery images
```

### Location Fields
```
country (VARCHAR)              - Country name
state (VARCHAR)                - State/Province
city (VARCHAR)                 - City name
area (VARCHAR)                 - Locality/Area
address (LONGTEXT)             - Full address
pincode (VARCHAR)              - 6-digit pincode
latitude (DECIMAL)             - GPS latitude
longitude (DECIMAL)            - GPS longitude
```

### Contact Fields
```
primary_phone (VARCHAR)        - Main contact number
alternate_phone (VARCHAR)      - Backup contact number
email (VARCHAR)                - Center email (UNIQUE)
website (VARCHAR)              - Center website URL
emergency_contact (VARCHAR)    - Emergency contact number
```

### Medical Information
```
doctors (JSON)                 - Array of doctor objects
services (JSON)                - Array of available services
facilities (JSON)              - Array of facilities
ivf_success_rate (DECIMAL)     - IVF success percentage (0-100)
total_cycles (INT)             - Total cycles completed
years_experience (INT)         - Years in operation
certifications (JSON)          - Array of certifications
```

### Pricing
```
ivf_cost_range (VARCHAR)       - e.g., "100000-300000"
iui_cost (DECIMAL)             - IUI procedure cost
consultation_fee (DECIMAL)     - Initial consultation fee
packages (JSON)                - Custom package offerings
```

### Working Hours
```
opening_time (TIME)            - Center opening time
closing_time (TIME)            - Center closing time
working_days (VARCHAR)         - Operating days (e.g., "Mon-Fri")
emergency_available (BOOLEAN)  - 24/7 emergency services
```

### Documents
```
license_certificate (VARCHAR)  - License file path
doctor_certificates (JSON)     - Array of certificate paths
accreditation_docs (JSON)      - Array of accreditation paths
id_proof (VARCHAR)             - Owner ID proof file path
```

### Account
```
username (VARCHAR)             - Login username (UNIQUE)
password (VARCHAR)             - Hashed password (bcrypt)
```

### Additional
```
insurance (JSON)               - Array of accepted insurance types
languages (JSON)               - Array of supported languages
awards (JSON)                  - Array of awards received
```

### System Fields
```
status (ENUM)                  - pending/approved/rejected
created_at (TIMESTAMP)         - Registration creation time
updated_at (TIMESTAMP)         - Last update timestamp
```

---

## 🎛️ CUSTOMIZATION OPTIONS

### Change Admin Token
1. Open `.env`
2. Generate new token: `openssl rand -hex 64`
3. Update `ADMIN_UNLOCK_TOKEN` value

### Change Email Provider
1. Open `utils/mailer.js`
2. Modify SMTP configuration:
   ```javascript
   const transporter = nodemailer.createTransport({
     host: 'smtp.your-provider.com',
     port: 465,
     secure: true,
     auth: {
       user: 'your-email@domain.com',
       pass: 'your-password'
     }
   });
   ```

### Add New Services
1. Open `fertilityRegister.html`
2. Find `#servicesContainer`
3. Add new service option:
   ```html
   <div class="multi-select-item" data-service="Your Service">Your Service</div>
   ```

### Customize Validation Rules
1. Open `middleware/fertilityValidation.js`
2. Modify validation rules:
   ```javascript
   body('centerName').isLength({ min: 5 }).withMessage('Min 5 characters')
   ```

### Change File Upload Limits
1. Open `routes/fertilityRegister.js`
2. Modify multer limits:
   ```javascript
   const upload = multer({
     limits: { fileSize: 5 * 1024 * 1024 }  // 5MB
   });
   ```

---

## 🔐 SECURITY CONFIGURATION

### Password Requirements (Current)
- Minimum: 8 characters
- Must contain: 1 uppercase, 1 number, 1 special character
- Regex: `/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/`

### File Upload Restrictions
- Allowed types: JPG, PNG, PDF
- Maximum size: 2MB per file
- Storage location: `/uploads/fertility-centers/`

### Database Security
- SQL Injection prevention: Prepared statements
- Password protection: Bcrypt with 10 salt rounds
- Duplicate prevention: Unique constraints on email, registration number, username
- CORS: Restricted to whitelisted domains

### Admin Access
- Token-based authentication
- Token validation on every request
- Stored in .env (not in code)
- Should be rotated regularly

---

## 📧 EMAIL TEMPLATES

All email templates are in `utils/mailer.js`:

1. **userRegistrationAcknowledgment**
   - Sent when user submits registration
   - Confirms receipt and sets expectations
   
2. **adminRegistrationNotification**
   - Sent to admin when new registration received
   - Contains all center details
   
3. **centerApprovalNotification**
   - Sent when center is approved
   - Includes registration number and dashboard link
   
4. **adminApprovalConfirmation**
   - Confirmation email to admin
   - Records approval action
   
5. **centerRejectionNotification**
   - Sent when registration is rejected
   - Includes reason and next steps
   
6. **adminRejectionConfirmation**
   - Confirmation to admin
   - Records rejection action

---

## 🛠️ MAINTENANCE

### Regular Tasks
- [ ] Monitor rejected applications for patterns
- [ ] Review and update service offerings
- [ ] Check email delivery (in case of failures)
- [ ] Backup database daily
- [ ] Update SSL certificates annually
- [ ] Review and rotate admin token quarterly

### Monitoring
- Check server logs for errors
- Monitor successful registrations
- Track approval/rejection ratio
- Monitor email sending failures
- Track API response times

### Backups
- Database: Daily backup recommended
- Documents: Automated via cloud storage
- Configuration: Keep .env backed up securely

---

## 🚀 PERFORMANCE OPTIMIZATION

### Database Queries
- Indices created on: status, email, registration_number, created_at
- Use pagination for admin list (default 10 per page)
- Implement caching for frequently accessed data

### File Upload
- Use Amazon S3 or similar for production file storage
- Compress images before upload
- Archive old documents periodically

### Email Sending
- Queue email sending for high volume
- Implement retry logic for failed emails
- Monitor Zoho API limits

---

## 📞 COMMON ISSUES & SOLUTIONS

**Issue: "Connection refused" on database**
- Verify MySQL is running
- Check connection credentials in db.js
- Ensure database exists

**Issue: "File too large" error**
- Check file size (max 2MB)
- Verify multer configuration
- Check disk space on server

**Issue: "Email not sending"**
- Verify Zoho credentials in .env
- Check internet connection
- Review email logs in server console
- Verify email recipient exists

**Issue: "Invalid token" for admin**
- Check Authorization header format
- Verify token matches .env ADMIN_UNLOCK_TOKEN
- Ensure Bearer prefix is included

**Issue: "Duplicate key value" error**
- Email already registered
- Username already taken
- Registration number already exists
- Check before registration with /check-availability

---

## 📚 DOCUMENTATION FILES

- `FERTILITY_CENTER_SETUP.md` - Complete setup guide
- `API_EXAMPLES.md` - API examples and test cases
- `DEPENDENCIES.md` - Required npm packages
- `CONFIG_REFERENCE.md` - This file
- `schema_fertility_centers.sql` - Database schema

---

**Last Updated:** March 24, 2024
**Version:** 1.0
**Status:** Production Ready
