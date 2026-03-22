# Multi-Tenant Architecture Setup Guide

## Overview

This system now supports **multi-tenant architecture** where each corrugation company has its own separate database. This provides complete data isolation and security between companies while sharing the same codebase.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│  - Company selection at login                               │
│  - Store company info in localStorage                        │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (Yii2 PHP)                     │
│  - Multi-tenant authentication                              │
│  - Dynamic database connection switching                    │
└─────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────┐          ┌───────────────────────────┐
│  Master Database     │          │  Company Databases        │
│  (pms_master)        │          │  - pms_abc001             │
│                      │          │  - pms_xyz002             │
│  - companies         │          │  - pms_company_n          │
│  - master_users      │          │                           │
│  - audit_log         │          │  Each has full schema:    │
│  - company_migrations│          │  - users                  │
└──────────────────────┘          │  - customers              │
                                  │  - inventory_items        │
                                  │  - quotations             │
                                  │  - work_orders            │
                                  │  - etc...                 │
                                  └───────────────────────────┘
```

## Database Structure

### Master Database (pms_master)

**Purpose:** Central database for managing all companies and user authentication

**Tables:**
- `companies` - Store company details and database connection info
- `master_users` - User credentials and company mapping
- `company_migrations` - Track database migrations per company
- `audit_log` - System-wide activity logging

**Key Fields in companies:**
```sql
- id
- company_name
- company_code (unique identifier)
- db_name (database name for this company)
- db_host, db_username, db_password, db_port
- plan_type (trial, basic, professional, enterprise)
- subscription_start, subscription_end
- is_active
```

**Key Fields in master_users:**
```sql
- id
- company_id (foreign key to companies)
- username, email, password_hash
- full_name
- is_super_admin (can access all companies)
- access_token (API authentication)
- status
```

### Company Databases (pms_*)

Each company has its own database with the complete schema:
- Users, Customers, Suppliers
- Inventory (Items, Categories, Movements)
- Quotations, Work Orders, Dispatches
- Invoices, Payments
- Attendance, Employees
- All other tables

---

## Setup Instructions

### Step 1: Create Master Database

Run the master database schema:

```bash
# Using MySQL command line
mysql -u root -p < database/master_schema.sql

# Or execute in phpMyAdmin
# Import database/master_schema.sql
```

This will:
- Create `pms_master` database
- Create all master tables
- Insert sample companies and super admin user

**Default Super Admin:**
- Username: `superadmin`
- Password: `admin123` (change after first login)
- Email: `admin@pms.com`

### Step 2: Configure Backend

The multi-tenant components are already configured in `backend/config/web.php`:

```php
'masterDb' => [
    'class' => 'yii\db\Connection',
    'dsn' => 'mysql:host=localhost;dbname=pms_master',
    'username' => 'root',
    'password' => '',
    'charset' => 'utf8mb4',
],
'companyDb' => [
    'class' => 'app\components\CompanyDbManager',
],
```

Update the password if your MySQL has one.

### Step 3: Create Your First Company

Use the command-line utility:

```bash
cd backend
php setup_company.php --name="ABC Corrugation Ltd" --code="ABC001" --email="info@abc.com" --contact="John Doe" --phone="9876543210"
```

**Options:**
- `--name` - Company name (required)
- `--code` - Unique company code (required)
- `--email` - Company email (required)
- `--contact` - Contact person name (optional)
- `--phone` - Phone number (optional)
- `--username` - Admin username (default: admin)
- `--password` - Admin password (default: admin123)
- `--template` - Source database to clone (default: corrugation_pms)

This will:
1. Create company record in master database
2. Create new database (e.g., `pms_abc001`)
3. Clone all tables from template database
4. Create admin user in master_users
5. Log action in audit_log

### Step 4: Use Multi-Tenant Login

**Frontend URLs:**
- Login: `http://localhost:3000/login-mt`
- Signup: `http://localhost:3000/signup-mt`

**Login Flow:**
1. User visits `/login-mt`
2. Selects company from dropdown
3. Enters username/email and password
4. System authenticates against `master_users` table
5. System switches to selected company's database
6. Token and company info stored in localStorage

**LocalStorage Keys:**
```javascript
pms_token      // Authentication token
pms_user       // User details (id, username, email, full_name, role)
pms_company    // Company details (id, name, code, db_name)
```

---

## API Endpoints

### Multi-Tenant Authentication

**GET /api/mt-auth/companies**
- Get list of all active companies
- Used for company selector dropdown

**POST /api/mt-auth/verify-credentials**
```json
{
  "identity": "username or email",
  "password": "password"
}
```
- Verify user credentials
- Returns user and company info

**POST /api/mt-auth/login**
```json
{
  "identity": "username or email",
  "password": "password",
  "company_id": 1
}
```
- Complete login with company selection
- Returns token, user, and company info

**POST /api/mt-auth/signup**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "full_name": "Full Name",
  "company_id": 1
}
```
- Create new user account
- User linked to selected company

**GET /api/mt-auth/verify-token**
- Headers: `Authorization: Bearer {token}`
- Verify token and get user/company info

---

## Backend Code Usage

### Switching to Company Database

```php
// In your controller
$companyId = 1; // From user session or request

// Switch to company database
Yii::$app->companyDb->switchToCompany($companyId);

