<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=pms_abc001", "root", "");
    $stmt = $pdo->query('SELECT id, name, mobile, email, city, status FROM customers LIMIT 10');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) {
        echo "NO_ROWS\n";
        exit(0);
    }
    foreach ($rows as $r) {
        echo implode(" | ", array_map(function($v){ return $v === null ? 'NULL' : $v; }, $r)) . "\n";
    }
} catch (PDOException $e) {
    echo "ERR: " . $e->getMessage() . "\n";
    exit(1);
}
