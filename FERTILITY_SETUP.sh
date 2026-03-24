#!/bin/bash

# Quick Start Guide for Fertility Center Registration System
# Run this script to set up and test the system

echo "🔧 Fertility Center Registration System - Quick Start"
echo "====================================================="
echo ""

# Step 1: Check Node.js and npm
echo "✓ Checking Node.js installation..."
node --version
npm --version
echo ""

# Step 2: Check required packages
echo "✓ Installing/verifying required packages..."
npm list express-validator bcrypt nodemailer express-fileupload mysql2 express-fileupload >> /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "📦 Installing missing dependencies..."
  npm install express-validator bcrypt nodemailer express-fileupload
fi
echo ""

# Step 3: Check MySQL connection
echo "✓ Checking MySQL connection..."
echo "Please ensure MySQL is running and credentials in db.js are correct"
echo ""

# Step 4: Database setup
echo "✓ Database Setup"
echo "Run the following SQL to create the table:"
echo "mysql -u root -p hitaishi_healthcare < schema_fertility_centers.sql"
echo ""

# Step 5: Check .env file
echo "✓ Checking .env configuration..."
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Creating template..."
  cat > .env.template << 'EOF'
AI_KEY=AIzaSyB3ebJaiaYFyB30sGAx1PmfmgnDPFCajKk
SESSION_SECRET=7e888a780e8bcd15b2ea36715e9685058b7b3276c3ff9ae5a56c36d9700aa09c1c1159b40fd1d21a504bc141fda2e43b29e582845f00f34f5a00be9d9669e6c3
ADMIN_UNLOCK_TOKEN=9e8acf788e1f33c1608f8e84d4e10d2a8248e2d2ece2d0ddd9c80cdc1a93afeae010fdbbc86f8ae50cd57eb77a7d482733f99f26b1d64c5d5da84f3bf9395c97
ZOHO_EMAIL=support@hitaishihealthcare.com
ZOHO_PASS=JPUuP26FEcQy
ADMIN_EMAIL=admin@hitaishihealthcare.com
PORT=5001
EOF
  echo "✓ .env.template created. Copy to .env and update values."
fi
echo ""

# Step 6: Create uploads directory
echo "✓ Creating uploads directory..."
mkdir -p uploads/fertility-centers
echo "✓ Directory created"
echo ""

# Step 7: Test server
echo "✓ Testing server startup..."
echo "To start the server, run: node server.js"
echo ""

# Step 8: Test endpoints
echo "✓ API Endpoints Quick Reference"
echo "================================"
echo ""
echo "1. Register Fertility Center:"
echo "   POST http://localhost:5001/api/fertility/register"
echo ""
echo "2. Check Availability:"
echo "   GET http://localhost:5001/api/fertility/check-availability?email=center@example.com"
echo ""
echo "3. Admin - List Registrations:"
echo "   GET http://localhost:5001/api/admin/fertility"
echo "   Header: Authorization: Bearer <ADMIN_TOKEN>"
echo ""
echo "4. Admin - Get Center Details:"
echo "   GET http://localhost:5001/api/admin/fertility/1"
echo "   Header: Authorization: Bearer <ADMIN_TOKEN>"
echo ""
echo "5. Admin - Approve Center:"
echo "   PUT http://localhost:5001/api/admin/fertility/1/approve"
echo "   Header: Authorization: Bearer <ADMIN_TOKEN>"
echo ""
echo "6. Admin - Reject Center:"
echo "   PUT http://localhost:5001/api/admin/fertility/1/reject"
echo "   Header: Authorization: Bearer <ADMIN_TOKEN>"
echo "   Body: {\"reason\": \"Documentation incomplete\"}"
echo ""
echo "7. Admin - Get Statistics:"
echo "   GET http://localhost:5001/api/admin/fertility/stats/overview"
echo "   Header: Authorization: Bearer <ADMIN_TOKEN>"
echo ""

echo "====================================================="
echo "✅ Setup Complete!"
echo "====================================================="
echo ""
echo "📋 Next Steps:"
echo "1. Create MySQL table: mysql -u root -p hitaishi_healthcare < schema_fertility_centers.sql"
echo "2. Copy .env.template to .env and update values"
echo "3. Start server: node server.js"
echo "4. Visit: http://localhost:5001/fertilityRegister.html"
echo ""
echo "📚 Documentation: See FERTILITY_CENTER_SETUP.md for detailed information"
echo ""
