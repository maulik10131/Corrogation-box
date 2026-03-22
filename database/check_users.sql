-- Check users table structure and data

-- Show table structure
DESCRIBE users;

-- Count total users
SELECT COUNT(*) as total_users FROM users;

-- Show all users with their roles
SELECT id, username, email, 
       CASE WHEN EXISTS(
           SELECT * FROM information_schema.columns 
           WHERE table_name='users' AND column_name='full_name'
       ) THEN 'full_name column exists' ELSE 'full_name column missing' END as full_name_status,
       CASE WHEN EXISTS(
           SELECT * FROM information_schema.columns 
           WHERE table_name='users' AND column_name='role'
       ) THEN 'role column exists' ELSE 'role column missing' END as role_status,
       CASE WHEN EXISTS(
           SELECT * FROM information_schema.columns 
           WHERE table_name='users' AND column_name='access_token'
       ) THEN 'access_token column exists' ELSE 'access_token column missing' END as token_status
FROM users 
LIMIT 5;
