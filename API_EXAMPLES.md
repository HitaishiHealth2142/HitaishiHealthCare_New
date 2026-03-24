# Fertility Center Registration API - Examples & Testing

## 🧪 TESTING WITH CURL

### 1. Check Email Availability
```bash
curl -X GET "http://localhost:5001/api/fertility/check-availability?email=center@example.com&username=centerlogin&registrationNumber=FC-2024-001" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "errors": {}
}
```

---

### 2. Submit Registration (Multi-part Form Data)

```bash
curl -X POST "http://localhost:5001/api/fertility/register" \
  -F "centerName=ABC Fertility Center" \
  -F "registrationNumber=FC-2024-001" \
  -F "establishmentYear=2015" \
  -F "centerType=Hospital" \
  -F "description=A leading fertility treatment center..." \
  -F "country=India" \
  -F "state=Karnataka" \
  -F "city=Bangalore" \
  -F "area=Koramangala" \
  -F "address=123 Medical Street, Bangalore" \
  -F "pincode=560001" \
  -F "latitude=12.9352" \
  -F "longitude=77.6245" \
  -F "primaryPhone=9876543210" \
  -F "alternatePhone=9876543211" \
  -F "email=center@example.com" \
  -F "website=https://example.com" \
  -F "emergencyContact=9876543212" \
  -F "doctors=[{\"name\":\"Dr. John Smith\",\"specialization\":\"Reproductive Endocrinologist\",\"qualification\":\"MD\",\"experience\":15}]" \
  -F "services=[\"IVF\",\"IUI\",\"PGD\"]" \
  -F "facilities=[\"Operation Theater\",\"Lab\",\"Ultrasound\"]" \
  -F "languages=[\"English\",\"Hindi\"]" \
  -F "insurance=[\"Cashless\",\"Reimbursement\"]" \
  -F "ivfSuccessRate=65.5" \
  -F "totalCycles=1200" \
  -F "yearsExperience=20" \
  -F "consultationFee=500" \
  -F "ivfCostRange=100000-300000" \
  -F "iuiCost=15000" \
  -F "certifications=ISO 9001, ISAR Certified" \
  -F "awards=Best Fertility Center 2023" \
  -F "username=centerlogin" \
  -F "password=Secure@123" \
  -F "logo=@/path/to/logo.png" \
  -F "licenseCertificate=@/path/to/license.pdf" \
  -F "doctorCertificates=@/path/to/cert1.pdf" \
  -F "doctorCertificates=@/path/to/cert2.pdf" \
  -F "accreditationDocs=@/path/to/accred.pdf" \
  -F "idProof=@/path/to/id.jpg"
```

Response:
```json
{
  "success": true,
  "message": "Registration submitted successfully. Please check your email for confirmation.",
  "centerId": 1,
  "registrationNumber": "FC-2024-001"
}
```

---

### 3. Admin - List Pending Registrations

```bash
curl -X GET "http://localhost:5001/api/admin/fertility?page=1&limit=10&status=pending" \
  -H "Authorization: Bearer 9e8acf788e1f33c1608f8e84d4e10d2a8248e2d2ece2d0ddd9c80cdc1a93afeae010fdbbc86f8ae50cd57eb77a7d482733f99f26b1d64c5d5da84f3bf9395c97" \
  -H "Content-Type: application/json"
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
      "primary_phone": "9876543210",
      "city": "Bangalore",
      "state": "Karnataka",
      "status": "pending",
      "created_at": "2024-03-24 10:30:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

---

### 4. Admin - Get Center Details

```bash
curl -X GET "http://localhost:5001/api/admin/fertility/1" \
  -H "Authorization: Bearer 9e8acf788e1f33c1608f8e84d4e10d2a8248e2d2ece2d0ddd9c80cdc1a93afeae010fdbbc86f8ae50cd57eb77a7d482733f99f26b1d64c5d5da84f3bf9395c97" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "center_name": "ABC Fertility Center",
    "registration_number": "FC-2024-001",
    "establishment_year": 2015,
    "center_type": "Hospital",
    "description": "A leading fertility treatment center...",
    "country": "India",
    "state": "Karnataka",
    "city": "Bangalore",
    "email": "center@example.com",
    "primary_phone": "9876543210",
    "doctors": [
      {
        "name": "Dr. John Smith",
        "specialization": "Reproductive Endocrinologist",
        "qualification": "MD",
        "experience": 15
      }
    ],
    "services": ["IVF", "IUI", "PGD"],
    "facilities": ["Operation Theater", "Lab", "Ultrasound"],
    "status": "pending",
    "created_at": "2024-03-24 10:30:00",
    "license_certificate": "/uploads/fertility-centers/license-1711270400000-license.pdf",
    "doctor_certificates": ["/uploads/fertility-centers/doctor-cert-1711270400001-cert.pdf"],
    "id_proof": "/uploads/fertility-centers/id-1711270400002-id.jpg"
  }
}
```

---

### 5. Admin - Approve Registration

```bash
curl -X PUT "http://localhost:5001/api/admin/fertility/1/approve" \
  -H "Authorization: Bearer 9e8acf788e1f33c1608f8e84d4e10d2a8248e2d2ece2d0ddd9c80cdc1a93afeae010fdbbc86f8ae50cd57eb77a7d482733f99f26b1d64c5d5da84f3bf9395c97" \
  -H "Content-Type: application/json"
