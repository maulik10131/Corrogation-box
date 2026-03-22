<?php

namespace app\controllers\api;

use Yii;
use yii\web\Controller;
use yii\web\Response;
use yii\db\Transaction;
use app\models\InventoryItem;
use app\models\InventoryMovement;

class InventoryController extends Controller
{
    public $enableCsrfValidation = false;

    public function beforeAction($action)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        return parent::beforeAction($action);
    }

    public function actionStockOut()
    {
        $body = Yii::$app->request->bodyParams;
        $entries = $body['entries'] ?? [];

        if (empty($entries) || !is_array($entries)) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'message' => 'Stock out entries are required',
            ];
        }

        $db = Yii::$app->db;
        $transaction = $db->beginTransaction(Transaction::SERIALIZABLE);

        try {
            foreach ($entries as $entry) {
                $itemId = (int) ($entry['itemId'] ?? 0);
                $quantity = (float) ($entry['quantity'] ?? 0);

                if ($itemId <= 0 || $quantity <= 0) {
                    throw new \RuntimeException('Invalid stock out entry');
                }

                $item = InventoryItem::findOne($itemId);
                if (!$item) {
                    throw new \RuntimeException('Item not found: ' . $itemId);
                }

                $newStock = (float) $item->current_stock - $quantity;
                if ($newStock < 0) {
                    throw new \RuntimeException('Insufficient stock for ' . $item->name);
                }

                $item->current_stock = $newStock;
                if (!$item->save(false)) {
                    throw new \RuntimeException('Failed to update stock for ' . $item->name);
                }

                $movement = new InventoryMovement();
                $movement->item_id = $itemId;
                $movement->movement_type = InventoryMovement::TYPE_OUT;
                $movement->movement_date = $body['date'] ?? date('Y-m-d');
                $movement->quantity = $quantity;
                $movement->rate = (float) ($entry['rate'] ?? $item->avg_price ?? 0);
                $movement->amount = $movement->quantity * $movement->rate;
                $movement->reference_no = $body['reference_no'] ?? null;
                $movement->reference_type = 'stock_out';
                $movement->remarks = $entry['remarks'] ?? ($body['remarks'] ?? '');
                if (!$movement->save()) {
                    throw new \RuntimeException('Failed to save movement for ' . $item->name);
                }
            }

            $transaction->commit();

            return [
                'success' => true,
                'message' => 'Stock out saved successfully',
            ];
        } catch (\Throwable $e) {
            $transaction->rollBack();
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    public function actionStockIn()
    {
        $body = Yii::$app->request->bodyParams;
        $entries = $body['entries'] ?? [];

        if (empty($entries) || !is_array($entries)) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'message' => 'Stock in entries are required',
            ];
        }

        $db = Yii::$app->db;
        $transaction = $db->beginTransaction(Transaction::SERIALIZABLE);

        try {
            foreach ($entries as $entry) {
                $itemId = (int) ($entry['item_id'] ?? 0);
                $quantity = (float) ($entry['quantity'] ?? 0);
                $rate = (float) ($entry['rate'] ?? 0);

                if ($itemId <= 0 || $quantity <= 0) {
                    throw new \RuntimeException('Invalid stock in entry');
                }

                $item = InventoryItem::findOne($itemId);
                if (!$item) {
                    throw new \RuntimeException('Item not found: ' . $itemId);
                }

                $currentStock = (float) $item->current_stock;
                $currentAvgRate = (float) $item->avg_price;
                $newStock = $currentStock + $quantity;

                if ($rate > 0 && $newStock > 0) {
                    $item->avg_price = (($currentStock * $currentAvgRate) + ($quantity * $rate)) / $newStock;
                }

                $item->current_stock = $newStock;
                if (!$item->save(false)) {
                    throw new \RuntimeException('Failed to update stock for ' . $item->name);
                }

                $movement = new InventoryMovement();
                $movement->item_id = $itemId;
                $movement->movement_type = InventoryMovement::TYPE_IN;
                $movement->movement_date = $body['date'] ?? date('Y-m-d');
                $movement->quantity = $quantity;
                $movement->rate = $rate;
                $movement->amount = $movement->quantity * $movement->rate;
                $movement->reference_no = $body['reference_no'] ?? null;
                $movement->reference_type = 'stock_in';
                $movement->remarks = $entry['remarks'] ?? ($body['remarks'] ?? '');
                if (!$movement->save()) {
                    throw new \RuntimeException('Failed to save movement for ' . $item->name);
                }
            }

            $transaction->commit();

            return [
                'success' => true,
                'message' => 'Stock in saved successfully',
            ];
        } catch (\Throwable $e) {
            $transaction->rollBack();
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    public function actionSummary()
    {
        $items = InventoryItem::find()->all();
        $byCategory = [];
        $totalValue = 0;
        $lowStockCount = 0;

        foreach ($items as $item) {
            $value = (float) $item->current_stock * (float) $item->avg_price;
            $totalValue += $value;

            $isLow = (float) $item->current_stock > 0 && (float) $item->current_stock <= (float) $item->min_stock;
            $isOut = (float) $item->current_stock <= 0;
            if ($isLow || $isOut) {
                $lowStockCount++;
            }

            $category = $item->category ?: 'Uncategorized';
            if (!isset($byCategory[$category])) {
                $byCategory[$category] = [
                    'category' => $category,
                    'items_count' => 0,
                    'total_value' => 0,
                    'low_stock' => 0,
                    'out_of_stock' => 0,
                ];
            }

            $byCategory[$category]['items_count']++;
            $byCategory[$category]['total_value'] += $value;
            if ($isLow) {
                $byCategory[$category]['low_stock']++;
            }
            if ($isOut) {
                $byCategory[$category]['out_of_stock']++;
            }
        }

        return [
            'success' => true,
            'data' => [
                'total_items' => count($items),
                'low_stock_count' => $lowStockCount,
                'total_stock_value' => round($totalValue, 2),
                'by_category' => array_values($byCategory),
            ],
        ];
    }

    public function actionMovements()
    {
        $fromDate = Yii::$app->request->get('from_date');
        $toDate = Yii::$app->request->get('to_date');
        $limit = (int) Yii::$app->request->get('limit', 100);

        $query = InventoryMovement::find()->with('item');
        if (!empty($fromDate)) {
            $query->andWhere(['>=', 'movement_date', $fromDate]);
        }
        if (!empty($toDate)) {
            $query->andWhere(['<=', 'movement_date', $toDate]);
        }

        $rows = $query->orderBy(['movement_date' => SORT_DESC, 'id' => SORT_DESC])->limit($limit)->all();

        return [
            'success' => true,
            'data' => $rows,
        ];
    }
}
