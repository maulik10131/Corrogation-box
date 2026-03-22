<?php

namespace app\controllers\api;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use app\models\MasterUser;
use app\models\Company;

/**
 * MultiTenantAuthController - Handles authentication with master database
 * and company selection for multi-tenant architecture
 */
class MultiTenantAuthController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $behaviors;
    }

    /**
     * Get list of companies for company selector
     * GET /api/mt-auth/companies
     */
    public function actionCompanies()
    {
        try {
            $companies = Yii::$app->companyDb->getActiveCompanies();
            
            return [
                'success' => true,
                'data' => array_map(function($company) {
                    return [
                        'id' => $company['id'],
                        'name' => $company['company_name'],
                        'code' => $company['company_code'],
                        'city' => $company['city'],
                        'state' => $company['state'],
                    ];
                }, $companies),
            ];
        } catch (\Exception $e) {
            Yii::error('Failed to fetch companies: ' . $e->getMessage(), __METHOD__);
            return [
                'success' => false,
                'error' => 'Failed to load companies',
            ];
        }
    }

    /**
     * Verify user credentials against master database
     * POST /api/mt-auth/verify-credentials
     * Body: { username/email, password }
     */
    public function actionVerifyCredentials()
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

        // Find user in master database
        $user = MasterUser::findByCredential($identity);

        if (!$user) {
            Yii::info("User not found: $identity", __METHOD__);
            return [
                'success' => false,
                'error' => 'Invalid credentials',
            ];
        }

        if (!$user->isActive()) {
            return [
                'success' => false,
                'error' => 'Account is inactive',
            ];
        }

        if (!$user->validatePassword($password)) {
            Yii::info("Invalid password for user: $identity", __METHOD__);
            return [
                'success' => false,
                'error' => 'Invalid credentials',
            ];
        }

        // Get user's company info
        $company = Yii::$app->companyDb->getCompanyInfo($user->company_id);

        if (!$company || !$company['is_active']) {
            return [
                'success' => false,
                'error' => 'Company is inactive or not found',
            ];
        }

        return [
            'success' => true,
            'data' => [
                'user_id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'full_name' => $user->full_name,
                'is_super_admin' => $user->is_super_admin,
                'company' => [
                    'id' => $company['id'],
                    'name' => $company['company_name'],
                    'code' => $company['company_code'],
                ],
            ],
        ];
    }

    /**
     * Complete login with company selection
     * POST /api/mt-auth/login
     * Body: { identity, password, company_id }
     */
    public function actionLogin()
    {
        $request = Yii::$app->request;
        $identity = trim((string) $request->post('identity', ''));
        $password = (string) $request->post('password', '');
        $companyId = (int) $request->post('company_id', 0);

        if ($identity === '' || $password === '') {
            return [
                'success' => false,
                'error' => 'Username/email and password are required',
            ];
        }

        if ($companyId <= 0) {
            return [
                'success' => false,
                'error' => 'Invalid company selected',
            ];
        }

        // Find user in master database
        $user = MasterUser::findByCredential($identity);

        if (!$user || !$user->isActive()) {
            return [
                'success' => false,
                'error' => 'Invalid credentials or inactive account',
            ];
        }

        if (!$user->validatePassword($password)) {
            return [
                'success' => false,
                'error' => 'Invalid credentials',
            ];
        }

        // Verify company access
        if (!$user->isSuperAdmin() && $user->company_id != $companyId) {
            return [
                'success' => false,
                'error' => 'You do not have access to this company',
            ];
        }

        // Get company info
        $company = Yii::$app->companyDb->getCompanyInfo($companyId);

        if (!$company || !$company['is_active']) {
            return [
                'success' => false,
                'error' => 'Company is inactive or not found',
            ];
        }

        // Verify company database
        $dbVerification = Yii::$app->companyDb->verifyCompanyDatabase($companyId);
        if (!$dbVerification['success']) {
            Yii::error("Company database verification failed: " . $dbVerification['message'], __METHOD__);
            return [
                'success' => false,
                'error' => 'Company database not accessible',
            ];
        }

        // Switch to company database to get user role
        Yii::$app->companyDb->switchToCompany($companyId);
        
        // Get user role from company database
        $companyUser = \app\models\User::findOne(['username' => $user->username]);
        $userRole = $companyUser ? $companyUser->role : 'staff';

        // Generate access token
        $user->generateAccessToken();
        $user->updateLastLogin();

        Yii::info("User logged in: {$user->username} to company: {$company['company_name']}", __METHOD__);

        // Log to audit
        Yii::$app->masterDb->createCommand()->insert('audit_log', [
            'company_id' => $companyId,
            'user_id' => $user->id,
            'action' => 'login',
            'details' => "User {$user->username} logged into company {$company['company_name']}",
            'ip_address' => Yii::$app->request->userIP,
            'user_agent' => Yii::$app->request->userAgent,
        ])->execute();

        return [
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'full_name' => $user->full_name,
                    'is_super_admin' => $user->is_super_admin,
                    'role' => $userRole,
                ],
                'company' => [
                    'id' => $company['id'],
                    'name' => $company['company_name'],
                    'code' => $company['company_code'],
                    'db_name' => $company['db_name'],
                ],
                'token' => $user->access_token,
            ],
        ];
    }

    /**
     * Signup new user (creates in master database)
     * POST /api/mt-auth/signup
     * Body: { username, email, password, full_name, company_id }
     */
    public function actionSignup()
    {
        $request = Yii::$app->request;

        $username = trim((string) $request->post('username', ''));
        $email = trim((string) $request->post('email', ''));
        $password = (string) $request->post('password', '');
        $fullName = trim((string) $request->post('full_name', ''));
        $companyId = (int) $request->post('company_id', 0);

        if ($username === '' || $email === '' || $password === '') {
            return [
                'success' => false,
                'error' => 'Username, email, and password are required',
            ];
        }

        if ($companyId <= 0) {
            return [
                'success' => false,
                'error' => 'Invalid company selected',
            ];
        }

        if (strlen($password) < 6) {
            return [
                'success' => false,
                'error' => 'Password must be at least 6 characters',
            ];
        }

        // Verify company exists
        $company = Yii::$app->companyDb->getCompanyInfo($companyId);
        if (!$company) {
            return [
                'success' => false,
                'error' => 'Company not found',
            ];
        }

        // Check if username or email already exists for this company
        $existingUser = MasterUser::find()
            ->where(['company_id' => $companyId])
            ->andWhere(['or', ['username' => $username], ['email' => $email]])
            ->one();

        if ($existingUser) {
            return [
                'success' => false,
                'error' => 'Username or email already exists for this company',
            ];
        }

        // Create new user
        $user = new MasterUser();
        $user->company_id = $companyId;
        $user->username = $username;
        $user->email = $email;
        $user->full_name = $fullName !== '' ? $fullName : $username;
        $user->setPassword($password);
        $user->generateAuthKey();
        $user->status = 1;

        if (!$user->save()) {
            return [
                'success' => false,
                'error' => 'Failed to create user',
                'errors' => $user->errors,
            ];
        }

        // Log to audit
        Yii::$app->masterDb->createCommand()->insert('audit_log', [
            'company_id' => $companyId,
            'user_id' => $user->id,
            'action' => 'signup',
            'details' => "New user account created: {$user->username}",
            'ip_address' => Yii::$app->request->userIP,
            'user_agent' => Yii::$app->request->userAgent,
        ])->execute();

        return [
            'success' => true,
            'message' => 'Signup successful',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'full_name' => $user->full_name,
                ],
                'company' => [
                    'id' => $company['id'],
                    'name' => $company['company_name'],
                    'code' => $company['company_code'],
                ],
                'token' => $user->access_token,
            ],
        ];
    }

    /**
     * Verify token and get user info
     * GET /api/mt-auth/verify-token
     * Headers: Authorization: Bearer {token}
     */
    public function actionVerifyToken()
    {
        $authHeader = Yii::$app->request->headers->get('Authorization');
        
        if (!$authHeader || substr($authHeader, 0, 7) !== 'Bearer ') {
            return [
                'success' => false,
                'error' => 'No token provided',
            ];
        }

        $token = substr($authHeader, 7);
        
        $user = MasterUser::findIdentityByAccessToken($token);

        if (!$user) {
            return [
                'success' => false,
                'error' => 'Invalid token',
            ];
        }

        $company = Yii::$app->companyDb->getCompanyInfo($user->company_id);

        return [
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'full_name' => $user->full_name,
                    'is_super_admin' => $user->is_super_admin,
                ],
                'company' => [
                    'id' => $company['id'],
                    'name' => $company['company_name'],
                    'code' => $company['company_code'],
                ],
            ],
        ];
    }
}
