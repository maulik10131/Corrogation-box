# Role-Based Menu System - Corrugation PMS

## Overview
The sidebar navigation now includes role-based access control. Menu items are filtered based on the logged-in user's role.

## Available Roles
1. **Admin** - Full access to all features
2. **Manager** - Access to most features except sensitive settings
3. **Supervisor** - Access to operational and monitoring features
4. **Operator** - Access to production-related features
5. **Staff** - Basic access with limited features

## Menu Access by Role

| Menu Item       | Admin | Manager | Supervisor | Operator | Staff |
|----------------|-------|---------|------------|----------|-------|
| Dashboard      | ✅    | ✅      | ✅         | ✅       | ✅    |
| Inventory      | ✅    | ✅      | ✅         | ❌       | ✅    |
| Quotations     | ✅    | ✅      | ✅         | ❌       | ❌    |
| Customers      | ✅    | ✅      | ✅         | ❌       | ❌    |
| Box Calculator | ✅    | ✅      | ✅         | ✅       | ❌    |
| Work Orders    | ✅    | ✅      | ✅         | ✅       | ❌    |
| Orders         | ✅    | ✅      | ✅         | ❌       | ❌    |
| Dispatch       | ✅    | ✅      | ✅         | ✅       | ❌    |
| Attendance     | ✅    | ✅      | ✅         | ❌       | ❌    |
| Payments       | ✅    | ✅      | ❌         | ❌       | ❌    |
| Reports        | ✅    | ✅      | ❌         | ❌       | ❌    |
| Settings       | ✅    | ❌      | ❌         | ❌       | ❌    |

## Implementation Details

### Frontend (Sidebar.tsx)
- Reads user data from `localStorage.getItem('pms_user')`
- Filters navigation items based on user role
- Displays user role badge in sidebar footer
- Shows first letter of user's name as avatar

### Backend (User Model)
- Role validation in `backend/models/User.php`
- Allowed roles: admin, manager, supervisor, operator, staff
- Default role: staff

### Database
- Users table has `role` column (ENUM type)
- Migration available to add 'supervisor' role: `database/migrations/add_supervisor_role.sql`

## Usage

### To run the migration:
```bash
# Connect to MySQL
mysql -u root -p corrugation_pms

# Run the migration
source database/migrations/add_supervisor_role.sql
```

### To assign roles to users:
```sql
UPDATE users SET role = 'admin' WHERE username = 'admin';
UPDATE users SET role = 'manager' WHERE username = 'manager1';
UPDATE users SET role = 'supervisor' WHERE username = 'supervisor1';
UPDATE users SET role = 'operator' WHERE username = 'operator1';
```

## Adding New Menu Items

To add a new menu item with role restrictions:

```typescript
{
  name: 'New Feature',
  href: '/new-feature',
  icon: YourIcon,
  roles: ['admin', 'manager'] // Only these roles can see this menu
}
```

To make a menu item accessible to all roles:
```typescript
{
  name: 'Public Feature',
  href: '/public-feature',
  icon: YourIcon,
  // No roles property = accessible to all
}
```

## Features

✅ **Dynamic Menu Filtering** - Menu automatically updates based on user role
✅ **User Info Display** - Shows user name, email, and role badge in sidebar
✅ **Role Badge** - Displays user role with colored badge
✅ **Avatar Generation** - Auto-generates avatar from user's first letter
✅ **Default Role** - Falls back to 'staff' if no role is set
✅ **Responsive** - Works on mobile and desktop
