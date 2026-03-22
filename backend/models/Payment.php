<?php

namespace app\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveRecord;
use yii\db\Expression;

class Payment extends ActiveRecord
{
    public static function tableName()
    {
        return 'payments';
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
            [['invoice_id', 'customer_id', 'payment_date', 'amount'], 'required'],
            [['invoice_id', 'customer_id'], 'integer'],
            [['payment_date'], 'date', 'format' => 'php:Y-m-d'],
            [['amount'], 'number', 'min' => 0.01],
            [['remarks'], 'string'],
            [['payment_mode'], 'in', 'range' => ['cash', 'cheque', 'neft', 'rtgs', 'upi']],
            [['payment_number'], 'string', 'max' => 50],
            [['payment_number'], 'unique'],
            [['reference_no'], 'string', 'max' => 100],
        ];
    }

    public function beforeValidate()
    {
        if (!parent::beforeValidate()) {
            return false;
        }

        if ($this->isNewRecord && empty($this->payment_number)) {
            $this->payment_number = $this->generatePaymentNumber();
        }

        return true;
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        return true;
    }

    private function generatePaymentNumber()
    {
        $prefix = 'PAY';
        $year = date('y');
        $month = date('m');
        $base = $prefix . $year . $month;

        $last = self::find()
            ->where(['like', 'payment_number', $base . '%', false])
            ->orderBy(['id' => SORT_DESC])
            ->one();

        $sequence = 1;
        if ($last) {
            $lastValue = (string) $last->payment_number;
            $lastSuffix = substr($lastValue, -4);
            $sequence = ((int) $lastSuffix) + 1;
        }

        $candidate = sprintf('%s%04d', $base, $sequence);
        while (self::find()->where(['payment_number' => $candidate])->exists()) {
            $sequence++;
            $candidate = sprintf('%s%04d', $base, $sequence);
        }

        return $candidate;
    }

    public function getInvoice()
    {
        return $this->hasOne(Invoice::class, ['id' => 'invoice_id']);
    }

    public function getCustomer()
    {
        return $this->hasOne(Customer::class, ['id' => 'customer_id']);
    }
}
