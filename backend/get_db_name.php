<?php
$pdo = new PDO("mysql:host=localhost;dbname=pms_master","root","");
$stmt = $pdo->query("SELECT db_name FROM companies WHERE id = 4");
$r = $stmt->fetch();
echo $r[0] . "\n";
