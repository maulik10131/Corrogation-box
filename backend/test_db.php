<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=pms_abc001", "root", "");
    echo "OK\n";
} catch (PDOException $e) {
    echo "ERR: " . $e->getMessage() . "\n";
}

// exit code reflects success/failure
if (isset($pdo)) {
    exit(0);
} else {
    exit(1);
}
