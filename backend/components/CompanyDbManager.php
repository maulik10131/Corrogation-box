<?php

namespace app\components;

use Yii;
use yii\base\Component;
use yii\db\Connection;

/**
 * CompanyDbManager - Manages dynamic database connections per company
 * 
 * Usage in controller:
 *   $dbManager = Yii::$app->companyDb;
 *   $dbManager->switchToCompany($companyId);
 *   // Now all queries use company database
 */
class CompanyDbManager extends Component
{
    public $masterDb;
    private $_currentCompanyId;
    private $_currentConnection;
    private $_connectionPool = [];

    /**
     * Initialize with master database connection
     */
    public function init()
    {
        parent::init();
        
        // Resolve masterDb if it's a Closure
        if ($this->masterDb instanceof \Closure) {
            $this->masterDb = call_user_func($this->masterDb);
        }
        
        // Ensure master DB connection exists
        if (!$this->masterDb) {
            $this->masterDb = Yii::$app->masterDb;
        }
    }

    /**
     * Get company information from master database
     * @param int $companyId
     * @return array|null Company details
     */
    public function getCompanyInfo($companyId)
    {
        $query = "SELECT * FROM companies WHERE id = :id AND is_active = 1";
        $command = $this->masterDb->createCommand($query, [':id' => $companyId]);
        return $command->queryOne();
    }

    /**
     * Get company by code
     * @param string $companyCode
     * @return array|null Company details
     */
    public function getCompanyByCode($companyCode)
    {
        $query = "SELECT * FROM companies WHERE company_code = :code AND is_active = 1";
        $command = $this->masterDb->createCommand($query, [':code' => $companyCode]);
        return $command->queryOne();
    }

    /**
     * Switch to a company's database
     * @param int $companyId
     * @return bool Success status
     * @throws \Exception If company not found or inactive
     */
    public function switchToCompany($companyId)
    {
        // Check if already connected to this company
        if ($this->_currentCompanyId === $companyId && $this->_currentConnection) {
            return true;
        }

        // Check connection pool
        if (isset($this->_connectionPool[$companyId])) {
            $this->_currentCompanyId = $companyId;
            $this->_currentConnection = $this->_connectionPool[$companyId];
            Yii::$app->set('db', $this->_currentConnection);
            return true;
        }

        // Get company info
        $company = $this->getCompanyInfo($companyId);
        
        if (!$company) {
            throw new \Exception("Company not found or inactive: ID=$companyId");
        }

        // Create new database connection
        $connection = $this->createConnection(
            $company['db_name'],
            $company['db_host'],
            $company['db_username'],
            $company['db_password'],
            $company['db_port']
        );

        // Store in pool
        $this->_connectionPool[$companyId] = $connection;
        $this->_currentCompanyId = $companyId;
        $this->_currentConnection = $connection;

        // Replace Yii's db component
        Yii::$app->set('db', $connection);

        Yii::info("Switched to company database: {$company['db_name']} (ID: $companyId)", __METHOD__);

        return true;
    }

    /**
     * Create a new database connection
     * @param string $dbName
     * @param string $host
     * @param string $username
     * @param string $password
     * @param int $port
     * @return Connection
     */
    protected function createConnection($dbName, $host = 'localhost', $username = 'root', $password = '', $port = 3306)
    {
        $connection = new Connection([
            'dsn' => "mysql:host=$host;port=$port;dbname=$dbName",
            'username' => $username,
            'password' => $password,
            'charset' => 'utf8mb4',
            'enableSchemaCache' => true,
            'schemaCacheDuration' => 3600, // 1 hour
            'schemaCache' => 'cache',
        ]);

        $connection->open();
        
        return $connection;
    }

    /**
     * Switch back to master database
     */
    public function switchToMaster()
    {
        $this->_currentCompanyId = null;
        $this->_currentConnection = null;
        Yii::$app->set('db', $this->masterDb);
        
        Yii::info("Switched back to master database", __METHOD__);
    }

    /**
     * Get current company ID
     * @return int|null
     */
    public function getCurrentCompanyId()
    {
        return $this->_currentCompanyId;
    }

    /**
     * Get current database connection
     * @return Connection|null
     */
    public function getCurrentConnection()
    {
        return $this->_currentConnection;
    }

    /**
     * Close all pooled connections
     */
    public function closeAllConnections()
    {
        foreach ($this->_connectionPool as $connection) {
            if ($connection->isActive) {
                $connection->close();
            }
        }
        
        $this->_connectionPool = [];
        $this->_currentCompanyId = null;
        $this->_currentConnection = null;
    }

    /**
     * Get list of all active companies
     * @return array
     */
    public function getActiveCompanies()
    {
        $query = "SELECT id, company_name, company_code, email, city, state, plan_type 
                  FROM companies 
                  WHERE is_active = 1 
                  ORDER BY company_name";
        
        return $this->masterDb->createCommand($query)->queryAll();
    }

    /**
     * Verify company database exists and is accessible
     * @param int $companyId
     * @return array [success => bool, message => string]
     */
    public function verifyCompanyDatabase($companyId)
    {
        try {
            $company = $this->getCompanyInfo($companyId);
            
            if (!$company) {
                return ['success' => false, 'message' => 'Company not found'];
            }

            // Try to connect
            $connection = $this->createConnection(
                $company['db_name'],
                $company['db_host'],
                $company['db_username'],
                $company['db_password'],
                $company['db_port']
            );

            // Test query
            $connection->createCommand("SELECT 1")->queryScalar();
            $connection->close();

            return [
                'success' => true, 
                'message' => 'Database connection successful',
                'db_name' => $company['db_name']
            ];

        } catch (\Exception $e) {
            return [
                'success' => false, 
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Clone database structure from template to new company database
     * @param string $sourceDb Source database name (template)
     * @param string $targetDb Target database name
     * @return bool Success status
     */
    public function cloneDatabase($sourceDb, $targetDb)
    {
        try {
            // Create new database
            $this->masterDb->createCommand("CREATE DATABASE IF NOT EXISTS `$targetDb` 
                CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")->execute();

            // Get all tables from source
            $tables = $this->masterDb->createCommand("SHOW TABLES FROM `$sourceDb`")->queryColumn();

            foreach ($tables as $table) {
                // Get CREATE TABLE statement
                $createTableResult = $this->masterDb->createCommand(
                    "SHOW CREATE TABLE `$sourceDb`.`$table`"
                )->queryOne();
                
                $createStatement = $createTableResult['Create Table'];
                
                // Create table in target database
                $this->masterDb->createCommand("USE `$targetDb`")->execute();
                $this->masterDb->createCommand($createStatement)->execute();
            }

            $this->masterDb->createCommand("USE `pms_master`")->execute();

            Yii::info("Database cloned: $sourceDb -> $targetDb", __METHOD__);
            
            return true;

        } catch (\Exception $e) {
            Yii::error("Failed to clone database: " . $e->getMessage(), __METHOD__);
            return false;
        }
    }
}
