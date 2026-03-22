<?php

namespace app\models;

use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

class Supplier extends ActiveRecord
{
    public static function tableName()
    {
        return 'suppliers';
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
            [['name'], 'required'],
            [['name', 'company_name', 'contact_person', 'email', 'city', 'state'], 'string', 'max' => 255],
            [['phone'], 'string', 'max' => 20],
            [['gst_number'], 'string', 'max' => 20],
            [['pincode'], 'string', 'max' => 10],
            [['address'], 'string'],
            [['payment_terms'], 'integer', 'min' => 0],
            [['status'], 'boolean'],
            [['email'], 'email'],
        ];
    }

    public function fields()
    {
        return [
            'id',
            'name',
            'company_name',
            'contact_person',
            'phone',
            'email',
            'gst_number',
            'address',
            'city',
            'state',
            'pincode',
            'payment_terms',
            'status',
            'status_label' => function () {
                return $this->status ? 'Active' : 'Inactive';
            },
            'created_at',
        ];
    }

    public function getTransactions()
    {
        return $this->hasMany(StockTransaction::class, ['supplier_id' => 'id']);
    }

    public function getPurchaseOrders()
    {
        return $this->hasMany(PurchaseOrder::class, ['supplier_id' => 'id']);
    }

    /**
     * Get total purchase amount from this supplier
     */
    public function getTotalPurchase()
    {
        return $this->getTransactions()
            ->where(['transaction_type' => 'purchase'])
            ->sum('total_amount') ?? 0;
    }
}