<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=pms_master","root","");
    
    $stmt = $pdo->query('SELECT id, company_code, company_name, is_active, db_name FROM companies WHERE id = 4');
    $c = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($c) {
        echo 'Found: ID:'.$c['id'].' Code:'.$c['company_code'].' Name:'.$c['company_name'].' DB:'.$c['db_name']."\n";
    } else {
        echo 'Company 4 not found\n';
    }
} catch (Exception $e) {
    echo 'ERR: '.$e->getMessage()."\n";
}