```

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

---

### 6. Admin - Reject Registration

```bash
curl -X PUT "http://localhost:5001/api/admin/fertility/1/reject" \
  -H "Authorization: Bearer 9e8acf788e1f33c1608f8e84d4e10d2a8248e2d2ece2d0ddd9c80cdc1a93afeae010fdbbc86f8ae50cd57eb77a7d482733f99f26b1d64c5d5da84f3bf9395c97" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Documentation incomplete. License certificate is missing recent renewal. Please reapply after providing updated documents."
  }'
```

Response:
```json
{
  "success": true,
  "message": "Fertility center rejected successfully",
  "data": {
    "id": 1,
    "status": "rejected",
    "reason": "Documentation incomplete. License certificate is missing recent renewal..."
  }
}
```

---

### 7. Admin - Get Statistics

```bash
curl -X GET "http://localhost:5001/api/admin/fertility/stats/overview" \
  -H "Authorization: Bearer 9e8acf788e1f33c1608f8e84d4e10d2a8248e2d2ece2d0ddd9c80cdc1a93afeae010fdbbc86f8ae50cd57eb77a7d482733f99f26b1d64c5d5da84f3bf9395c97" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "data": {
    "total": 25,
    "pending": 5,
    "approved": 18,
    "rejected": 2
  }
}
```

---

### 8. Search Centers

```bash
curl -X GET "http://localhost:5001/api/admin/fertility?search=ABC&status=approved" \
  -H "Authorization: Bearer 9e8acf788e1f33c1608f8e84d4e10d2a8248e2d2ece2d0ddd9c80cdc1a93afeae010fdbbc86f8ae50cd57eb77a7d482733f99f26b1d64c5d5da84f3bf9395c97" \
  -H "Content-Type: application/json"
