<?php

namespace app\models;

use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

class Customer extends ActiveRecord
{
    public static function tableName()
    {
        return 'customers';
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
            [['name', 'mobile', 'city'], 'required'],
            [['billing_address', 'shipping_address', 'notes'], 'string'],
            [['status', 'credit_days'], 'integer'],
            [['credit_limit', 'opening_balance', 'current_balance'], 'number'],
            [['name', 'company_name', 'contact_person', 'email', 'city', 'state'], 'string', 'max' => 255],
            [['phone', 'mobile'], 'string', 'max' => 20],
            [['gst_number'], 'string', 'max' => 20],
            [['pan_number'], 'string', 'max' => 10],
            [['pincode'], 'string', 'max' => 10],
            [['email'], 'email'],
            [['mobile'], 'match', 'pattern' => '/^[6-9]\d{9}$/'],
            [['gst_number'], 'match', 'pattern' => '/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/', 'skipOnEmpty' => true],
            [['pan_number'], 'match', 'pattern' => '/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/', 'skipOnEmpty' => true],
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
            'mobile',
            'email',
            'gst_number',
            'pan_number',
            'billing_address',
            'shipping_address',
            'city',
            'state',
            'pincode',
            'credit_limit',
            'credit_days',
            'opening_balance',
            'current_balance',
            'status',
            'notes',
            'created_at',
            'updated_at',
        ];
    }

    public function getQuotations()
    {
        return $this->hasMany(Quotation::class, ['customer_id' => 'id']);
    }
}
