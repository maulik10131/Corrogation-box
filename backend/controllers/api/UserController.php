<?php

namespace app\controllers\api;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\UnauthorizedHttpException;
use yii\web\BadRequestHttpException;
use app\models\User;
use app\models\MasterUser;

class UserController extends Controller
{
    private $masterUser = null;
    private $companyDb = null;

    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        
        // Enable CORS
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => ['http://localhost:3000'],
                'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Allow-Credentials' => true,
            ],
        ];
        
        return $behaviors;
    }

    /**
     * Authenticate user from Bearer token (Multi-tenant)
     */
    private function authenticateUser()
    {
        $authHeader = Yii::$app->request->headers->get('Authorization');
        
        if (!$authHeader || strpos($authHeader, 'Bearer ') !== 0) {
            throw new UnauthorizedHttpException('Authorization token required');
        }

        $token = substr($authHeader, 7);
        
        // Check in master database for multi-tenant auth
        $masterUser = MasterUser::findOne(['access_token' => $token, 'status' => 1]);
        
        if (!$masterUser) {
            throw new UnauthorizedHttpException('Invalid token');
        }

        // Switch to company database using CompanyDbManager
        try {
            Yii::$app->companyDb->switchToCompany($masterUser->company_id);
            $this->masterUser = $masterUser;
            
            \Yii::info("Switched to company database for company_id: {$masterUser->company_id}", 'application');
        } catch (\Exception $e) {
            \Yii::error("Failed to switch company database: " . $e->getMessage(), 'application');
            throw new UnauthorizedHttpException('Company database not accessible');
        }

        return $masterUser;
    }

    /**
     * Check if user is admin
     */
    private function requireAdmin($user)
    {
        // For master users, check if they are super admin or regular admin
        // Super admins have full access, regular users need admin role in company DB
        if ($user->is_super_admin) {
            return; // Super admin has access
        }

        // Check if user has admin role in company database
        $companyUser = User::findOne(['username' => $user->username]);
        if (!$companyUser || $companyUser->role !== 'admin') {
            throw new UnauthorizedHttpException('Admin access required');
        }
    }

    /**
     * List all users (Admin only)
     */
    public function actionList()
    {
        // Log request for debugging
        \Yii::info('UserController::actionList called', 'application');
        
        try {
            $masterUser = $this->authenticateUser();
            \Yii::info('User authenticated: ' . $masterUser->username, 'application');
            
            $this->requireAdmin($masterUser);
            \Yii::info('Admin check passed', 'application');

            // Get table schema to check available columns
            $schema = User::getTableSchema();
            $availableColumns = ['id', 'username', 'email'];
            
            // Add optional columns if they exist
            if ($schema && isset($schema->columns['full_name'])) {
                $availableColumns[] = 'full_name';
            }
            if ($schema && isset($schema->columns['role'])) {
                $availableColumns[] = 'role';
            }
            if ($schema && isset($schema->columns['department'])) {
                $availableColumns[] = 'department';
            }
            if ($schema && isset($schema->columns['created_at'])) {
                $availableColumns[] = 'created_at';
            }

            // Fetch users from company database
            $users = User::find()
                ->select($availableColumns)
                ->orderBy(['id' => SORT_DESC])
                ->all();

            \Yii::info('Users fetched: ' . count($users), 'application');

            return [
                'success' => true,
                'data' => $users,
                'count' => count($users),
            ];
        } catch (UnauthorizedHttpException $e) {
            \Yii::error('Unauthorized: ' . $e->getMessage(), 'application');
            Yii::$app->response->statusCode = 401;
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        } catch (\Exception $e) {
            \Yii::error('Error: ' . $e->getMessage(), 'application');
            \Yii::error('Stack trace: ' . $e->getTraceAsString(), 'application');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => 'Failed to fetch users: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Update user role (Admin only)
     */
    public function actionUpdateRole()
    {
        try {
            $masterUser = $this->authenticateUser();
            $this->requireAdmin($masterUser);

            $request = Yii::$app->request;
            $userId = (int) $request->post('user_id');
            $newRole = trim((string) $request->post('role', ''));

            if (!$userId || $newRole === '') {
                throw new BadRequestHttpException('User ID and role are required');
            }

            // Validate role
            $validRoles = ['admin', 'manager', 'supervisor', 'operator', 'staff'];
            if (!in_array($newRole, $validRoles)) {
                throw new BadRequestHttpException('Invalid role');
            }

            // Get user from company database
            $user = User::findOne($userId);
            
            if (!$user) {
                return [
                    'success' => false,
                    'error' => 'User not found',
                ];
            }

            // Prevent admin from changing their own role
            if ($user->username === $masterUser->username) {
                return [
                    'success' => false,
                    'error' => 'You cannot change your own role',
                ];
            }

            $oldRole = $user->role;
            $user->role = $newRole;
            
            if ($user->save(false, ['role'])) {
                return [
                    'success' => true,
                    'message' => "Role updated from {$oldRole} to {$newRole}",
                    'data' => [
                        'user_id' => $user->id,
                        'username' => $user->username,
                        'old_role' => $oldRole,
                        'new_role' => $newRole,
                    ],
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to update role',
                ];
            }

        } catch (UnauthorizedHttpException $e) {
            Yii::$app->response->statusCode = 401;
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        } catch (BadRequestHttpException $e) {
            Yii::$app->response->statusCode = 400;
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        } catch (\Exception $e) {
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => 'Failed to update role',
            ];
        }
    }

    /**
     * Update profile (name + email) for the currently authenticated user
     * PUT /api/users/update-profile
     */
    public function actionUpdateProfile()
    {
        try {
            $this->authenticateUser();

            $fullName = Yii::$app->request->post('full_name', '');
            $email    = Yii::$app->request->post('email', '');

            if ($fullName) $this->masterUser->full_name = $fullName;
            if ($email)    $this->masterUser->email     = $email;

            if (!$this->masterUser->save(false)) {
                return ['success' => false, 'error' => 'Failed to save profile'];
            }

            // Also update in company DB users table if exists
            $companyUser = User::findOne(['username' => $this->masterUser->username]);
            if ($companyUser) {
                if ($fullName) $companyUser->full_name = $fullName;
                if ($email)    $companyUser->email     = $email;
                $companyUser->save(false);
            }

            return [
                'success' => true,
                'message' => 'Profile updated successfully',
                'data'    => [
                    'full_name' => $this->masterUser->full_name,
                    'email'     => $this->masterUser->email,
                ],
            ];
        } catch (UnauthorizedHttpException $e) {
            Yii::$app->response->statusCode = 401;
            return ['success' => false, 'error' => $e->getMessage()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Change password for the currently authenticated user
     * POST /api/users/change-password
     */
    public function actionChangePassword()
    {
        try {
            $this->authenticateUser();

            $currentPassword = Yii::$app->request->post('current_password', '');
            $newPassword     = Yii::$app->request->post('new_password', '');

            if (empty($currentPassword) || empty($newPassword)) {
                return ['success' => false, 'error' => 'Current and new passwords are required'];
            }
            if (strlen($newPassword) < 6) {
                return ['success' => false, 'error' => 'New password must be at least 6 characters'];
            }
            if (!$this->masterUser->validatePassword($currentPassword)) {
                return ['success' => false, 'error' => 'Current password is incorrect'];
            }

            $this->masterUser->setPassword($newPassword);
            if (!$this->masterUser->save(false)) {
                return ['success' => false, 'error' => 'Failed to change password'];
            }

            return ['success' => true, 'message' => 'Password changed successfully'];
        } catch (UnauthorizedHttpException $e) {
            Yii::$app->response->statusCode = 401;
            return ['success' => false, 'error' => $e->getMessage()];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
