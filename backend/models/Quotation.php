<?php

namespace app\models;

use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

class Quotation extends ActiveRecord
{
    const STATUS_DRAFT = 'draft';
    const STATUS_SENT = 'sent';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_EXPIRED = 'expired';
    const STATUS_CONVERTED = 'converted';

    public static function tableName()
    {
        return 'quotations';
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
            [['customer_id', 'quotation_date'], 'required'],
            [['customer_id', 'validity_days', 'created_by', 'approved_by', 'converted_order_id'], 'integer'],
            [['quotation_date', 'valid_until'], 'date', 'format' => 'php:Y-m-d'],
            [['subtotal', 'discount_percent', 'discount_amount', 'taxable_amount'], 'number'],
            [['cgst_percent', 'cgst_amount', 'sgst_percent', 'sgst_amount'], 'number'],
            [['igst_percent', 'igst_amount', 'total_amount'], 'number'],
            [['quotation_number'], 'string', 'max' => 50],
            [['quotation_number'], 'unique'],
            [['customer_name', 'payment_terms'], 'string', 'max' => 255],
            [['customer_address', 'delivery_terms', 'notes', 'terms_conditions'], 'string'],
            [['customer_gst'], 'string', 'max' => 20],
            [['status'], 'in', 'range' => array_keys(self::getStatusOptions())],
        ];
    }

    public function beforeSave($insert)
    {
        if (parent::beforeSave($insert)) {
            // Generate quotation number
            if ($insert && empty($this->quotation_number)) {
                $prefix = 'QT';
                $year = date('y');
                $month = date('m');
                $lastQuotation = self::find()
                    ->where(['like', 'quotation_number', "$prefix$year$month", false])
                    ->orderBy(['id' => SORT_DESC])
                    ->one();
                
                $sequence = 1;
                if ($lastQuotation) {
                    preg_match('/(\d+)$/', $lastQuotation->quotation_number, $matches);
                    $sequence = (int) ($matches[1] ?? 0) + 1;
                }
                $this->quotation_number = sprintf('%s%s%s%04d', $prefix, $year, $month, $sequence);
            }

            // Set valid until
            if (empty($this->valid_until) && $this->quotation_date) {
                $days = $this->validity_days ?? 15;
                $this->valid_until = date('Y-m-d', strtotime($this->quotation_date . " + $days days"));
            }

            // Copy customer info
            if ($this->customer_id && empty($this->customer_name)) {
                $customer = $this->customer;
                if ($customer) {
                    $this->customer_name = $customer->name;
                    $this->customer_address = $customer->billing_address;
                    $this->customer_gst = $customer->gst_number;
                }
            }

            return true;
        }
        return false;
    }

    public static function getStatusOptions()
    {
        return [
            self::STATUS_DRAFT => 'Draft',
            self::STATUS_SENT => 'Sent',
            self::STATUS_APPROVED => 'Approved',
            self::STATUS_REJECTED => 'Rejected',
            self::STATUS_EXPIRED => 'Expired',
            self::STATUS_CONVERTED => 'Converted to Order',
        ];
    }

    public function getCustomer()
    {
        return $this->hasOne(Customer::class, ['id' => 'customer_id']);
    }

    public function getItems()
    {
        return $this->hasMany(QuotationItem::class, ['quotation_id' => 'id'])->orderBy(['sort_order' => SORT_ASC]);
    }

    public function getCreatedByUser()
    {
        return $this->hasOne(User::class, ['id' => 'created_by']);
    }

    /**
     * Calculate totals from items
     */
    public function calculateTotals()
    {
        $subtotal = 0;
        foreach ($this->items as $item) {
            $subtotal += $item->amount;
        }

        $this->subtotal = $subtotal;
        $this->discount_amount = $subtotal * ($this->discount_percent / 100);
        $this->taxable_amount = $subtotal - $this->discount_amount;
        
        // GST calculation
        if ($this->igst_percent > 0) {
            $this->igst_amount = $this->taxable_amount * ($this->igst_percent / 100);
            $this->cgst_amount = 0;
            $this->sgst_amount = 0;
        } else {
            $this->cgst_amount = $this->taxable_amount * ($this->cgst_percent / 100);
            $this->sgst_amount = $this->taxable_amount * ($this->sgst_percent / 100);
            $this->igst_amount = 0;
        }

        $this->total_amount = $this->taxable_amount + $this->cgst_amount + $this->sgst_amount + $this->igst_amount;

        return $this->save(false, [
            'subtotal', 'discount_amount', 'taxable_amount',
            'cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount'
        ]);
    }

    public function fields()
    {
        return [
            'id',
            'quotation_number',
            'quotation_date',
            'valid_until',
            'customer_id',
            'customer_name',
            'customer_address',
            'customer_gst',
            'subtotal',
            'discount_percent',
            'discount_amount',
            'taxable_amount',
            'cgst_percent',
            'cgst_amount',
            'sgst_percent',
            'sgst_amount',
            'igst_percent',
            'igst_amount',
            'total_amount',
            'delivery_terms',
            'payment_terms',
            'validity_days',
            'notes',
            'terms_conditions',
            'status',
            'status_label' => function () {
                return self::getStatusOptions()[$this->status] ?? $this->status;
            },
            'is_expired' => function () {
                return $this->valid_until && strtotime($this->valid_until) < strtotime('today');
            },
            'items_count' => function () {
                return count($this->items);
            },
            'created_by',
            'created_at',
            'updated_at',
        ];
    }

    public function extraFields()
    {
        return ['items', 'customer', 'createdByUser'];
    }
}