-- Verify access_token column exists

USE corrugation_pms;

-- Check if column exists
SELECT COUNT(*) as column_exists
FROM information_schema.columns 
WHERE table_schema = 'corrugation_pms' 
  AND table_name = 'users' 
  AND column_name = 'access_token';

-- If result is 1, column exists
-- If result is 0, column does NOT exist - run the ALTER command below

-- If column does NOT exist, run this:
-- ALTER TABLE users ADD COLUMN access_token VARCHAR(100) NULL;
