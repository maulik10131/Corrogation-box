<?php

namespace app\controllers\api;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\data\ActiveDataProvider;
use app\models\Supplier;

class SupplierController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $behaviors;
    }

    /**
     * List all suppliers
     * GET /api/suppliers
     */
    public function actionIndex()
    {
        $query = Supplier::find();
        
        $status = Yii::$app->request->get('status');
        $search = Yii::$app->request->get('search');

        if ($status !== null && $status !== '') {
            $query->andWhere(['status' => $status]);
        }
        if ($search) {
            $query->andWhere(['or',
                ['like', 'name', $search],
                ['like', 'company_name', $search],
                ['like', 'city', $search],
            ]);
        }

        $dataProvider = new ActiveDataProvider([
            'query' => $query,
            'sort' => [
                'defaultOrder' => ['name' => SORT_ASC],
            ],
            'pagination' => [
                'pageSize' => 50,
            ],
        ]);

        return [
            'success' => true,
            'data' => $dataProvider->getModels(),
            'pagination' => [
                'totalCount' => $dataProvider->getTotalCount(),
            ],
        ];
    }

    /**
     * View single supplier
     * GET /api/suppliers/{id}
     */
    public function actionView($id)
    {
        $model = Supplier::findOne($id);
        
        if (!$model) {
            return ['success' => false, 'error' => 'Supplier not found'];
        }

        return [
            'success' => true,
            'data' => $model,
            'total_purchase' => $model->getTotalPurchase(),
        ];
    }

    /**
     * Create new supplier
     * POST /api/suppliers
     */
    public function actionCreate()
    {
        $model = new Supplier();
        $model->load(Yii::$app->request->post(), '');

        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Supplier created successfully',
                'data' => $model,
            ];
        }

        return [
            'success' => false,
            'errors' => $model->errors,
        ];
    }

    /**
     * Update supplier
     * PUT /api/suppliers/{id}
     */
    public function actionUpdate($id)
    {
        $model = Supplier::findOne($id);

        if (!$model) {
            return ['success' => false, 'error' => 'Supplier not found'];
        }

        $model->load(Yii::$app->request->post(), '');

        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Supplier updated successfully',
                'data' => $model,
            ];
        }

        return [
            'success' => false,
            'errors' => $model->errors,
        ];
    }

    /**
     * Delete supplier
     * DELETE /api/suppliers/{id}
     */
    public function actionDelete($id)
    {
        $model = Supplier::findOne($id);

        if (!$model) {
            return ['success' => false, 'error' => 'Supplier not found'];
        }

        // Check if supplier has transactions
        if ($model->getTransactions()->count() > 0) {
            $model->status = 0;
            $model->save(false);
            return [
                'success' => true,
                'message' => 'Supplier deactivated (has transaction history)',
            ];
        }

        if ($model->delete()) {
            return [
                'success' => true,
                'message' => 'Supplier deleted successfully',
            ];
        }

        return [
            'success' => false,
            'error' => 'Failed to delete supplier',
        ];
    }
}