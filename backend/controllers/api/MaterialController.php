<?php

namespace app\controllers\api;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\data\ActiveDataProvider;
use app\models\RawMaterial;

class MaterialController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $behaviors;
    }

    /**
     * List all materials
     * GET /api/materials
     */
    public function actionIndex()
    {
        $query = RawMaterial::find();
        
        // Filters
        $category = Yii::$app->request->get('category');
        $status = Yii::$app->request->get('status');
        $lowStock = Yii::$app->request->get('low_stock');
        $search = Yii::$app->request->get('search');

        if ($category) {
            $query->andWhere(['category' => $category]);
        }
        if ($status !== null && $status !== '') {
            $query->andWhere(['status' => $status]);
        }
        if ($lowStock) {
            $query->andWhere('current_stock <= min_stock_level');
        }
        if ($search) {
            $query->andWhere(['or',
                ['like', 'name', $search],
                ['like', 'code', $search],
            ]);
        }

        $dataProvider = new ActiveDataProvider([
            'query' => $query,
            'sort' => [
                'defaultOrder' => ['name' => SORT_ASC],
            ],
            'pagination' => [
                'pageSize' => Yii::$app->request->get('per_page', 50),
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

    /**
     * View single material
     * GET /api/materials/{id}
     */
    public function actionView($id)
    {
        $model = RawMaterial::findOne($id);
        
        if (!$model) {
            return ['success' => false, 'error' => 'Material not found'];
        }

        // Get recent transactions
        $transactions = $model->getTransactions()
            ->orderBy(['transaction_date' => SORT_DESC, 'id' => SORT_DESC])
            ->limit(20)
            ->all();

        return [
            'success' => true,
            'data' => $model,
            'transactions' => $transactions,
        ];
    }

    /**
     * Create new material
     * POST /api/materials
     */
    public function actionCreate()
    {
        $model = new RawMaterial();
        $model->load(Yii::$app->request->post(), '');

        // Generate code if not provided
        if (empty($model->code)) {
            $prefix = strtoupper(substr($model->category, 0, 2));
            $count = RawMaterial::find()->where(['like', 'code', $prefix . '-', false])->count() + 1;
            $model->code = sprintf('%s-%04d', $prefix, $count);
        }

        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Material created successfully',
                'data' => $model,
            ];
        }

        return [
            'success' => false,
            'errors' => $model->errors,
        ];
    }

    /**
     * Update material
     * PUT /api/materials/{id}
     */
    public function actionUpdate($id)
    {
        $model = RawMaterial::findOne($id);

        if (!$model) {
            return ['success' => false, 'error' => 'Material not found'];
        }

        $model->load(Yii::$app->request->post(), '');

        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Material updated successfully',
                'data' => $model,
            ];
        }

        return [
            'success' => false,
            'errors' => $model->errors,
        ];
    }

    /**
     * Delete material
     * DELETE /api/materials/{id}
     */
    public function actionDelete($id)
    {
        $model = RawMaterial::findOne($id);

        if (!$model) {
            return ['success' => false, 'error' => 'Material not found'];
        }

        // Check if material has transactions
        if ($model->getTransactions()->count() > 0) {
            // Soft delete
            $model->status = 0;
            $model->save(false);
            return [
                'success' => true,
                'message' => 'Material deactivated (has transaction history)',
            ];
        }

        if ($model->delete()) {
            return [
                'success' => true,
                'message' => 'Material deleted successfully',
            ];
        }

        return [
            'success' => false,
            'error' => 'Failed to delete material',
        ];
    }

    /**
     * Get category and unit options
     * GET /api/materials/options
     */
    public function actionOptions()
    {
        return [
            'success' => true,
            'data' => [
                'categories' => RawMaterial::getCategoryOptions(),
                'units' => RawMaterial::getUnitOptions(),
            ],
        ];
    }

    /**
     * Get low stock materials
     * GET /api/materials/low-stock
     */
    public function actionLowStock()
    {
        $materials = RawMaterial::find()
            ->where('current_stock <= min_stock_level')
            ->andWhere(['status' => 1])
            ->orderBy(['current_stock' => SORT_ASC])
            ->all();

        return [
            'success' => true,
            'data' => $materials,
            'count' => count($materials),
        ];
    }

    /**
     * Stock summary report
     * GET /api/materials/stock-summary
     */
    public function actionStockSummary()
    {
        $materials = RawMaterial::find()
            ->where(['status' => 1])
            ->all();

        $summary = [
            'total_materials' => count($materials),
            'low_stock_count' => 0,
            'total_stock_value' => 0,
            'by_category' => [],
        ];

        foreach ($materials as $material) {
            $stockValue = $material->current_stock * $material->avg_rate;
            $summary['total_stock_value'] += $stockValue;

            if ($material->current_stock <= $material->min_stock_level) {
                $summary['low_stock_count']++;
            }

            $cat = $material->category;
            if (!isset($summary['by_category'][$cat])) {
                $summary['by_category'][$cat] = [
                    'category' => $cat,
                    'label' => RawMaterial::getCategoryOptions()[$cat] ?? $cat,
                    'count' => 0,
                    'total_qty' => 0,
                    'total_value' => 0,
                ];
            }
            $summary['by_category'][$cat]['count']++;
            $summary['by_category'][$cat]['total_qty'] += $material->current_stock;
            $summary['by_category'][$cat]['total_value'] += $stockValue;
        }

        $summary['by_category'] = array_values($summary['by_category']);
        $summary['total_stock_value'] = round($summary['total_stock_value'], 2);

        return [
            'success' => true,
            'data' => $summary,
        ];
    }
}