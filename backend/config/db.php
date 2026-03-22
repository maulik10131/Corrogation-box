<?php

return [
    'class' => 'yii\db\Connection',
    'dsn' => 'mysql:host=localhost;dbname=pms_abc001',
    'username' => 'root',
    'password' => '', // તમારો MySQL password
    'charset' => 'utf8mb4',
    
    // Schema cache for better performance
    'enableSchemaCache' => true,
    'schemaCacheDuration' => 3600,
    'schemaCache' => 'cache',
];