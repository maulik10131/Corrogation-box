#!/usr/bin/env php
<?php
/**
 * Company Setup Utility
 * Command-line tool to create new company databases
 * 
 * Usage:
 *   php setup_company.php --name="ABC Company" --code="ABC001" --email="info@abc.com"
 */

// Check if running from CLI
if (php_sapi_name() !== 'cli') {
    die('This script must be run from command line');
}

// Define constants
define('YII_DEBUG', true);
define('YII_ENV', 'dev');

// Load Yii framework
require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/vendor/yiisoft/yii2/Yii.php';

// Load configuration
$config = require __DIR__ . '/config/console.php';

// Override db component to use master database
$config['components']['db'] = [
    'class' => 'yii\db\Connection',
    'dsn' => 'mysql:host=localhost;dbname=pms_master',
    'username' => 'root',
    'password' => '',
    'charset' => 'utf8mb4',
];

// Create application
$application = new yii\console\Application($config);

// Parse command line arguments
$options = getopt('', [
    'name:',
    'code:',
    'email:',
    'contact:',
    'phone:',
    'username:',
    'password:',
    'template:',
    'help',
]);

// Show help
if (isset($options['help']) || empty($options['name']) || empty($options['code']) || empty($options['email'])) {
    echo <<<HELP
Company Setup Utility - Create new company database

Usage:
  php setup_company.php --name="Company Name" --code="CODE001" --email="email@company.com" [options]

Required Arguments:
  --name       Company name (e.g., "ABC Corrugation Ltd")
  --code       Unique company code (e.g., "ABC001")
  --email      Company email address

Optional Arguments:
  --contact    Contact person name
  --phone      Phone number
  --username   Admin username (default: admin)
  --password   Admin password (default: admin123)
  --template   Template database to clone (default: corrugation_pms)
  --help       Show this help message

Example:
  php setup_company.php --name="ABC Company" --code="ABC001" --email="info@abc.com" --contact="John Doe" --phone="9876543210"

HELP;
    exit(0);
}

// Get values
$companyName = $options['name'];
$companyCode = strtoupper($options['code']);
$email = $options['email'];
$contactPerson = $options['contact'] ?? null;
$phone = $options['phone'] ?? null;
$adminUsername = $options['username'] ?? 'admin';
$adminPassword = $options['password'] ?? 'admin123';
$templateDb = $options['template'] ?? 'corrugation_pms';

echo "\n==========================================\n";
echo "Company Setup Utility\n";
echo "==========================================\n\n";

try {
    // Step 1: Check if company code already exists
    echo "[1/6] Checking if company code exists...\n";
    $existing = Yii::$app->db->createCommand(
        "SELECT id FROM companies WHERE company_code = :code",
        [':code' => $companyCode]
    )->queryOne();

    if ($existing) {
        throw new Exception("Company code '$companyCode' already exists!");
    }
    echo "✓ Company code is unique\n\n";

    // Step 2: Generate database name
    echo "[2/6] Generating database name...\n";
    $dbName = 'pms_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $companyCode));
    echo "✓ Database name: $dbName\n\n";

    // Step 3: Create company record
    echo "[3/6] Creating company record...\n";
    $companyId = Yii::$app->db->createCommand()->insert('companies', [
        'company_name' => $companyName,
        'company_code' => $companyCode,
        'db_name' => $dbName,
        'db_host' => 'localhost',
        'db_username' => 'root',
        'db_password' => '',
        'db_port' => 3306,
        'email' => $email,
        'contact_person' => $contactPerson,
        'phone' => $phone,
        'plan_type' => 'trial',
        'is_active' => 1,
        'created_at' => date('Y-m-d H:i:s'),
    ])->execute();

    $companyId = Yii::$app->db->getLastInsertID();
    echo "✓ Company created with ID: $companyId\n\n";

    // Step 4: Clone database structure
    echo "[4/6] Creating company database...\n";
    
    // Create new database
    Yii::$app->db->createCommand("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")->execute();
    echo "✓ Database created: $dbName\n";

    // Get all tables from template
    $tables = Yii::$app->db->createCommand("SHOW TABLES FROM `$templateDb`")->queryColumn();
    echo "✓ Found " . count($tables) . " tables in template\n";

    // Clone each table
    foreach ($tables as $table) {
        // Get CREATE TABLE statement
        $createTableResult = Yii::$app->db->createCommand("SHOW CREATE TABLE `$templateDb`.`$table`")->queryOne();
        $createStatement = $createTableResult['Create Table'];
        
        // Create table in new database
        Yii::$app->db->createCommand("USE `$dbName`")->execute();
        Yii::$app->db->createCommand($createStatement)->execute();
        
        echo "  ✓ Cloned table: $table\n";
    }

    // Switch back to master database
    Yii::$app->db->createCommand("USE `pms_master`")->execute();
    echo "✓ Database structure cloned successfully\n\n";

    // Step 5: Create admin user in master_users
    echo "[5/6] Creating admin user...\n";
    
    $passwordHash = Yii::$app->security->generatePasswordHash($adminPassword);
    $accessToken = Yii::$app->security->generateRandomString(40);
    
    Yii::$app->db->createCommand()->insert('master_users', [
        'company_id' => $companyId,
        'username' => $adminUsername,
        'email' => $email,
        'password_hash' => $passwordHash,
        'full_name' => $contactPerson ?? 'Administrator',
        'is_super_admin' => 0,
        'access_token' => $accessToken,
        'status' => 1,
        'created_at' => date('Y-m-d H:i:s'),
    ])->execute();

    echo "✓ Admin user created\n";
    echo "  Username: $adminUsername\n";
    echo "  Password: $adminPassword\n\n";

    // Step 6: Log to audit
    echo "[6/6] Creating audit log...\n";
    Yii::$app->db->createCommand()->insert('audit_log', [
        'company_id' => $companyId,
        'action' => 'create_company',
        'details' => "Company '$companyName' created with database '$dbName'",
        'created_at' => date('Y-m-d H:i:s'),
    ])->execute();
    echo "✓ Audit log created\n\n";

    // Success summary
    echo "==========================================\n";
    echo "✓ Company Setup Complete!\n";
    echo "==========================================\n\n";
    echo "Company Details:\n";
    echo "  Name: $companyName\n";
    echo "  Code: $companyCode\n";
    echo "  Database: $dbName\n";
    echo "  Email: $email\n";
    echo "  ID: $companyId\n\n";
    echo "Admin Login:\n";
    echo "  Username: $adminUsername\n";
    echo "  Password: $adminPassword\n";
    echo "  Email: $email\n\n";
    echo "Next Steps:\n";
    echo "  1. Users can now login using company code: $companyCode\n";
    echo "  2. Admin can manage users from the Users menu\n";
    echo "  3. Configure company settings as needed\n\n";

} catch (Exception $e) {
    echo "\n✗ ERROR: " . $e->getMessage() . "\n\n";
    exit(1);
}

exit(0);
