<?php

namespace app\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveRecord;
use yii\db\Expression;

class Invoice extends ActiveRecord
{
    public static function tableName()
    {
        return 'invoices';
    }

    public function behaviors()
    {
        return [
            [
                'class' => TimestampBehavior::class,
                'createdAtAttribute' => 'created_at',
                'updatedAtAttribute' => 'updated_at',
                'value' => new Expression('NOW()'),
            ],
        ];
    }

    public function rules()
    {
        return [
            [['customer_id', 'invoice_date', 'total_amount'], 'required'],
            [['customer_id', 'work_order_id', 'dispatch_id'], 'integer'],
            [['invoice_date', 'due_date'], 'date', 'format' => 'php:Y-m-d'],
            [['taxable_amount', 'gst_amount', 'total_amount', 'paid_amount', 'outstanding_amount'], 'number'],
            [['notes'], 'string'],
            [['status'], 'in', 'range' => ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled']],
            [['invoice_number'], 'string', 'max' => 50],
            [['invoice_number'], 'unique'],
        ];
    }

    public function beforeValidate()
    {
        if (!parent::beforeValidate()) {
            return false;
        }

        if ($this->isNewRecord && empty($this->invoice_number)) {
            $this->invoice_number = $this->generateInvoiceNumber();
        }

        return true;
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        if ((float)$this->outstanding_amount <= 0) {
            $this->outstanding_amount = max(0, (float)$this->total_amount - (float)$this->paid_amount);
        }

        return true;
    }

    private function generateInvoiceNumber()
    {
        $prefix = 'INV';
        $year = date('y');
        $month = date('m');
        $base = $prefix . $year . $month;

        $last = self::find()
            ->where(['like', 'invoice_number', $base . '%', false])
            ->orderBy(['id' => SORT_DESC])
            ->one();

        $sequence = 1;
        if ($last) {
            $lastValue = (string) $last->invoice_number;
            $lastSuffix = substr($lastValue, -4);
            $sequence = ((int) $lastSuffix) + 1;
        }

        $candidate = sprintf('%s%04d', $base, $sequence);
        while (self::find()->where(['invoice_number' => $candidate])->exists()) {
            $sequence++;
            $candidate = sprintf('%s%04d', $base, $sequence);
        }

        return $candidate;
    }

    public function refreshOutstanding()
    {
        $paid = (float) Payment::find()->where(['invoice_id' => $this->id])->sum('amount');
        $this->paid_amount = round($paid, 2);
        $this->outstanding_amount = round(max(0, (float)$this->total_amount - $this->paid_amount), 2);

        if ($this->outstanding_amount <= 0) {
            $this->status = 'paid';
        } elseif ($this->paid_amount > 0) {
            $this->status = 'partially_paid';
        } elseif ($this->due_date && strtotime($this->due_date) < strtotime(date('Y-m-d'))) {
            $this->status = 'overdue';
        } else {
            $this->status = 'issued';
        }

        return $this->save(false, ['paid_amount', 'outstanding_amount', 'status']);
    }

    public function getCustomer()
    {
        return $this->hasOne(Customer::class, ['id' => 'customer_id']);
    }

    public function getPayments()
    {
        return $this->hasMany(Payment::class, ['invoice_id' => 'id'])->orderBy(['payment_date' => SORT_DESC, 'id' => SORT_DESC]);
    }
}
