<?php

namespace app\controllers\api;

use Yii;
use yii\data\ActiveDataProvider;
use yii\rest\Controller;
use yii\web\Response;
use app\models\Dispatch;
use app\models\DispatchItem;
use app\models\WorkOrder;

class DispatchController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $behaviors;
    }

    public function actionIndex()
    {
        $query = Dispatch::find()->with(['items']);

        $status = Yii::$app->request->get('status');
        $customerId = Yii::$app->request->get('customer_id');
        $search = Yii::$app->request->get('search');

        if (!empty($status)) {
            $query->andWhere(['status' => $status]);
        }
        if (!empty($customerId)) {
            $query->andWhere(['customer_id' => $customerId]);
        }
        if (!empty($search)) {
            $query->andWhere(['or',
                ['like', 'dispatch_number', $search],
                ['like', 'challan_number', $search],
                ['like', 'customer_name', $search],
            ]);
        }

        $provider = new ActiveDataProvider([
            'query' => $query,
            'sort' => ['defaultOrder' => ['dispatch_date' => SORT_DESC, 'id' => SORT_DESC]],
            'pagination' => ['pageSize' => Yii::$app->request->get('per_page', 20)],
        ]);

        $rows = [];
        foreach ($provider->getModels() as $model) {
            $data = $model->toArray();
            $data['items'] = $model->items;
            $rows[] = $data;
        }

        return [
            'success' => true,
            'data' => $rows,
            'pagination' => [
                'totalCount' => $provider->getTotalCount(),
                'pageCount' => $provider->getPagination()->getPageCount(),
                'currentPage' => $provider->getPagination()->getPage() + 1,
                'perPage' => $provider->getPagination()->getPageSize(),
            ],
        ];
    }

    public function actionView($id)
    {
        $model = Dispatch::find()->with(['items'])->where(['id' => $id])->one();
        if (!$model) {
            return ['success' => false, 'error' => 'Dispatch not found'];
        }

        $data = $model->toArray();
        $data['items'] = $model->items;

        return ['success' => true, 'data' => $data];
    }

    public function actionCreate()
    {
        $transaction = Yii::$app->db->beginTransaction();

        try {
            $request = Yii::$app->request;
            $workOrderId = $request->post('work_order_id');
            $workOrder = null;

            if (!empty($workOrderId)) {
                $workOrder = WorkOrder::find()->with(['items'])->where(['id' => $workOrderId])->one();
                if (!$workOrder) {
                    throw new \RuntimeException('Work order not found');
                }
            }

            $dispatch = new Dispatch();
            $dispatch->work_order_id = $workOrder ? $workOrder->id : null;
            $dispatch->customer_id = $request->post('customer_id', $workOrder ? $workOrder->customer_id : null);
            $dispatch->customer_name = $request->post('customer_name', $workOrder ? $workOrder->customer_name : '');
            $dispatch->dispatch_date = $request->post('dispatch_date', date('Y-m-d'));
            $dispatch->vehicle_no = $request->post('vehicle_no');
            $dispatch->driver_name = $request->post('driver_name');
            $dispatch->lr_no = $request->post('lr_no');
            $dispatch->eway_bill_no = $request->post('eway_bill_no');
            $dispatch->eway_valid_upto = $request->post('eway_valid_upto');
            $dispatch->destination = $request->post('destination');
            $dispatch->status = $request->post('status', 'planned');
            $dispatch->notes = $request->post('notes');

            if (!$dispatch->save()) {
                throw new \RuntimeException(json_encode($dispatch->errors));
            }

            $items = $request->post('items', []);
            if (empty($items) && $workOrder) {
                foreach ($workOrder->items as $woItem) {
                    if ((int)$woItem->pending_quantity <= 0) {
                        continue;
                    }
                    $items[] = [
                        'work_order_item_id' => $woItem->id,
                        'item_name' => $woItem->box_name,
                        'quantity' => (int)$woItem->pending_quantity,
                        'delivered_quantity' => 0,
                        'unit' => 'pcs',
                        'notes' => '',
                    ];
                }
            }

            $totalQty = 0;
            foreach ($items as $itemData) {
                $item = new DispatchItem();
                $item->dispatch_id = $dispatch->id;
                $item->work_order_item_id = $itemData['work_order_item_id'] ?? null;
                $item->item_name = $itemData['item_name'] ?? '';
                $item->quantity = (int)($itemData['quantity'] ?? 0);
                $item->delivered_quantity = (int)($itemData['delivered_quantity'] ?? 0);
                $item->pending_quantity = max(0, $item->quantity - $item->delivered_quantity);
                $item->unit = $itemData['unit'] ?? 'pcs';
                $item->notes = $itemData['notes'] ?? '';

                if (!$item->save()) {
                    throw new \RuntimeException(json_encode($item->errors));
                }

                $totalQty += $item->quantity;
            }

            $dispatch->total_quantity = $totalQty;
            $dispatch->pending_quantity = max(0, $totalQty - (int)$dispatch->delivered_quantity);
            $dispatch->save(false, ['total_quantity', 'pending_quantity']);

            if ($workOrder && $workOrder->status === WorkOrder::STATUS_PLANNED) {
                $workOrder->status = WorkOrder::STATUS_IN_PROGRESS;
                $workOrder->save(false, ['status']);
            }

            $transaction->commit();

            return [
                'success' => true,
                'message' => 'Dispatch created successfully',
                'data' => Dispatch::find()->with(['items'])->where(['id' => $dispatch->id])->one(),
            ];
        } catch (\Throwable $e) {
            $transaction->rollBack();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function actionUpdate($id)
    {
        $dispatch = Dispatch::find()->with(['items'])->where(['id' => $id])->one();
        if (!$dispatch) {
            return ['success' => false, 'error' => 'Dispatch not found'];
        }

        $request = Yii::$app->request;
        $dispatch->dispatch_date = $request->post('dispatch_date', $dispatch->dispatch_date);
        $dispatch->vehicle_no = $request->post('vehicle_no', $dispatch->vehicle_no);
        $dispatch->driver_name = $request->post('driver_name', $dispatch->driver_name);
        $dispatch->lr_no = $request->post('lr_no', $dispatch->lr_no);
        $dispatch->eway_bill_no = $request->post('eway_bill_no', $dispatch->eway_bill_no);
        $dispatch->eway_valid_upto = $request->post('eway_valid_upto', $dispatch->eway_valid_upto);
        $dispatch->destination = $request->post('destination', $dispatch->destination);
        $dispatch->status = $request->post('status', $dispatch->status);
        $dispatch->notes = $request->post('notes', $dispatch->notes);

        if (!$dispatch->save()) {
            return ['success' => false, 'errors' => $dispatch->errors];
        }

        return [
            'success' => true,
            'message' => 'Dispatch updated successfully',
            'data' => $dispatch,
        ];
    }

    public function actionDelete($id)
    {
        $dispatch = Dispatch::findOne($id);
        if (!$dispatch) {
            return ['success' => false, 'error' => 'Dispatch not found'];
        }

        if ($dispatch->delete()) {
            return [
                'success' => true,
                'message' => 'Dispatch deleted successfully',
            ];
        }

        return ['success' => false, 'error' => 'Failed to delete dispatch'];
    }

    public function actionUpdatePod($id)
    {
        $dispatch = Dispatch::findOne($id);
        if (!$dispatch) {
            return ['success' => false, 'error' => 'Dispatch not found'];
        }

        $dispatch->pod_received = 1;
        $dispatch->pod_received_at = date('Y-m-d H:i:s');
        $dispatch->status = 'pod_received';

        if ($dispatch->save(false, ['pod_received', 'pod_received_at', 'status'])) {
            return [
                'success' => true,
                'message' => 'POD updated successfully',
                'data' => $dispatch,
            ];
        }

        return ['success' => false, 'error' => 'Failed to update POD'];
    }
}
