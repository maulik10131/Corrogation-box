-- Update password for chints0212
UPDATE pms_master.master_users 
SET password_hash = '$2y$13$nsgrJIuDgNIlwCysG5O7DeZYKR/DMIB4oCOCInzEWtJ9ho7lyfhXq'
WHERE id = 3;

UPDATE pms_abc001.users 
SET password_hash = '$2y$13$nsgrJIuDgNIlwCysG5O7DeZYKR/DMIB4oCOCInzEWtJ9ho7lyfhXq'
WHERE username = 'chints0212';

-- Verify
SELECT id, username, company_id, LEFT(password_hash, 30) as hash_start FROM pms_master.master_users WHERE id = 3;
