<?php

namespace app\controllers\api;

use Yii;
use yii\data\ActiveDataProvider;
use yii\rest\Controller;
use yii\web\Response;
use app\models\Invoice;
use app\models\Payment;

class PaymentController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $behaviors;
    }

    public function actionInvoices()
    {
        $query = Invoice::find()->with(['customer', 'payments']);

        $status = Yii::$app->request->get('status');
        $customerId = Yii::$app->request->get('customer_id');
        $outstandingOnly = Yii::$app->request->get('outstanding_only');

        if (!empty($status)) {
            $query->andWhere(['status' => $status]);
        }
        if (!empty($customerId)) {
            $query->andWhere(['customer_id' => $customerId]);
        }
        if (!empty($outstandingOnly)) {
            $query->andWhere(['>', 'outstanding_amount', 0]);
        }

        $provider = new ActiveDataProvider([
            'query' => $query,
            'sort' => ['defaultOrder' => ['invoice_date' => SORT_DESC, 'id' => SORT_DESC]],
            'pagination' => ['pageSize' => Yii::$app->request->get('per_page', 20)],
        ]);

        $rows = [];
        foreach ($provider->getModels() as $model) {
            $data = $model->toArray();
            $data['customer_name'] = $model->customer ? $model->customer->name : null;
            $data['payments'] = $model->payments;
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

    public function actionCreateInvoice()
    {
        $invoice = new Invoice();
        $invoice->load(Yii::$app->request->post(), '');

        if (empty($invoice->invoice_date)) {
            $invoice->invoice_date = date('Y-m-d');
        }

        if ($invoice->save()) {
            return [
                'success' => true,
                'message' => 'Invoice created successfully',
                'data' => $invoice,
            ];
        }

        return [
            'success' => false,
            'errors' => $invoice->errors,
        ];
    }

    public function actionCreatePayment()
    {
        $request = Yii::$app->request;
        $invoiceId = (int)$request->post('invoice_id');
        $amount = (float)$request->post('amount');

        $invoice = Invoice::findOne($invoiceId);
        if (!$invoice) {
            return ['success' => false, 'error' => 'Invoice not found'];
        }

        if ($amount <= 0) {
            return ['success' => false, 'error' => 'Payment amount should be greater than zero'];
        }

        if ($amount > (float)$invoice->outstanding_amount) {
            return ['success' => false, 'error' => 'Payment cannot exceed outstanding amount'];
        }

        $payment = new Payment();
        $payment->invoice_id = $invoice->id;
        $payment->customer_id = $invoice->customer_id;
        $payment->payment_date = $request->post('payment_date', date('Y-m-d'));
        $payment->payment_mode = $request->post('payment_mode', 'neft');
        $payment->reference_no = $request->post('reference_no');
        $payment->amount = $amount;
        $payment->remarks = $request->post('remarks');

        $transaction = Yii::$app->db->beginTransaction();

        try {
            if (!$payment->save()) {
                throw new \RuntimeException(json_encode($payment->errors));
            }

            $invoice->refreshOutstanding();
            $transaction->commit();

            return [
                'success' => true,
                'message' => 'Payment saved successfully',
                'data' => $payment,
                'invoice' => $invoice,
            ];
        } catch (\Throwable $e) {
            $transaction->rollBack();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function actionOutstandingAging()
    {
        $today = date('Y-m-d');
        $invoices = Invoice::find()
            ->with(['customer'])
            ->where(['>', 'outstanding_amount', 0])
            ->andWhere(['!=', 'status', 'cancelled'])
            ->all();

        $bucketTotals = [
            '0_30' => 0,
            '31_60' => 0,
            '61_90' => 0,
            '90_plus' => 0,
        ];

        $rows = [];
        foreach ($invoices as $invoice) {
            $baseDate = $invoice->due_date ?: $invoice->invoice_date;
            $days = max(0, (int)floor((strtotime($today) - strtotime($baseDate)) / 86400));

            $bucket = '0_30';
            if ($days > 90) {
                $bucket = '90_plus';
            } elseif ($days > 60) {
                $bucket = '61_90';
            } elseif ($days > 30) {
                $bucket = '31_60';
            }

            $amount = (float)$invoice->outstanding_amount;
            $bucketTotals[$bucket] += $amount;

            $rows[] = [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'customer_id' => $invoice->customer_id,
                'customer_name' => $invoice->customer ? $invoice->customer->name : null,
                'invoice_date' => $invoice->invoice_date,
                'due_date' => $invoice->due_date,
                'days_overdue' => $days,
                'bucket' => $bucket,
                'outstanding_amount' => round($amount, 2),
            ];
        }

        return [
            'success' => true,
            'data' => [
                'summary' => [
                    'total_outstanding' => round(array_sum($bucketTotals), 2),
                    'bucket_totals' => [
                        '0_30' => round($bucketTotals['0_30'], 2),
                        '31_60' => round($bucketTotals['31_60'], 2),
                        '61_90' => round($bucketTotals['61_90'], 2),
                        '90_plus' => round($bucketTotals['90_plus'], 2),
                    ],
                ],
                'rows' => $rows,
            ],
        ];
    }

    public function actionCustomerLedger($id)
    {
        $invoices = Invoice::find()->where(['customer_id' => $id])->orderBy(['invoice_date' => SORT_ASC, 'id' => SORT_ASC])->all();
        $payments = Payment::find()->where(['customer_id' => $id])->orderBy(['payment_date' => SORT_ASC, 'id' => SORT_ASC])->all();

        $entries = [];
        foreach ($invoices as $invoice) {
            $entries[] = [
                'date' => $invoice->invoice_date,
                'type' => 'invoice',
                'number' => $invoice->invoice_number,
                'debit' => (float)$invoice->total_amount,
                'credit' => 0,
                'reference' => $invoice->notes,
            ];
        }

        foreach ($payments as $payment) {
            $entries[] = [
                'date' => $payment->payment_date,
                'type' => 'payment',
                'number' => $payment->payment_number,
                'debit' => 0,
                'credit' => (float)$payment->amount,
                'reference' => $payment->reference_no,
            ];
        }

        usort($entries, function ($a, $b) {
            $cmp = strcmp($a['date'], $b['date']);
            if ($cmp === 0) {
                return strcmp($a['type'], $b['type']);
            }
            return $cmp;
        });

        $balance = 0;
        foreach ($entries as &$entry) {
            $balance += ($entry['debit'] - $entry['credit']);
            $entry['running_balance'] = round($balance, 2);
        }

        return [
            'success' => true,
            'data' => [
                'customer_id' => (int)$id,
                'entries' => $entries,
                'closing_balance' => round($balance, 2),
            ],
        ];
    }
}
