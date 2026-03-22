<?php

namespace app\controllers\api;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\UnauthorizedHttpException;
use yii\data\ActiveDataProvider;
use app\models\Customer;
use app\models\MasterUser;

class CustomerController extends Controller
{
    private $masterUser = null;

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
     * Authenticate user and switch to company database
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

        // Switch to company database
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

    public function actionIndex()
    {
        try {
            $this->authenticateUser();
        } catch (UnauthorizedHttpException $e) {
            Yii::$app->response->statusCode = 401;
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }

        $query = Customer::find();

        $status = Yii::$app->request->get('status');
        $search = Yii::$app->request->get('search');

        if ($status !== null && $status !== '') {
            $query->andWhere(['status' => $status]);
        }

        if ($search) {
            $query->andWhere(['or',
                ['like', 'name', $search],
                ['like', 'company_name', $search],
                ['like', 'contact_person', $search],
                ['like', 'mobile', $search],
                ['like', 'email', $search],
                ['like', 'city', $search],
            ]);
        }

        $dataProvider = new ActiveDataProvider([
            'query' => $query,
            'sort' => [
                'defaultOrder' => ['name' => SORT_ASC],
            ],
            'pagination' => [
                'pageSize' => Yii::$app->request->get('per_page', 100),
            ],
        ]);

        return [
            'success' => true,
            'data' => $dataProvider->getModels(),
            'pagination' => [
                'totalCount' => $dataProvider->getTotalCount(),
                'pageCount' => $dataProvider->getPagination()->getPageCount(),
                'currentPage' => $dataProvider->getPagination()->getPage() + 1,
                'perPage' => $dataProvider->getPagination()->getPageSize(),
            ],
        ];
    }

    public function actionView($id)
    {
        try {
            $this->authenticateUser();
        } catch (UnauthorizedHttpException $e) {
            Yii::$app->response->statusCode = 401;
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $model = Customer::findOne($id);

        if (!$model) {
            return ['success' => false, 'error' => 'Customer not found'];
        }

        return [
            'success' => true,
            'data' => $model,
        ];
    }

    public function actionCreate()
    {
        try {
            $this->authenticateUser();
        } catch (UnauthorizedHttpException $e) {
            Yii::$app->response->statusCode = 401;
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $model = new Customer();
        $model->load(Yii::$app->request->post(), '');

        if ($model->current_balance === null) {
            $model->current_balance = (float) ($model->opening_balance ?? 0);
        }

        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Customer created successfully',
                'data' => $model,
            ];
        }

        return [
            'success' => false,
            'errors' => $model->errors,
            'error' => 'Validation failed',
        ];
    }

    public function actionUpdate($id)
    {
        try {
            $this->authenticateUser();
        } catch (UnauthorizedHttpException $e) {
            Yii::$app->response->statusCode = 401;
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $model = Customer::findOne($id);

        if (!$model) {
            return ['success' => false, 'error' => 'Customer not found'];
        }

        $model->load(Yii::$app->request->post(), '');

        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Customer updated successfully',
                'data' => $model,
            ];
        }

        return [
            'success' => false,
            'errors' => $model->errors,
            'error' => 'Validation failed',
        ];
    }

    public function actionDelete($id)
    {
        try {
            $this->authenticateUser();
        } catch (UnauthorizedHttpException $e) {
            Yii::$app->response->statusCode = 401;
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $model = Customer::findOne($id);

        if (!$model) {
            return ['success' => false, 'error' => 'Customer not found'];
        }

        if ($model->delete()) {
            return [
                'success' => true,
                'message' => 'Customer deleted successfully',
            ];
        }

        return [
            'success' => false,
            'error' => 'Failed to delete customer',
        ];
    }
}
