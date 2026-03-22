<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=pms_master","root","");
    $stmt = $pdo->query('SELECT id, username, email, access_token FROM master_users WHERE status = 1 LIMIT 5');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) {
        echo "NO_MASTER_USERS\n";
        exit(0);
    }
    foreach ($rows as $r) {
        echo implode(" | ", array_map(function($v){ return $v === null ? 'NULL' : $v; }, $r)) . "\n";
    }
} catch (PDOException $e) {
    echo "ERR: " . $e->getMessage() . "\n";
    exit(1);
}
