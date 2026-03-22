<?php
require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/vendor/yiisoft/yii2/Yii.php';

$config = require __DIR__ . '/config/console.php';
$application = new yii\console\Application($config);

$password = $argv[1] ?? 'Chints@123';
$hash = Yii::$app->security->generatePasswordHash($password);
echo $hash . PHP_EOL;
