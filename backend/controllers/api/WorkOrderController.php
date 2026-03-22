<?php

namespace app\controllers\api;

use Yii;
use yii\data\ActiveDataProvider;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\UnauthorizedHttpException;
use app\models\Quotation;
use app\models\WorkOrder;
use app\models\WorkOrderItem;
use app\models\WorkOrderStatusLog;
use app\models\MasterUser;

class WorkOrderController extends Controller
{
    private $masterUser = null;

    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => ['http://localhost:3000'],
                'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Allow-Credentials' => true,
                'Access-Control-Max-Age' => 86400,
            ],
        ];
        return $behaviors;
    }

    private function authenticateUser()
    {
        $authHeader = Yii::$app->request->headers->get('Authorization');
        if (!$authHeader || strpos($authHeader, 'Bearer ') !== 0) {
            throw new UnauthorizedHttpException('Missing or invalid authorization token.');
        }
        $token = substr($authHeader, 7);
        if (empty($token)) {
            throw new UnauthorizedHttpException('Missing or invalid authorization token.');
        }

        // Try MasterUser first (multi-tenant login)
        $this->masterUser = MasterUser::findOne(['access_token' => $token, 'status' => 1]);
        if ($this->masterUser) {
            Yii::$app->companyDb->switchToCompany($this->masterUser->company_id);
            return;
        }

        // Fall back to regular User token (single-tenant login)
        $schema = \app\models\User::getTableSchema();
        if ($schema && isset($schema->columns['access_token'])) {
            $regularUser = \app\models\User::findOne(['access_token' => $token]);
            if ($regularUser) {
                return;
            }
        }

        // Accept 'default_token' as dev fallback (issued when no real token exists)
        if ($token === 'default_token') {
            return;
        }

        throw new UnauthorizedHttpException('Invalid or expired token.');
    }

    public function actionIndex()
    {
        try { $this->authenticateUser(); } catch (UnauthorizedHttpException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
        $query = WorkOrder::find()->with(['items']);

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
                ['like', 'work_order_number', $search],
                ['like', 'customer_name', $search],
            ]);
        }

        $provider = new ActiveDataProvider([
            'query' => $query,
            'sort' => ['defaultOrder' => ['order_date' => SORT_DESC, 'id' => SORT_DESC]],
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
        try { $this->authenticateUser(); } catch (UnauthorizedHttpException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $model = WorkOrder::find()->with(['items', 'statusLogs'])->where(['id' => $id])->one();
        if (!$model) {
            return ['success' => false, 'error' => 'Work order not found'];
        }

        $data = $model->toArray();
        $data['items'] = $model->items;
        $data['status_logs'] = $model->statusLogs;

        return ['success' => true, 'data' => $data];
    }

    public function actionCreate()
    {
        try { $this->authenticateUser(); } catch (UnauthorizedHttpException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $request = Yii::$app->request;
        $transaction = Yii::$app->db->beginTransaction();

        try {
            $model = new WorkOrder();
            $model->load($request->post(), '');
            if (empty($model->order_date)) {
                $model->order_date = date('Y-m-d');
            }

            if (!$model->save()) {
                throw new \RuntimeException(json_encode($model->errors));
            }

            $items = $request->post('items', []);
            $totalQty = 0;
            foreach ($items as $itemData) {
                $item = new WorkOrderItem();
                $item->work_order_id = $model->id;
                $item->quotation_item_id = $itemData['quotation_item_id'] ?? null;
                $item->box_name = $itemData['box_name'] ?? '';
                $item->box_type = $itemData['box_type'] ?? 'RSC';
                $item->length = (float)($itemData['length'] ?? 0);
                $item->width = (float)($itemData['width'] ?? 0);
                $item->height = (float)($itemData['height'] ?? 0);
                $item->ply_count = (int)($itemData['ply_count'] ?? 3);
                $item->flute_type = $itemData['flute_type'] ?? 'B';
                $item->gsm = $itemData['gsm'] ?? null;
                $item->print_type = $itemData['print_type'] ?? null;
                $item->quantity = (int)($itemData['quantity'] ?? 0);
                $item->produced_quantity = (int)($itemData['produced_quantity'] ?? 0);
                $item->pending_quantity = max(0, $item->quantity - $item->produced_quantity);
                $item->unit_rate = (float)($itemData['unit_rate'] ?? 0);
                $item->amount = (float)($itemData['amount'] ?? ($item->unit_rate * $item->quantity));
                $item->notes = $itemData['notes'] ?? '';

                if (!$item->save()) {
                    throw new \RuntimeException(json_encode($item->errors));
                }

                $totalQty += $item->quantity;
            }

            $model->total_quantity = $totalQty;
            $model->pending_quantity = max(0, $totalQty - (int)$model->produced_quantity);
            $model->save(false, ['total_quantity', 'pending_quantity']);

            $log = new WorkOrderStatusLog();
            $log->work_order_id = $model->id;
            $log->from_status = null;
            $log->to_status = $model->status;
            $log->remarks = 'Work order created';
            $log->save(false);

            $transaction->commit();

            return [
                'success' => true,
                'message' => 'Work order created successfully',
                'data' => WorkOrder::find()->with(['items'])->where(['id' => $model->id])->one(),
            ];
        } catch (\Throwable $e) {
            $transaction->rollBack();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function actionCreateFromQuotation($quotationId)
    {
        try { $this->authenticateUser(); } catch (UnauthorizedHttpException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $quotation = Quotation::find()->with(['items', 'customer'])->where(['id' => $quotationId])->one();
        if (!$quotation) {
            return ['success' => false, 'error' => 'Quotation not found'];
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            $workOrder = new WorkOrder();
            $workOrder->quotation_id = $quotation->id;
            $workOrder->customer_id = $quotation->customer_id;
            $workOrder->customer_name = $quotation->customer_name ?: ($quotation->customer ? $quotation->customer->name : '');
            $workOrder->order_date = date('Y-m-d');
            $workOrder->target_date = Yii::$app->request->post('target_date');
            $workOrder->priority = Yii::$app->request->post('priority', 'normal');
            $workOrder->notes = Yii::$app->request->post('notes', $quotation->notes);
            $workOrder->status = WorkOrder::STATUS_PLANNED;

            if (!$workOrder->save()) {
                throw new \RuntimeException(json_encode($workOrder->errors));
            }

            $totalQty = 0;
            foreach ($quotation->items as $qi) {
                $item = new WorkOrderItem();
                $item->work_order_id = $workOrder->id;
                $item->quotation_item_id = $qi->id;
                $item->box_name = $qi->box_name;
                $item->box_type = $qi->box_type;
                $item->length = $qi->length;
                $item->width = $qi->width;
                $item->height = $qi->height;
                $item->ply_count = $qi->ply_count;
                $item->flute_type = $qi->flute_type;
                $item->gsm = !empty($qi->paper_config) ? json_encode($qi->paper_config) : null;
                $item->print_type = null;
                $item->quantity = (int)$qi->quantity;
                $item->produced_quantity = 0;
                $item->pending_quantity = (int)$qi->quantity;
                $item->unit_rate = (float)$qi->selling_price;
                $item->amount = (float)$qi->amount;
                $item->notes = $qi->notes;

                if (!$item->save()) {
                    throw new \RuntimeException(json_encode($item->errors));
                }

                $totalQty += $item->quantity;
            }

            $workOrder->total_quantity = $totalQty;
            $workOrder->pending_quantity = $totalQty;
            $workOrder->save(false, ['total_quantity', 'pending_quantity']);

            $log = new WorkOrderStatusLog();
            $log->work_order_id = $workOrder->id;
            $log->from_status = null;
            $log->to_status = $workOrder->status;
            $log->remarks = 'Created from quotation ' . $quotation->quotation_number;
            $log->save(false);

            $quotation->status = Quotation::STATUS_CONVERTED;
            $quotation->save(false, ['status']);

            $transaction->commit();

            return [
                'success' => true,
                'message' => 'Work order created from quotation',
                'data' => WorkOrder::find()->with(['items'])->where(['id' => $workOrder->id])->one(),
            ];
        } catch (\Throwable $e) {
            $transaction->rollBack();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function actionUpdateStatus($id)
    {
        try { $this->authenticateUser(); } catch (UnauthorizedHttpException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $model = WorkOrder::findOne($id);
        if (!$model) {
            return ['success' => false, 'error' => 'Work order not found'];
        }

        $newStatus = Yii::$app->request->post('status');
        if (empty($newStatus) || !array_key_exists($newStatus, WorkOrder::getStatusOptions())) {
            return ['success' => false, 'error' => 'Invalid status'];
        }

        $oldStatus = $model->status;
        $model->status = $newStatus;

        if ($newStatus === WorkOrder::STATUS_COMPLETED) {
            $model->produced_quantity = $model->total_quantity;
            $model->pending_quantity = 0;
        }

        if (!$model->save()) {
            return ['success' => false, 'errors' => $model->errors];
        }

        $log = new WorkOrderStatusLog();
        $log->work_order_id = $model->id;
        $log->from_status = $oldStatus;
        $log->to_status = $newStatus;
        $log->remarks = Yii::$app->request->post('remarks', 'Status updated');
        $log->save(false);

        return [
            'success' => true,
            'message' => 'Work order status updated',
            'data' => $model,
        ];
    }
}
