<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=pms_master","root","");
    $stmt = $pdo->prepare("UPDATE companies SET db_name = 'pms_abc001' WHERE id = 4");
    $stmt->execute();
    echo "Updated company 4 to use database: pms_abc001\n";
} catch (Exception $e) {
    echo "ERR: " . $e->getMessage() . "\n";
}
