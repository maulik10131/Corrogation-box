<?php

namespace app\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveRecord;
use yii\db\Expression;

class Dispatch extends ActiveRecord
{
    public static function tableName()
    {
        return 'dispatches';
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
            [['customer_id', 'customer_name', 'dispatch_date'], 'required'],
            [['work_order_id', 'customer_id', 'total_quantity', 'delivered_quantity', 'pending_quantity', 'pod_received'], 'integer'],
            [['dispatch_date', 'eway_valid_upto'], 'date', 'format' => 'php:Y-m-d'],
            [['pod_received_at'], 'safe'],
            [['notes'], 'string'],
            [['status'], 'in', 'range' => ['planned', 'in_transit', 'delivered', 'pod_received', 'cancelled']],
            [['dispatch_number', 'challan_number', 'vehicle_no', 'driver_name', 'lr_no', 'eway_bill_no', 'destination'], 'string', 'max' => 255],
            [['dispatch_number', 'challan_number'], 'unique'],
            [['customer_name'], 'string', 'max' => 255],
        ];
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        if ($insert && empty($this->dispatch_number)) {
            $this->dispatch_number = $this->generateNumber('DSP', 'dispatch_number');
        }

        if ($insert && empty($this->challan_number)) {
            $this->challan_number = $this->generateNumber('CHL', 'challan_number');
        }

        if ((int)$this->total_quantity > 0) {
            $this->pending_quantity = max(0, (int)$this->total_quantity - (int)$this->delivered_quantity);
        }

        return true;
    }

    private function generateNumber($prefix, $field)
    {
        $year = date('y');
        $month = date('m');
        $base = $prefix . $year . $month;
        $last = self::find()
            ->where(['like', $field, $base . '%', false])
            ->orderBy(['id' => SORT_DESC])
            ->one();

        $sequence = 1;
        if ($last) {
            $lastValue = (string) $last->{$field};
            $lastSuffix = substr($lastValue, -4);
            $sequence = ((int) $lastSuffix) + 1;
        }

        return sprintf('%s%s%s%04d', $prefix, $year, $month, $sequence);
    }

    public function getItems()
    {
        return $this->hasMany(DispatchItem::class, ['dispatch_id' => 'id']);
    }

    public function getCustomer()
    {
        return $this->hasOne(Customer::class, ['id' => 'customer_id']);
    }

    public function getWorkOrder()
    {
        return $this->hasOne(WorkOrder::class, ['id' => 'work_order_id']);
    }
}
