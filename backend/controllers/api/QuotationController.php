<?php

namespace app\controllers\api;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\UnauthorizedHttpException;
use yii\data\ActiveDataProvider;
use app\models\Quotation;
use app\models\QuotationItem;
use app\models\Customer;
use app\models\MasterUser;
use app\components\BoxCalculator;

class QuotationController extends Controller
{
    private $masterUser = null;

    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        
        // Add CORS headers
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

    /**
     * Authenticate user via Bearer token and switch to company database
     */
    private function authenticateUser()
    {
        $authHeader = Yii::$app->request->headers->get('Authorization');
        if (!$authHeader || strpos($authHeader, 'Bearer ') !== 0) {
            throw new UnauthorizedHttpException('Missing or invalid authorization token.');
        }

        $token = substr($authHeader, 7);
        $this->masterUser = MasterUser::findOne(['access_token' => $token, 'status' => 1]);

        if (!$this->masterUser) {
            throw new UnauthorizedHttpException('Invalid or expired token.');
        }

        // Switch to company database
        Yii::$app->companyDb->switchToCompany($this->masterUser->company_id);
    }

    /**
     * List quotations
     * GET /api/quotations
     */
    public function actionIndex()
    {
        try {
            $this->authenticateUser();
        } catch (UnauthorizedHttpException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $query = Quotation::find()->with(['customer', 'items']);

        // Filters
        $status = Yii::$app->request->get('status');
        $customerId = Yii::$app->request->get('customer_id');
        $fromDate = Yii::$app->request->get('from_date');
        $toDate = Yii::$app->request->get('to_date');
        $search = Yii::$app->request->get('search');

        if ($status) {
            $query->andWhere(['status' => $status]);
        }
        if ($customerId) {
            $query->andWhere(['customer_id' => $customerId]);
        }
        if ($fromDate) {
            $query->andWhere(['>=', 'quotation_date', $fromDate]);
        }
        if ($toDate) {
            $query->andWhere(['<=', 'quotation_date', $toDate]);
        }
        if ($search) {
            $query->andWhere(['or',
                ['like', 'quotation_number', $search],
                ['like', 'customer_name', $search],
            ]);
        }

        $dataProvider = new ActiveDataProvider([
            'query' => $query,
            'sort' => [
                'defaultOrder' => ['quotation_date' => SORT_DESC, 'id' => SORT_DESC],
            ],
            'pagination' => [
                'pageSize' => Yii::$app->request->get('per_page', 20),
            ],
        ]);

        $models = $dataProvider->getModels();
        $result = [];
        foreach ($models as $model) {
            $data = $model->toArray();
            $data['items'] = $model->items;
            $result[] = $data;
        }

        return [
            'success' => true,
            'data' => $result,
            'pagination' => [
                'totalCount' => $dataProvider->getTotalCount(),
                'pageCount' => $dataProvider->getPagination()->getPageCount(),
                'currentPage' => $dataProvider->getPagination()->getPage() + 1,
                'perPage' => $dataProvider->getPagination()->getPageSize(),
            ],
        ];
    }

    /**
     * View single quotation
     * GET /api/quotations/{id}
     */
    public function actionView($id)
    {
        try {
            $this->authenticateUser();
        } catch (UnauthorizedHttpException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $model = Quotation::find()
            ->with(['customer', 'items', 'createdByUser'])
            ->where(['id' => $id])
            ->one();

        if (!$model) {
            return ['success' => false, 'error' => 'Quotation not found'];
        }

        $data = $model->toArray();
        $data['items'] = $model->items;
        $data['customer'] = $model->customer;
        $data['created_by_name'] = $model->createdByUser ? $model->createdByUser->full_name : null;

        return [
            'success' => true,
            'data' => $data,
        ];
    }

    /**
     * Create new quotation
     * POST /api/quotations
     */
    public function actionCreate()
    {
        try {
            $this->authenticateUser();
        } catch (UnauthorizedHttpException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $transaction = Yii::$app->db->beginTransaction();

        try {
            $request = Yii::$app->request;
            
            // Create quotation
            $model = new Quotation();
            $model->customer_id = $request->post('customer_id');
            $model->quotation_date = $request->post('quotation_date', date('Y-m-d'));
            $model->validity_days = $request->post('validity_days', 15);
            $model->discount_percent = $request->post('discount_percent', 0);
            $model->cgst_percent = $request->post('cgst_percent', 9);
            $model->sgst_percent = $request->post('sgst_percent', 9);
            $model->igst_percent = $request->post('igst_percent', 0);
            $model->delivery_terms = $request->post('delivery_terms');
            $model->payment_terms = $request->post('payment_terms');
            $model->notes = $request->post('notes');
            $model->terms_conditions = $request->post('terms_conditions');
            $model->status = Quotation::STATUS_DRAFT;
            // $model->created_by = Yii::$app->user->id;

            if (!$model->save()) {
                throw new \Exception(json_encode($model->errors));
            }

            // Add items
            $items = $request->post('items', []);
            foreach ($items as $index => $itemData) {
                $item = new QuotationItem();
                $item->quotation_id = $model->id;
                $item->box_name = $itemData['box_name'] ?? '';
                $item->box_type = $itemData['box_type'] ?? 'RSC';
                $item->length = $itemData['length'];
                $item->width = $itemData['width'];
                $item->height = $itemData['height'];
                $item->ply_count = $itemData['ply_count'] ?? 3;
                $item->flute_type = $itemData['flute_type'] ?? 'B';
                $item->paper_config = $itemData['paper_config'] ?? BoxCalculator::getDefaultPaperConfig($item->ply_count);
                $item->ups = $itemData['ups'] ?? 1;
                $item->paper_rate = $itemData['paper_rate'] ?? 42;
                $item->conversion_cost = $itemData['conversion_cost'] ?? 2.5;
                $item->printing_cost = $itemData['printing_cost'] ?? 0;
                $item->die_cost = $itemData['die_cost'] ?? 0;
                $item->other_cost = $itemData['other_cost'] ?? 0;
                $item->margin_percent = $itemData['margin_percent'] ?? 15;
                $item->quantity = $itemData['quantity'];
                $item->notes = $itemData['notes'] ?? '';
                $item->sort_order = $index;

                // Auto calculate if selling price not provided
                if (empty($itemData['selling_price'])) {
                    $item->calculateFromBox();
                } else {
                    $item->selling_price = $itemData['selling_price'];
                    $item->cost_per_box = $itemData['cost_per_box'] ?? 0;
                    $item->amount = $item->selling_price * $item->quantity;
                }

                if (!$item->save()) {
                    throw new \Exception(json_encode($item->errors));
                }
            }

            // Calculate totals
            $model->refresh();
            $model->calculateTotals();

            $transaction->commit();

            // Reload with items
            $model = Quotation::find()->with(['items'])->where(['id' => $model->id])->one();
            $data = $model->toArray();
            $data['items'] = $model->items;

            return [
                'success' => true,
                'message' => 'Quotation created successfully',
                'data' => $data,
            ];

        } catch (\Exception $e) {
            $transaction->rollBack();
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Update quotation
     * PUT /api/quotations/{id}
     */
    public function actionUpdate($id)
    {
        try {
            $this->authenticateUser();
        } catch (UnauthorizedHttpException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $model = Quotation::findOne($id);

        if (!$model) {
            return ['success' => false, 'error' => 'Quotation not found'];
        }

        $transaction = Yii::$app->db->beginTransaction();

        try {
            $request = Yii::$app->request;

            // Update quotation fields
            $model->customer_id = $request->post('customer_id', $model->customer_id);
            $model->quotation_date = $request->post('quotation_date', $model->quotation_date);
            $model->validity_days = $request->post('validity_days', $model->validity_days);
            $model->valid_until = $request->post('valid_until', $model->valid_until);
            $model->discount_percent = $request->post('discount_percent', $model->discount_percent);
            $model->cgst_percent = $request->post('cgst_percent', $model->cgst_percent);
            $model->sgst_percent = $request->post('sgst_percent', $model->sgst_percent);
            $model->igst_percent = $request->post('igst_percent', $model->igst_percent);
            $model->delivery_terms = $request->post('delivery_terms', $model->delivery_terms);
            $model->payment_terms = $request->post('payment_terms', $model->payment_terms);
            $model->notes = $request->post('notes', $model->notes);
            $model->terms_conditions = $request->post('terms_conditions', $model->terms_conditions);
            $incomingStatus = $request->post('status');
            if (!empty($incomingStatus)) {
                $model->status = $incomingStatus;
            }

            if (!$model->save()) {
                throw new \Exception(json_encode($model->errors));
            }

            // Update items if provided
            $items = $request->post('items');
            if ($items !== null) {
                // Delete existing items
                QuotationItem::deleteAll(['quotation_id' => $model->id]);

                // Add new items
                foreach ($items as $index => $itemData) {
                    $item = new QuotationItem();
                    $item->quotation_id = $model->id;
                    $item->box_name = $itemData['box_name'] ?? '';
                    $item->box_type = $itemData['box_type'] ?? 'RSC';
                    $item->length = $itemData['length'];
                    $item->width = $itemData['width'];
                    $item->height = $itemData['height'];
                    $item->ply_count = $itemData['ply_count'] ?? 3;
                    $item->flute_type = $itemData['flute_type'] ?? 'B';
                    $item->paper_config = $itemData['paper_config'] ?? null;
                    $item->ups = $itemData['ups'] ?? 1;
                    $item->paper_rate = $itemData['paper_rate'] ?? 42;
                    $item->conversion_cost = $itemData['conversion_cost'] ?? 2.5;
                    $item->printing_cost = $itemData['printing_cost'] ?? 0;
                    $item->die_cost = $itemData['die_cost'] ?? 0;
                    $item->other_cost = $itemData['other_cost'] ?? 0;
                    $item->margin_percent = $itemData['margin_percent'] ?? 15;
                    $item->selling_price = $itemData['selling_price'] ?? 0;
                    $item->cost_per_box = $itemData['cost_per_box'] ?? 0;
                    $item->quantity = $itemData['quantity'];
                    $item->amount = $itemData['amount'] ?? ($item->selling_price * $item->quantity);
                    $item->notes = $itemData['notes'] ?? '';
                    $item->sort_order = $index;

                    if (empty($item->selling_price)) {
                        $item->calculateFromBox();
                    }

                    if (!$item->save()) {
                        throw new \Exception(json_encode($item->errors));
                    }
                }
            }

            // Recalculate totals
            $model->refresh();
            $model->calculateTotals();

            $transaction->commit();

            // Reload with items
            $model = Quotation::find()->with(['items'])->where(['id' => $model->id])->one();
            $data = $model->toArray();
            $data['items'] = $model->items;

            return [
                'success' => true,
                'message' => 'Quotation updated successfully',
                'data' => $data,
            ];

        } catch (\Exception $e) {
            $transaction->rollBack();
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Delete quotation
     * DELETE /api/quotations/{id}
     */
    public function actionDelete($id)
    {
        try {
            $this->authenticateUser();
        } catch (UnauthorizedHttpException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $model = Quotation::findOne($id);

        if (!$model) {
            return ['success' => false, 'error' => 'Quotation not found'];
        }

        if ($model->status === Quotation::STATUS_CONVERTED) {
            return ['success' => false, 'error' => 'Cannot delete converted quotation'];
        }

        // Delete items first
        QuotationItem::deleteAll(['quotation_id' => $model->id]);

        if ($model->delete()) {
            return [
                'success' => true,
                'message' => 'Quotation deleted successfully',
            ];
        }

        return [
            'success' => false,
            'error' => 'Failed to delete quotation',
        ];
    }

    /**
     * Add item to quotation
     * POST /api/quotations/{id}/items
     */
    public function actionAddItem($id)
    {
        $quotation = Quotation::findOne($id);

        if (!$quotation) {
            return ['success' => false, 'error' => 'Quotation not found'];
        }

        $request = Yii::$app->request;

        $item = new QuotationItem();
        $item->quotation_id = $id;
        $item->box_name = $request->post('box_name', '');
        $item->box_type = $request->post('box_type', 'RSC');
        $item->length = $request->post('length');
        $item->width = $request->post('width');
        $item->height = $request->post('height');
        $item->ply_count = $request->post('ply_count', 3);
        $item->flute_type = $request->post('flute_type', 'B');
        $item->paper_config = $request->post('paper_config');
        $item->ups = $request->post('ups', 1);
        $item->paper_rate = $request->post('paper_rate', 42);
        $item->conversion_cost = $request->post('conversion_cost', 2.5);
        $item->printing_cost = $request->post('printing_cost', 0);
        $item->die_cost = $request->post('die_cost', 0);
        $item->other_cost = $request->post('other_cost', 0);
        $item->margin_percent = $request->post('margin_percent', 15);
        $item->quantity = $request->post('quantity');
        $item->notes = $request->post('notes', '');
        $item->sort_order = count($quotation->items);

        // Calculate if selling price not provided
        if (!$request->post('selling_price')) {
            $item->calculateFromBox();
        } else {
            $item->selling_price = $request->post('selling_price');
            $item->cost_per_box = $request->post('cost_per_box', 0);
            $item->amount = $item->selling_price * $item->quantity;
        }

        if ($item->save()) {
            return [
                'success' => true,
                'message' => 'Item added successfully',
                'data' => $item,
            ];
        }

        return [
            'success' => false,
            'errors' => $item->errors,
        ];
    }

    /**
     * Update quotation item
     * PUT /api/quotations/{id}/items/{itemId}
     */
    public function actionUpdateItem($id, $itemId)
    {
        $item = QuotationItem::findOne(['id' => $itemId, 'quotation_id' => $id]);

        if (!$item) {
            return ['success' => false, 'error' => 'Item not found'];
        }

        $request = Yii::$app->request;

        $item->box_name = $request->post('box_name', $item->box_name);
        $item->box_type = $request->post('box_type', $item->box_type);
        $item->length = $request->post('length', $item->length);
        $item->width = $request->post('width', $item->width);
        $item->height = $request->post('height', $item->height);
        $item->ply_count = $request->post('ply_count', $item->ply_count);
        $item->flute_type = $request->post('flute_type', $item->flute_type);
        $item->paper_config = $request->post('paper_config', $item->paper_config);
        $item->ups = $request->post('ups', $item->ups);
        $item->paper_rate = $request->post('paper_rate', $item->paper_rate);
        $item->conversion_cost = $request->post('conversion_cost', $item->conversion_cost);
        $item->printing_cost = $request->post('printing_cost', $item->printing_cost);
        $item->die_cost = $request->post('die_cost', $item->die_cost);
        $item->other_cost = $request->post('other_cost', $item->other_cost);
        $item->margin_percent = $request->post('margin_percent', $item->margin_percent);
        $item->quantity = $request->post('quantity', $item->quantity);
        $item->notes = $request->post('notes', $item->notes);

        // Recalculate if dimensions changed
        $recalculate = $request->post('recalculate', false);
        if ($recalculate) {
            $item->calculateFromBox();
        } else {
            $item->selling_price = $request->post('selling_price', $item->selling_price);
            $item->cost_per_box = $request->post('cost_per_box', $item->cost_per_box);
            $item->amount = $item->selling_price * $item->quantity;
        }

        if ($item->save()) {
            return [
                'success' => true,
                'message' => 'Item updated successfully',
                'data' => $item,
            ];
        }

        return [
            'success' => false,
            'errors' => $item->errors,
        ];
    }

    /**
     * Delete quotation item
     * DELETE /api/quotations/{id}/items/{itemId}
     */
    public function actionDeleteItem($id, $itemId)
    {
        $item = QuotationItem::findOne(['id' => $itemId, 'quotation_id' => $id]);

        if (!$item) {
            return ['success' => false, 'error' => 'Item not found'];
        }

        if ($item->delete()) {
            return [
                'success' => true,
                'message' => 'Item deleted successfully',
            ];
        }

        return [
            'success' => false,
            'error' => 'Failed to delete item',
        ];
    }

    /**
     * Update quotation status
     * POST /api/quotations/{id}/status
     */
    public function actionUpdateStatus($id)
    {
        $model = Quotation::findOne($id);

        if (!$model) {
            return ['success' => false, 'error' => 'Quotation not found'];
        }

        $newStatus = Yii::$app->request->post('status');

        if (!array_key_exists($newStatus, Quotation::getStatusOptions())) {
            return ['success' => false, 'error' => 'Invalid status'];
        }

        $oldStatus = $model->status;
        $model->status = $newStatus;

        // Set approved_by if approving
        if ($newStatus === Quotation::STATUS_APPROVED) {
            // $model->approved_by = Yii::$app->user->id;
        }

        if ($model->save(false, ['status', 'approved_by', 'updated_at'])) {
            return [
                'success' => true,
                'message' => "Status changed from {$oldStatus} to {$newStatus}",
                'data' => $model,
            ];
        }

        return [
            'success' => false,
            'error' => 'Failed to update status',
        ];
    }

    /**
     * Duplicate quotation
     * POST /api/quotations/{id}/duplicate
     */
    public function actionDuplicate($id)
    {
        $original = Quotation::find()->with(['items'])->where(['id' => $id])->one();

        if (!$original) {
            return ['success' => false, 'error' => 'Quotation not found'];
        }

        $transaction = Yii::$app->db->beginTransaction();

        try {
            // Create new quotation
            $newQuotation = new Quotation();
            $newQuotation->attributes = $original->attributes;
            $newQuotation->id = null;
            $newQuotation->quotation_number = null; // Will be auto-generated
            $newQuotation->quotation_date = date('Y-m-d');
            $newQuotation->valid_until = null; // Will be recalculated
            $newQuotation->status = Quotation::STATUS_DRAFT;
            $newQuotation->created_at = null;
            $newQuotation->updated_at = null;

            if (!$newQuotation->save()) {
                throw new \Exception(json_encode($newQuotation->errors));
            }

            // Duplicate items
            foreach ($original->items as $item) {
                $newItem = new QuotationItem();
                $newItem->attributes = $item->attributes;
                $newItem->id = null;
                $newItem->quotation_id = $newQuotation->id;

                if (!$newItem->save()) {
                    throw new \Exception(json_encode($newItem->errors));
                }
            }

            // Recalculate totals
            $newQuotation->calculateTotals();

            $transaction->commit();

            // Reload
            $newQuotation = Quotation::find()->with(['items'])->where(['id' => $newQuotation->id])->one();
            $data = $newQuotation->toArray();
            $data['items'] = $newQuotation->items;

            return [
                'success' => true,
                'message' => 'Quotation duplicated successfully',
                'data' => $data,
            ];

        } catch (\Exception $e) {
            $transaction->rollBack();
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Convert quotation to order
     * POST /api/quotations/{id}/convert-to-order
     */
    public function actionConvertToOrder($id)
    {
        $quotation = Quotation::find()->with(['items', 'customer'])->where(['id' => $id])->one();

        if (!$quotation) {
            return ['success' => false, 'error' => 'Quotation not found'];
        }

        if ($quotation->status === Quotation::STATUS_CONVERTED) {
            return ['success' => false, 'error' => 'Quotation already converted'];
        }

        if ($quotation->status !== Quotation::STATUS_APPROVED) {
            return ['success' => false, 'error' => 'Only approved quotations can be converted'];
        }

        // Here you would create the order
        // For now, just update status
        $quotation->status = Quotation::STATUS_CONVERTED;
        // $quotation->converted_order_id = $order->id;

        if ($quotation->save(false, ['status', 'converted_order_id', 'updated_at'])) {
            return [
                'success' => true,
                'message' => 'Quotation converted to order successfully',
                'data' => $quotation,
                // 'order_id' => $order->id,
            ];
        }

        return [
            'success' => false,
            'error' => 'Failed to convert quotation',
        ];
    }

    /**
     * Get quotation PDF data
     * GET /api/quotations/{id}/pdf
     */
    public function actionPdf($id)
    {
        $quotation = Quotation::find()
            ->with(['items', 'customer', 'createdByUser'])
            ->where(['id' => $id])
            ->one();

        if (!$quotation) {
            return ['success' => false, 'error' => 'Quotation not found'];
        }

        // Return data formatted for PDF generation
        return [
            'success' => true,
            'data' => [
                'quotation' => $quotation,
                'items' => $quotation->items,
                'customer' => $quotation->customer,
                'company' => [
                    'name' => Yii::$app->params['companyName'] ?? 'Your Company Name',
                    'address' => Yii::$app->params['companyAddress'] ?? 'Company Address',
                    'phone' => Yii::$app->params['companyPhone'] ?? '',
                    'email' => Yii::$app->params['companyEmail'] ?? '',
                    'gst' => Yii::$app->params['companyGst'] ?? '',
                ],
                'terms' => $quotation->terms_conditions ?: Yii::$app->params['defaultTerms'] ?? '',
            ],
        ];
    }

    /**
     * Get status options
     * GET /api/quotations/status-options
     */
    public function actionStatusOptions()
    {
        return [
            'success' => true,
            'data' => Quotation::getStatusOptions(),
        ];
    }

    /**
     * Dashboard stats for quotations
     * GET /api/quotations/stats
     */
    public function actionStats()
    {
        $thisMonth = date('Y-m');
        $lastMonth = date('Y-m', strtotime('-1 month'));

        $stats = [
            'total' => Quotation::find()->count(),
            'this_month' => Quotation::find()
                ->where(['like', 'quotation_date', $thisMonth, false])
                ->count(),
            'by_status' => [],
            'total_value' => Quotation::find()->sum('total_amount') ?? 0,
            'this_month_value' => Quotation::find()
                ->where(['like', 'quotation_date', $thisMonth, false])
                ->sum('total_amount') ?? 0,
            'conversion_rate' => 0,
            'recent' => [],
        ];

        // By status
        foreach (Quotation::getStatusOptions() as $status => $label) {
            $count = Quotation::find()->where(['status' => $status])->count();
            $stats['by_status'][$status] = [
                'label' => $label,
                'count' => $count,
            ];
        }

        // Conversion rate
        $approved = $stats['by_status'][Quotation::STATUS_APPROVED]['count'] ?? 0;
        $converted = $stats['by_status'][Quotation::STATUS_CONVERTED]['count'] ?? 0;
        $total = $approved + $converted;
        $stats['conversion_rate'] = $total > 0 ? round(($converted / $total) * 100, 2) : 0;

        // Recent quotations
        $stats['recent'] = Quotation::find()
            ->with(['customer'])
            ->orderBy(['created_at' => SORT_DESC])
            ->limit(5)
            ->all();

        return [
            'success' => true,
            'data' => $stats,
        ];
    }
}