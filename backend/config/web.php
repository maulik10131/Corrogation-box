<?php

$params = require __DIR__ . '/params.php';
$db = require __DIR__ . '/db.php';

$config = [
    'id' => 'corrugation-pms-api',
    'basePath' => dirname(__DIR__),
    'bootstrap' => ['log'],
    'aliases' => [
        '@bower' => '@vendor/bower-asset',
        '@npm'   => '@vendor/npm-asset',
    ],
    'components' => [
        'request' => [
            'cookieValidationKey' => 'your-secret-key-here-change-it',
            'parsers' => [
                'application/json' => 'yii\web\JsonParser',
            ]
        ],
        'response' => [
            'format' => yii\web\Response::FORMAT_JSON,
            'on beforeSend' => function ($event) {
                $response = $event->sender;
                // CORS Headers
                $origin = Yii::$app->request->headers->get('Origin');
                $allowedOrigins = [
                    'http://localhost:3000',
                    'http://localhost:3001',
                    'http://127.0.0.1:3000',
                    'http://127.0.0.1:3001',
                ];

                if ($origin && in_array($origin, $allowedOrigins, true)) {
                    $response->headers->set('Access-Control-Allow-Origin', $origin);
                } else {
                    $response->headers->set('Access-Control-Allow-Origin', 'http://localhost:3000');
                }

                $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                $response->headers->set('Access-Control-Allow-Credentials', 'true');
            },
        ],
        'cache' => [
            'class' => 'yii\caching\FileCache',
        ],
        'user' => [
            'identityClass' => 'app\models\User',
            'enableAutoLogin' => false,
            'enableSession' => false,
        ],
        'errorHandler' => [
            'errorAction' => 'site/error',
        ],
        'log' => [
            'traceLevel' => YII_DEBUG ? 3 : 0,
            'targets' => [
                [
                    'class' => 'yii\log\FileTarget',
                    'levels' => ['error', 'warning'],
                ],
            ],
        ],
        'db' => $db,
        // Master Database Connection for Multi-tenancy
        'masterDb' => [
            'class' => 'yii\db\Connection',
            'dsn' => 'mysql:host=localhost;dbname=pms_master',
            'username' => 'root',
            'password' => '', // Same as main database
            'charset' => 'utf8mb4',
            'enableSchemaCache' => true,
            'schemaCacheDuration' => 3600,
            'schemaCache' => 'cache',
        ],
        // Company Database Manager for Dynamic Connections
        'companyDb' => [
            'class' => 'app\components\CompanyDbManager',
            'masterDb' => function() {
                return Yii::$app->masterDb;
            },
        ],
        'urlManager' => [
            'enablePrettyUrl' => true,
            'showScriptName' => false,
            'rules' => [
                'OPTIONS <url:.+>' => 'site/options',
                
                // Attendance Routes
                'GET api/attendance' => 'api/attendance/index',
                'GET api/attendance/today' => 'api/attendance/today',
                'GET api/attendance/monthly-report' => 'api/attendance/monthly-report',
                'GET api/attendance/status-options' => 'api/attendance/status-options',
                'GET api/attendance/user-history/<userId:\d+>' => 'api/attendance/user-history',
                'GET api/attendance/<id:\d+>' => 'api/attendance/view',
                'POST api/attendance' => 'api/attendance/create',
                'POST api/attendance/mark' => 'api/attendance/mark',
                'POST api/attendance/bulk-mark' => 'api/attendance/bulk-mark',
                'POST api/attendance/check-in' => 'api/attendance/check-in',
                'POST api/attendance/check-out' => 'api/attendance/check-out',
                'PUT api/attendance/<id:\d+>' => 'api/attendance/update',
                'DELETE api/attendance/<id:\d+>' => 'api/attendance/delete',
                
                // Users
                'GET api/users' => 'api/user/index',
                'GET api/users/list' => 'api/user/list',
                'GET api/users/<id:\d+>' => 'api/user/view',
                'POST api/users/update-role' => 'api/user/update-role',
                'PUT api/users/update-profile' => 'api/user/update-profile',
                'POST api/users/change-password' => 'api/user/change-password',

                // Authentication
                'POST api/auth/login' => 'api/auth/login',
                'POST api/auth/signup' => 'api/auth/signup',
                'GET api/auth/check-table' => 'api/auth/check-table',
                
                // Multi-Tenant Authentication
                'GET api/mt-auth/companies' => 'api/multi-tenant-auth/companies',
                'POST api/mt-auth/verify-credentials' => 'api/multi-tenant-auth/verify-credentials',
                'POST api/mt-auth/login' => 'api/multi-tenant-auth/login',
                'POST api/mt-auth/signup' => 'api/multi-tenant-auth/signup',
                'GET api/mt-auth/verify-token' => 'api/multi-tenant-auth/verify-token',

                // Customers
                'GET api/customers' => 'api/customer/index',
                'GET api/customers/<id:\d+>/ledger' => 'api/payment/customer-ledger',
                'GET api/customers/<id:\d+>' => 'api/customer/view',
                'POST api/customers' => 'api/customer/create',
                'PUT api/customers/<id:\d+>' => 'api/customer/update',
                'DELETE api/customers/<id:\d+>' => 'api/customer/delete',

                // Inventory Items
                'GET api/inventory-items' => 'api/inventory-item/index',
                'GET api/inventory-items/<id:\d+>' => 'api/inventory-item/view',
                'POST api/inventory-items' => 'api/inventory-item/create',
                'PUT api/inventory-items/<id:\d+>' => 'api/inventory-item/update',
                'DELETE api/inventory-items/<id:\d+>' => 'api/inventory-item/delete',

                // Inventory Categories
                'GET api/inventory-categories' => 'api/inventory-category/index',
                'GET api/inventory-categories/<id:\d+>' => 'api/inventory-category/view',
                'POST api/inventory-categories' => 'api/inventory-category/create',
                'PUT api/inventory-categories/<id:\d+>' => 'api/inventory-category/update',
                'DELETE api/inventory-categories/<id:\d+>' => 'api/inventory-category/delete',

                // Employees
                'GET api/employees' => 'api/employee/index',
                'GET api/employees/<id:\d+>' => 'api/employee/view',
                'POST api/employees' => 'api/employee/create',
                'PUT api/employees/<id:\d+>' => 'api/employee/update',
                'DELETE api/employees/<id:\d+>' => 'api/employee/delete',

                // Inventory Stock Out
                'POST api/inventory/stock-out' => 'api/inventory/stock-out',
                'POST api/inventory/stock-in' => 'api/inventory/stock-in',
                'GET api/inventory/summary' => 'api/inventory/summary',
                'GET api/inventory/movements' => 'api/inventory/movements',

                // Employee Attendance
                'GET api/employee-attendance' => 'api/employee-attendance/index',
                'POST api/employee-attendance/bulk-save' => 'api/employee-attendance/bulk-save',
                'GET api/employee-attendance/monthly-report' => 'api/employee-attendance/monthly-report',

                // Quotations (plural aliases used by frontend)
                'GET api/quotations' => 'api/quotation/index',
                'GET api/quotations/<id:\d+>' => 'api/quotation/view',
                'POST api/quotations' => 'api/quotation/create',
                'PUT api/quotations/<id:\d+>' => 'api/quotation/update',
                'DELETE api/quotations/<id:\d+>' => 'api/quotation/delete',

                // Work Orders
                'GET api/work-orders' => 'api/work-order/index',
                'GET api/work-orders/<id:\d+>' => 'api/work-order/view',
                'POST api/work-orders' => 'api/work-order/create',
                'POST api/work-orders/from-quotation/<quotationId:\d+>' => 'api/work-order/create-from-quotation',
                'PATCH api/work-orders/<id:\d+>/status' => 'api/work-order/update-status',

                // Dispatches / Challan
                'GET api/dispatches' => 'api/dispatch/index',
                'GET api/dispatches/<id:\d+>' => 'api/dispatch/view',
                'POST api/dispatches' => 'api/dispatch/create',
                'PUT api/dispatches/<id:\d+>' => 'api/dispatch/update',
                'DELETE api/dispatches/<id:\d+>' => 'api/dispatch/delete',
                'PATCH api/dispatches/<id:\d+>/pod' => 'api/dispatch/update-pod',

                // Invoices / Payments / Outstanding
                'GET api/invoices' => 'api/payment/invoices',
                'POST api/invoices' => 'api/payment/create-invoice',
                'POST api/payments' => 'api/payment/create-payment',
                'GET api/outstanding/aging' => 'api/payment/outstanding-aging',
            ],
        ],
    ],
    'params' => $params,
];

return $config;