```

---

## 📱 TESTING WITH JAVASCRIPT/FETCH

### Register Center

```javascript
async function registerCenter() {
  const formData = new FormData();
  
  // Text fields
  formData.append('centerName', 'ABC Fertility Center');
  formData.append('registrationNumber', 'FC-2024-001');
  formData.append('establishmentYear', 2015);
  formData.append('centerType', 'Hospital');
  formData.append('description', 'Leading fertility center...');
  formData.append('country', 'India');
  formData.append('state', 'Karnataka');
  formData.append('city', 'Bangalore');
  formData.append('pincode', '560001');
  formData.append('primaryPhone', '9876543210');
  formData.append('email', 'center@example.com');
  
  // JSON arrays
  formData.append('doctors', JSON.stringify([
    {
      name: 'Dr. John Smith',
      specialization: 'Reproductive Endocrinologist',
      qualification: 'MD',
      experience: 15
    }
  ]));
  formData.append('services', JSON.stringify(['IVF', 'IUI', 'PGD']));
  formData.append('facilities', JSON.stringify(['Lab', 'Ultrasound']));
  
  // Account
  formData.append('username', 'centerlogin');
  formData.append('password', 'Secure@123');
  
  // Files
  formData.append('logo', logoFile);
  formData.append('licenseCertificate', licenseFile);
  formData.append('idProof', idProofFile);
  
  try {
    const response = await fetch('http://localhost:5001/api/fertility/register', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    console.log(data);
    
    if (data.success) {
      alert('Registration successful! Center ID: ' + data.centerId);
    } else {
      alert('Error: ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

### Admin List & Approve

```javascript
const ADMIN_TOKEN = '9e8acf788e1f33c1608f8e84d4e10d2a8248e2d2ece2d0ddd9c80cdc1a93afeae010fdbbc86f8ae50cd57eb77a7d482733f99f26b1d64c5d5da84f3bf9395c97';

async function listPendingCenters() {
  try {
    const response = await fetch(
      'http://localhost:5001/api/admin/fertility?status=pending',
      {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    console.log('Pending centers:', data.data);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function approveCenter(centerId) {
  try {
    const response = await fetch(
      `http://localhost:5001/api/admin/fertility/${centerId}/approve`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    console.log('Approval result:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function rejectCenter(centerId, reason) {
  try {
    const response = await fetch(
      `http://localhost:5001/api/admin/fertility/${centerId}/reject`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      }
    );
    
    const data = await response.json();
    console.log('Rejection result:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## 🔴 ERROR RESPONSES

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "primaryPhone",
      "message": "Phone must be 10 digits"
    }
  ]
}
```

### Duplicate Registration (409)
```json
{
  "success": false,
  "message": "Registration number, email, or username already exists"
}
```

### File Validation Error (400)
```json
{
  "success": false,
  "message": "File validation failed",
  "errors": [
    "licenseCertificate: Only JPG, PNG, and PDF are allowed",
    "logo: File size must not exceed 2MB"
  ]
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Center not found"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Registration failed",
  "error": "Error details..."
}
```

---

## 🧪 POSTMAN COLLECTION

Import this into Postman:

```json
{
  "info": {
    "name": "Fertility Center Registration API",
    "description": "Complete API collection for fertility center registration system"
  },
  "item": [
    {
      "name": "Check Availability",
      "request": {
        "method": "GET",
        "url": "http://localhost:5001/api/fertility/check-availability",
        "params": [
          {"key": "email", "value": "center@example.com"},
          {"key": "username", "value": "centerlogin"},
          {"key": "registrationNumber", "value": "FC-2024-001"}
        ]
      }
    },
    {
      "name": "Register Center",
      "request": {
        "method": "POST",
        "url": "http://localhost:5001/api/fertility/register",
        "body": {
          "mode": "formdata",
          "formdata": [
            {"key": "centerName", "value": "ABC Fertility Center", "type": "text"},
            {"key": "registrationNumber", "value": "FC-2024-001", "type": "text"},
            {"key": "email", "value": "center@example.com", "type": "text"},
            {"key": "username", "value": "centerlogin", "type": "text"},
            {"key": "password", "value": "Secure@123", "type": "text"}
          ]
        }
      }
    },
    {
      "name": "Admin - List Centers",
      "request": {
        "method": "GET",
        "url": "http://localhost:5001/api/admin/fertility",
        "header": [
          {"key": "Authorization", "value": "Bearer 9e8acf788e1f33c1608f8e84d4e10d2a8248e2d2ece2d0ddd9c80cdc1a93afeae010fdbbc86f8ae50cd57eb77a7d482733f99f26b1d64c5d5da84f3bf9395c97"}
        ]
      }
    }
  ]
}
```

---

## 📊 TEST DATA

### Valid Fertility Center Data

```json
{
  "centerName": "Fertility Excellence Center",
  "registrationNumber": "FC-2024-001",
  "establishmentYear": 2012,
  "centerType": "Hospital",
  "description": "State-of-the-art fertility center with advanced technology and experienced team",
  "country": "India",
  "state": "Karnataka",
  "city": "Bangalore",
  "area": "Indiranagar",
  "address": "456 Fertility Road, Indiranagar, Bangalore",
  "pincode": "560038",
  "latitude": 12.9716,
  "longitude": 77.6412,
  "primaryPhone": "9988776655",
  "alternatePhone": "9988776656",
  "email": "fertility@excellence.com",
  "website": "https://fertilityexcellence.com",
  "emergencyContact": "9988776657",
  "ivfSuccessRate": 68.5,
  "totalCycles": 2500,
  "yearsExperience": 25,
  "consultationFee": 750,
  "ivfCostRange": "120000-350000",
  "iuiCost": 18000,
  "certifications": "ISO 9001:2015, ISAR Certified, ASRM Member",
  "awards": "Best Fertility Center 2023, Innovation Award 2024",
  "username": "fertilityexcel",
  "password": "FertileCare@2024"
}
```

---

## ✅ VALIDATION TEST CASES

### Password Validation
- ✅ Valid: `Secure@123`
- ❌ Invalid: `secure123` (no uppercase)
- ❌ Invalid: `SECURE@` (no number)
- ❌ Invalid: `Secure123` (no special char)
- ❌ Invalid: `Sec@1` (too short)

### Phone Validation
- ✅ Valid: `9876543210`
- ❌ Invalid: `98765432` (too short)
- ❌ Invalid: `987654321012` (too long)
- ❌ Invalid: `98765432AB` (contains letters)

### Email Validation
- ✅ Valid: `center@example.com`
- ❌ Invalid: `center@` (incomplete)
- ❌ Invalid: `center.example.com` (no @)
- ❌ Invalid: `center@.com` (missing domain)

---

Last Updated: March 24, 2024
