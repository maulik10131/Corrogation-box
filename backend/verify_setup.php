<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=pms_master","root","");
    
    echo "=== MASTER USERS ===\n";
    $stmt = $pdo->query('SELECT id, company_id, username, email, is_super_admin, status FROM master_users');
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($users as $u) {
        echo "ID:{$u['id']} Company:{$u['company_id']} Name:{$u['username']} Admin:{$u['is_super_admin']} Status:{$u['status']}\n";
    }
    
    echo "\n=== COMPANIES ===\n";
    $stmt = $pdo->query('SELECT id, company_code, company_name, is_active, db_name FROM companies');
    $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($companies as $c) {
        echo "ID:{$c['id']} Code:{$c['company_code']} Name:{$c['company_name']} Active:{$c['is_active']} DB:{$c['db_name']}\n";
    }
    
} catch (PDOException $e) {
    echo "ERR: " . $e->getMessage() . "\n";
    exit(1);
}
