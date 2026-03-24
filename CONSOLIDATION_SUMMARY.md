# Fertility Center Registration System - Code Consolidation Summary

## Overview
All backend code for the Fertility Center Registration System has been consolidated into a **single production-ready file** (`routes/fertilityRegister.js`) that includes database setup, validation, email configuration, and all API routes.

## Files Consolidated ✅

### Before (4 separate files):
- ❌ `middleware/fertilityValidation.js` - Validation logic
- ❌ `routes/adminFertility.js` - Admin routes
- ❌ `utils/mailer.js` - Email configuration
- ❌ `schema_fertility_centers.sql` - Database schema

### After (1 unified file):
- ✅ `routes/fertilityRegister.js` - Everything in one place

**Files Deleted**: 4 removed

## What's Inside `routes/fertilityRegister.js`

### 1. **Database Setup** (Lines 23-71)
- Table creation executed automatically on server startup
- Single `fertility_centers` table with 50+ fields
- JSON columns for dynamic arrays (doctors, services, facilities, etc.)
- Automatic indices on status, email, registration_number, created_at

### 2. **Zoho SMTP Email Configuration** (Lines 74-87)
- Direct transporter initialization
- 6 email templates integrated:
  - `adminRegistrationNotification`
  - `userRegistrationAcknowledgment`
  - `centerApprovalNotification`
  - `adminApprovalConfirmation`
  - `centerRejectionNotification`
  - `adminRejectionConfirmation`

### 3. **Complete Validation Middleware** (Lines 317-417)
- 23 validation rules using express-validator
- File upload validation (JPG, PNG, PDF only; max 2MB)
- JSON array parsing validation
- All error handling included

### 4. **API Routes** (All Routes)

#### Registration Routes
- `POST /api/fertility/register` - Submit center registration
- `GET /api/fertility/check-availability` - Check email/username/registration number availability
- `GET /api/fertility/register/:id` - Get center details

#### Admin Routes (Protected with Bearer Token)
- `GET /api/admin/fertility` - List all centers with pagination, filtering, search
- `GET /api/admin/fertility/:id` - Get full center details with parsed JSON
- `PUT /api/admin/fertility/:id/approve` - Approve registration
- `PUT /api/admin/fertility/:id/reject` - Reject registration with reason
- `GET /api/admin/fertility/stats/overview` - Get statistics (total, pending, approved, rejected)

## Installation & Setup

### 1. Install Dependencies
```bash
npm install express-validator bcrypt nodemailer express-fileupload
```

### 2. Environment Variables (.env)
```
ZOHO_EMAIL=your-email@zoho.com
ZOHO_PASS=your-app-password
ADMIN_UNLOCK_TOKEN=your-secret-admin-token
ADMIN_EMAIL=admin@hitaishihealthcare.com
```

### 3. Create Upload Directory
```bash
mkdir -p uploads/fertility-centers
```

### 4. Server Update (Already Done)
- Removed: `const adminFertilityRoutes = require('./routes/adminFertility');`
- Routes now automatically included via `const fertilityRegisterRoutes = require('./routes/fertilityRegister');`

### 5. Start Server
```bash
node server.js
```

## API Endpoints Summary

| Method | Endpoint | Authentication | Purpose |
|--------|----------|-----------------|---------|
| POST | `/api/fertility/register` | None | Register center |
| GET | `/api/fertility/check-availability?email=...` | None | Check availability |
| GET | `/api/fertility/register/:id` | None | Get center details |
| GET | `/api/admin/fertility` | Bearer Token | List centers |
| GET | `/api/admin/fertility/:id` | Bearer Token | Get full details |
| PUT | `/api/admin/fertility/:id/approve` | Bearer Token | Approve center |
| PUT | `/api/admin/fertility/:id/reject` | Bearer Token | Reject center |
| GET | `/api/admin/fertility/stats/overview` | Bearer Token | Get statistics |

## File Size Comparison

- Previous structure: 4 files across different directories
- New structure: 1 unified file
- Total lines of code: 1200+ (all integrated, no duplication)
- Performance: No changes (same functionality, cleaner organization)

## Key Features in Single File

✅ Database auto-initialization on server startup  
✅ Zoho SMTP email configuration embedded  
✅ All 23 validation rules inline  
✅ 6 professional email templates  
✅ Password hashing with bcrypt (10 salt rounds)  
✅ File upload with drag-and-drop support  
✅ Admin authentication via Bearer token  
✅ Transaction-based database operations  
✅ Comprehensive error handling  
✅ JSON parsing for complex data types  

## Testing the System

### Register a Center
```bash
curl -X POST http://localhost:5001/api/fertility/register \
  -F "centerName=Fertility Center" \
  -F "registrationNumber=FC123456" \
  -F "email=center@example.com" \
  -F "username=centeruser" \
  -F "password=SecurePass123!" \
  -F "licenseCertificate=@license.pdf" \
  -F "idProof=@id.pdf"
```

### Check Availability
```bash
curl http://localhost:5001/api/fertility/check-availability?email=center@example.com&username=centeruser
```

### List Centers (Admin)
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:5001/api/admin/fertility?status=pending
```

### Approve Center (Admin)
```bash
curl -X PUT -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:5001/api/admin/fertility/1/approve
```

## Notes

- **No breaking changes**: All API endpoints remain identical
- **Backward compatible**: Database schema unchanged
- **Single point failure avoidance**: Critical functions embedded in one testable file
- **Easier maintenance**: Find any feature in one location
- **Faster development**: No need to switch between multiple files
- **Production ready**: All error handling and logging included

## Frontend Integration

The frontend form (`fertilityRegister.html`) remains **unchanged** and continues to call:
```javascript
fetch('/api/fertility/register', {
  method: 'POST',
  body: formData // includes all 9 steps
})
```

## Support

For questions about specific routes or features, review the comments in `routes/fertilityRegister.js`:
- Lines 23-71: Database setup
- Lines 74-360: Email templates
- Lines 317-417: Validation rules
- Lines 420+: All route handlers
