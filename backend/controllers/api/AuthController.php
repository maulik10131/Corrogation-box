<?php

namespace app\controllers\api;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use app\models\User;

class AuthController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $behaviors;
    }

    /**
     * Debug endpoint to check users table structure
     */
    public function actionCheckTable()
    {
        $schema = User::getTableSchema();
        $columns = [];
        
        if ($schema) {
            foreach ($schema->columns as $column) {
                $columns[] = [
                    'name' => $column->name,
                    'type' => $column->type,
                    'allowNull' => $column->allowNull,
                ];
            }
        }
        
        return [
            'success' => true,
            'table' => 'users',
            'columns' => $columns,
            'has_access_token' => $schema && isset($schema->columns['access_token']),
        ];
    }

    public function actionLogin()
    {
        $request = Yii::$app->request;
        $identity = trim((string) $request->post('identity', ''));
        $password = (string) $request->post('password', '');

        if ($identity === '' || $password === '') {
            return [
                'success' => false,
                'error' => 'Username/email and password are required',
            ];
        }

        $schema = User::getTableSchema();
        $query = User::find();

        if (strpos($identity, '@') !== false && $schema !== null && isset($schema->columns['email'])) {
            $query->where(['email' => $identity]);
        } else {
            $query->where(['username' => $identity]);
        }

        if ($schema !== null && isset($schema->columns['status'])) {
            $query->andWhere(['status' => 1]);
        }

        $user = $query->one();

        if (!$user || !$user->validatePassword($password)) {
            return [
                'success' => false,
                'error' => 'Invalid credentials',
            ];
        }

        $token = null;
        $schema = User::getTableSchema();
        
        // Generate and save access token
        if ($schema !== null && isset($schema->columns['access_token'])) {
            $token = Yii::$app->security->generateRandomString(40);
            $user->access_token = $token;
            
            // Save token to database
            if (!$user->save(false, ['access_token'])) {
                \Yii::error('Failed to save access token for user: ' . $user->username, 'application');
            } else {
                \Yii::info('Access token saved for user: ' . $user->username, 'application');
            }
        } else {
            \Yii::warning('access_token column not found in users table', 'application');
        }

        return [
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ];
    }

    public function actionSignup()
    {
        $request = Yii::$app->request;

        $username = trim((string) $request->post('username', ''));
        $email = trim((string) $request->post('email', ''));
        $password = (string) $request->post('password', '');
        $fullName = trim((string) $request->post('full_name', ''));

        if ($username === '' || $email === '' || $password === '') {
            return [
                'success' => false,
                'error' => 'Username, email, and password are required',
            ];
        }

        if (strlen($password) < 6) {
            return [
                'success' => false,
                'error' => 'Password must be at least 6 characters',
            ];
        }

        $user = new User();
        $user->username = $username;
        $user->email = $email;

        $schema = User::getTableSchema();

        if ($schema !== null && isset($schema->columns['full_name'])) {
            $user->full_name = $fullName !== '' ? $fullName : $username;
        }

        if ($schema !== null && isset($schema->columns['role']) && !$user->role) {
            $user->role = 'staff';
        }

        if ($schema !== null && isset($schema->columns['status'])) {
            $user->status = 1;
        }

        if ($schema !== null && isset($schema->columns['auth_key'])) {
            $user->auth_key = Yii::$app->security->generateRandomString(32);
        }

        if ($schema !== null && isset($schema->columns['access_token'])) {
            $user->access_token = Yii::$app->security->generateRandomString(40);
        }

        $user->setPassword($password);

        if (!$user->save()) {
            return [
                'success' => false,
                'error' => 'Failed to create user',
                'errors' => $user->errors,
            ];
        }

        return [
            'success' => true,
            'message' => 'Signup successful',
            'data' => [
                'user' => $user,
                'token' => $schema !== null && isset($schema->columns['access_token']) ? $user->access_token : null,
            ],
        ];
    }
}