// Now all queries use company database
$customers = Customer::find()->all();
$inventory = InventoryItem::find()->all();

// Switch back to master if needed
Yii::$app->companyDb->switchToMaster();
```

### Getting Company Info

```php
// Get company details
$company = Yii::$app->companyDb->getCompanyInfo($companyId);

// Get company by code
$company = Yii::$app->companyDb->getCompanyByCode('ABC001');

// Get all active companies
$companies = Yii::$app->companyDb->getActiveCompanies();

// Verify company database
$result = Yii::$app->companyDb->verifyCompanyDatabase($companyId);
```

### Database Cloning

```php
// Clone database structure
$sourceDb = 'corrugation_pms';
$targetDb = 'pms_newcompany';

Yii::$app->companyDb->cloneDatabase($sourceDb, $targetDb);
```

---

## Frontend Code Usage

### Login with Company Selection

```typescript
// Fetch companies
const response = await fetch(`${API_BASE_URL}/api/mt-auth/companies`);
const result = await response.json();
const companies = result.data;

// Login
const loginResponse = await fetch(`${API_BASE_URL}/api/mt-auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identity: username,
    password: password,
    company_id: selectedCompanyId
  })
});

const loginResult = await loginResponse.json();
if (loginResult.success) {
  localStorage.setItem('pms_token', loginResult.data.token);
  localStorage.setItem('pms_user', JSON.stringify(loginResult.data.user));
  localStorage.setItem('pms_company', JSON.stringify(loginResult.data.company));
  router.push('/dashboard');
}
```

### Getting Current Company

```typescript
const companyStr = localStorage.getItem('pms_company');
const company = JSON.parse(companyStr);
console.log(company.name); // "ABC Corrugation Ltd"
console.log(company.code); // "ABC001"
```

---

## Migration Guide

### Converting Existing Single-Tenant Installation

If you have an existing single-database installation:

1. **Backup your current database**
   ```bash
   mysqldump -u root -p corrugation_pms > backup.sql
   ```

2. **Import master schema**
   ```bash
   mysql -u root -p < database/master_schema.sql
   ```

3. **Create company using your existing database as template**
   ```bash
   php setup_company.php \
     --name="My Company" \
     --code="COM001" \
     --email="info@mycompany.com" \
     --template="corrugation_pms"
   ```

4. **Update frontend**
   - Change login page to `/login-mt`
   - Users will select company and login

5. **Data Migration (Optional)**
   - If you have existing users in `corrugation_pms.users`
   - Manually migrate them to `pms_master.master_users`
   - Link them to the new company

---

## Security Considerations

✅ **Data Isolation**
- Each company database is completely isolated
- No cross-company data access possible

✅ **Authentication**
- Centralized authentication in master database
- Tokens validated against master_users table
- Company verification before database switch

✅ **Database Credentials**
- Stored encrypted in companies table
- Only accessible to backend application
- Never exposed to frontend

✅ **Super Admin**
- Can access all companies
- Useful for support and maintenance
- Should be used carefully

---

## Troubleshooting

### Companies dropdown is empty

**Solution:** Run master database schema
```bash
mysql -u root -p < database/master_schema.sql
```

### "Company database not accessible" error

**Solution:** Verify database exists
```bash
mysql -u root -p
SHOW DATABASES LIKE 'pms_%';
```

If database missing, recreate company:
```bash
php setup_company.php --name="Company" --code="CODE" --email="email@company.com"
```

### Token authentication failing

**Solution:** Check access_token column exists in master_users
```sql
USE pms_master;
DESCRIBE master_users;
```

### Database switch not working

**Solution:** Clear Yii schema cache
```bash
cd backend/runtime
rm -rf cache/*
```

---

## Advanced Features

### Custom Company Database Credentials

Each company can have its own MySQL credentials:

```sql
UPDATE companies 
SET db_username = 'company1_user',
    db_password = 'secure_password',
    db_host = 'separate-server.com'
WHERE id = 1;
```

This allows:
- Separate database servers per company
- Different MySQL users with limited permissions
- Better security and performance isolation

### Subscription Management

Track subscription plans:

```sql
-- Upgrade company plan
UPDATE companies 
SET plan_type = 'professional',
    max_users = 20,
    subscription_end = '2025-12-31'
WHERE id = 1;
```

### Audit Logging

All important actions are logged:

```sql
SELECT * FROM audit_log 
WHERE company_id = 1 
ORDER BY created_at DESC;
```

---

## Files Reference

### Backend
- `backend/components/CompanyDbManager.php` - Database switching logic
- `backend/models/MasterUser.php` - Master user model
- `backend/models/Company.php` - Company model
- `backend/controllers/api/MultiTenantAuthController.php` - Authentication API
- `backend/config/web.php` - Master database configuration
- `backend/setup_company.php` - Company creation utility

### Frontend
- `frontend/app/login-mt/page.tsx` - Multi-tenant login page
- `frontend/app/signup-mt/page.tsx` - Multi-tenant signup page
- `frontend/components/Sidebar.tsx` - Shows company info

### Database
- `database/master_schema.sql` - Master database schema

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review audit_log table for errors
3. Check backend logs in `backend/runtime/logs/`
4. Verify database connections in phpMyAdmin

---

**Version:** 1.0  
**Last Updated:** 2024  
**License:** Proprietary
