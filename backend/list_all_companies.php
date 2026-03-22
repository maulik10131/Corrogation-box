<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=pms_master","root","");
    $stmt = $pdo->query('SELECT id, company_name, db_name FROM companies');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "=== ALL COMPANIES ===\n";
    foreach ($rows as $r) {
        echo "ID:".$r['id']." Name:".$r['company_name']." DB:".$r['db_name']."\n";
    }
} catch (Exception $e) {
    echo "ERR: " . $e->getMessage() . "\n";
}
