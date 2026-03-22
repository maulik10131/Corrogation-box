<?php

namespace app\controllers\api;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use app\models\StockTransaction;
use app\models\StockTransactionSearch;
use app\models\RawMaterial;
use app\models\Supplier;

class StockTransactionController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $behaviors;
    }

    /**
     * List transactions with filters
     * GET /api/stock-transactions
     */
    public function actionIndex()
    {
        $searchModel = new StockTransactionSearch();
        $params = Yii::$app->request->queryParams;
        
        $dataProvider = $searchModel->search($params);
        
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
     * View single transaction
     * GET /api/stock-transactions/{id}
     */
    public function actionView($id)
    {
        $model = StockTransaction::findOne($id);
        
        if (!$model) {
            return ['success' => false, 'error' => 'Transaction not found'];
        }

        return ['success' => true, 'data' => $model];
    }

    /**
     * Create Stock In transaction
     * POST /api/stock-transactions/stock-in
     */
    public function actionStockIn()
    {
        $data = Yii::$app->request->post();
        $data['transaction_date'] = $data['transaction_date'] ?? date('Y-m-d');
        
        // Validate transaction type is inward
        $inwardTypes = StockTransaction::getInwardTypes();
        if (!isset($data['transaction_type']) || !in_array($data['transaction_type'], $inwardTypes)) {
            $data['transaction_type'] = StockTransaction::TYPE_PURCHASE;
        }

        // $data['created_by'] = Yii::$app->user->id;

        $result = StockTransaction::createTransaction($data);
        
        if ($result['success']) {
            return [
                'success' => true,
                'message' => 'Stock In recorded successfully',
                'data' => $result['data'],
            ];
        }

        return [
            'success' => false,
            'error' => $result['error'],
        ];
    }

    /**
     * Create Stock Out transaction
     * POST /api/stock-transactions/stock-out
     */
    public function actionStockOut()
    {
        $data = Yii::$app->request->post();
        $data['transaction_date'] = $data['transaction_date'] ?? date('Y-m-d');
        
        // Validate transaction type is outward
        $outwardTypes = StockTransaction::getOutwardTypes();
        if (!isset($data['transaction_type']) || !in_array($data['transaction_type'], $outwardTypes)) {
            $data['transaction_type'] = StockTransaction::TYPE_PRODUCTION_ISSUE;
        }

        // $data['created_by'] = Yii::$app->user->id;

        $result = StockTransaction::createTransaction($data);
        
        if ($result['success']) {
            return [
                'success' => true,
                'message' => 'Stock Out recorded successfully',
                'data' => $result['data'],
            ];
        }

        return [
            'success' => false,
            'error' => $result['error'],
        ];
    }

    /**
     * Quick stock adjustment
     * POST /api/stock-transactions/adjust
     */
    public function actionAdjust()
    {
        $data = Yii::$app->request->post();
        $materialId = $data['material_id'] ?? null;
        $newStock = $data['new_stock'] ?? null;
        $reason = $data['reason'] ?? 'Stock adjustment';

        if (!$materialId || $newStock === null) {
            return ['success' => false, 'error' => 'Material ID and new stock are required'];
        }

        $material = RawMaterial::findOne($materialId);
        if (!$material) {
            return ['success' => false, 'error' => 'Material not found'];
        }

        $difference = $newStock - $material->current_stock;
        
        if ($difference == 0) {
            return ['success' => false, 'error' => 'No adjustment needed'];
        }

        $txnData = [
            'material_id' => $materialId,
            'transaction_type' => $difference > 0 ? StockTransaction::TYPE_ADJUSTMENT_IN : StockTransaction::TYPE_ADJUSTMENT_OUT,
            'quantity' => abs($difference),
            'rate' => $material->avg_rate,
            'transaction_date' => date('Y-m-d'),
            'notes' => $reason,
        ];

        $result = StockTransaction::createTransaction($txnData);
        
        if ($result['success']) {
            return [
                'success' => true,
                'message' => 'Stock adjusted successfully',
                'data' => [
                    'previous_stock' => $material->current_stock - $difference,
                    'adjustment' => $difference,
                    'new_stock' => $material->current_stock,
                    'transaction' => $result['data'],
                ],
            ];
        }

        return [
            'success' => false,
            'error' => $result['error'],
        ];
    }

    /**
     * Get transaction type options
     * GET /api/stock-transactions/options
     */
    public function actionOptions()
    {
        return [
            'success' => true,
            'data' => [
                'all_types' => StockTransaction::getTypeOptions(),
                'inward_types' => array_intersect_key(
                    StockTransaction::getTypeOptions(),
                    array_flip(StockTransaction::getInwardTypes())
                ),
                'outward_types' => array_intersect_key(
                    StockTransaction::getTypeOptions(),
                    array_flip(StockTransaction::getOutwardTypes())
                ),
            ],
        ];
    }

    /**
     * Material-wise stock ledger
     * GET /api/stock-transactions/ledger/{materialId}
     */
    public function actionLedger($materialId)
    {
        $material = RawMaterial::findOne($materialId);
        if (!$material) {
            return ['success' => false, 'error' => 'Material not found'];
        }

        $fromDate = Yii::$app->request->get('from_date', date('Y-m-01'));
        $toDate = Yii::$app->request->get('to_date', date('Y-m-d'));

        // Get opening balance (stock before from_date)
        $openingTxn = StockTransaction::find()
            ->where(['material_id' => $materialId])
            ->andWhere(['<', 'transaction_date', $fromDate])
            ->orderBy(['transaction_date' => SORT_DESC, 'id' => SORT_DESC])
            ->one();
        
        $openingBalance = $openingTxn ? $openingTxn->current_stock : 0;

        // Get transactions in date range
        $transactions = StockTransaction::find()
            ->where(['material_id' => $materialId])
            ->andWhere(['>=', 'transaction_date', $fromDate])
            ->andWhere(['<=', 'transaction_date', $toDate])
            ->orderBy(['transaction_date' => SORT_ASC, 'id' => SORT_ASC])
            ->all();

        // Calculate totals
        $totalIn = 0;
        $totalOut = 0;
        $totalInValue = 0;
        $totalOutValue = 0;

        foreach ($transactions as $txn) {
            if ($txn->isInward()) {
                $totalIn += $txn->quantity;
                $totalInValue += $txn->total_amount;
            } else {
                $totalOut += $txn->quantity;
                $totalOutValue += $txn->total_amount;
            }
        }

        return [
            'success' => true,
            'data' => [
                'material' => $material,
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'opening_balance' => $openingBalance,
                'total_in' => $totalIn,
                'total_out' => $totalOut,
                'closing_balance' => $material->current_stock,
                'total_in_value' => round($totalInValue, 2),
                'total_out_value' => round($totalOutValue, 2),
                'transactions' => $transactions,
            ],
        ];
    }

    /**
     * Stock movement report
     * GET /api/stock-transactions/movement-report
     */
    public function actionMovementReport()
    {
        $fromDate = Yii::$app->request->get('from_date', date('Y-m-01'));
        $toDate = Yii::$app->request->get('to_date', date('Y-m-d'));
        $category = Yii::$app->request->get('category');

        $query = StockTransaction::find()
            ->select([
                'material_id',
                'SUM(CASE WHEN transaction_type IN ("purchase", "production_return", "adjustment_in") THEN quantity ELSE 0 END) as total_in',
                'SUM(CASE WHEN transaction_type IN ("purchase_return", "production_issue", "adjustment_out", "wastage") THEN quantity ELSE 0 END) as total_out',
                'SUM(CASE WHEN transaction_type IN ("purchase", "production_return", "adjustment_in") THEN total_amount ELSE 0 END) as value_in',
                'SUM(CASE WHEN transaction_type IN ("purchase_return", "production_issue", "adjustment_out", "wastage") THEN total_amount ELSE 0 END) as value_out',
            ])
            ->where(['>=', 'transaction_date', $fromDate])
            ->andWhere(['<=', 'transaction_date', $toDate])
            ->groupBy('material_id');

        if ($category) {
            $query->joinWith('material')
                ->andWhere(['raw_materials.category' => $category]);
        }

        $movements = $query->asArray()->all();

        // Get material details
        $materialIds = array_column($movements, 'material_id');
        $materials = RawMaterial::find()
            ->where(['in', 'id', $materialIds])
            ->indexBy('id')
            ->all();

        $report = [];
        foreach ($movements as $movement) {
            $material = $materials[$movement['material_id']] ?? null;
            if ($material) {
                $report[] = [
                    'material_id' => $movement['material_id'],
                    'material_name' => $material->name,
                    'material_code' => $material->code,
                    'category' => $material->category,
                    'unit' => $material->unit,
                    'current_stock' => $material->current_stock,
                    'total_in' => (float) $movement['total_in'],
                    'total_out' => (float) $movement['total_out'],
                    'value_in' => round((float) $movement['value_in'], 2),
                    'value_out' => round((float) $movement['value_out'], 2),
                    'net_movement' => (float) $movement['total_in'] - (float) $movement['total_out'],
                ];
            }
        }

        return [
            'success' => true,
            'data' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'category' => $category,
                'report' => $report,
            ],
        ];
    }

    /**
     * Daily stock summary
     * GET /api/stock-transactions/daily-summary
     */
    public function actionDailySummary()
    {
        $date = Yii::$app->request->get('date', date('Y-m-d'));

        $transactions = StockTransaction::find()
            ->with(['material', 'supplier'])
            ->where(['transaction_date' => $date])
            ->orderBy(['id' => SORT_DESC])
            ->all();

        $summary = [
            'date' => $date,
            'total_transactions' => count($transactions),
            'total_inward' => 0,
            'total_outward' => 0,
            'inward_value' => 0,
            'outward_value' => 0,
        ];

        foreach ($transactions as $txn) {
            if ($txn->isInward()) {
                $summary['total_inward']++;
                $summary['inward_value'] += $txn->total_amount;
            } else {
                $summary['total_outward']++;
                $summary['outward_value'] += $txn->total_amount;
            }
        }

        $summary['inward_value'] = round($summary['inward_value'], 2);
        $summary['outward_value'] = round($summary['outward_value'], 2);

        return [
            'success' => true,
            'data' => [
                'summary' => $summary,
                'transactions' => $transactions,
            ],
        ];
    }
}