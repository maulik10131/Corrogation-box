<?php

namespace app\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveRecord;
use yii\db\Expression;

class WorkOrder extends ActiveRecord
{
    const STATUS_PLANNED = 'planned';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_COMPLETED = 'completed';
    const STATUS_HOLD = 'hold';
    const STATUS_CANCELLED = 'cancelled';

    public static function tableName()
    {
        return 'work_orders';
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
            [['customer_id', 'customer_name', 'order_date'], 'required'],
            [['quotation_id', 'customer_id', 'total_quantity', 'produced_quantity', 'pending_quantity', 'wastage_quantity'], 'integer'],
            [['order_date', 'target_date'], 'date', 'format' => 'php:Y-m-d'],
            [['notes'], 'string'],
            [['priority'], 'in', 'range' => ['low', 'normal', 'high', 'urgent']],
            [['status'], 'in', 'range' => array_keys(self::getStatusOptions())],
            [['work_order_number'], 'string', 'max' => 50],
            [['work_order_number'], 'unique'],
            [['customer_name'], 'string', 'max' => 255],
        ];
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        if ($insert && empty($this->work_order_number)) {
            $prefix = 'WO';
            $year = date('y');
            $month = date('m');
            $last = self::find()
                ->where(['like', 'work_order_number', "$prefix$year$month%", false])
                ->orderBy(['id' => SORT_DESC])
                ->one();

            $sequence = 1;
            if ($last) {
                preg_match('/(\d+)$/', $last->work_order_number, $matches);
                $sequence = (int)($matches[1] ?? 0) + 1;
            }

            $this->work_order_number = sprintf('%s%s%s%04d', $prefix, $year, $month, $sequence);
        }

        if ($this->total_quantity > 0) {
            $this->pending_quantity = max(0, (int)$this->total_quantity - (int)$this->produced_quantity);
        }

        return true;
    }

    public static function getStatusOptions()
    {
        return [
            self::STATUS_PLANNED => 'Planned',
            self::STATUS_IN_PROGRESS => 'In Progress',
            self::STATUS_COMPLETED => 'Completed',
            self::STATUS_HOLD => 'Hold',
            self::STATUS_CANCELLED => 'Cancelled',
        ];
    }

    public function getQuotation()
    {
        return $this->hasOne(Quotation::class, ['id' => 'quotation_id']);
    }

    public function getCustomer()
    {
        return $this->hasOne(Customer::class, ['id' => 'customer_id']);
    }

    public function getItems()
    {
        return $this->hasMany(WorkOrderItem::class, ['work_order_id' => 'id']);
    }

    public function getStatusLogs()
    {
        return $this->hasMany(WorkOrderStatusLog::class, ['work_order_id' => 'id'])->orderBy(['id' => SORT_DESC]);
    }

    public function fields()
    {
        return [
            'id',
            'work_order_number',
            'quotation_id',
            'customer_id',
            'customer_name',
            'order_date',
            'target_date',
            'priority',
            'status',
            'status_label' => function () {
                return self::getStatusOptions()[$this->status] ?? $this->status;
            },
            'notes',
            'total_quantity',
            'produced_quantity',
            'pending_quantity',
            'wastage_quantity',
            'items_count' => function () {
                return count($this->items);
            },
            'created_at',
            'updated_at',
        ];
    }
}
