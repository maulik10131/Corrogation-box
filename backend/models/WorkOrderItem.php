<?php

namespace app\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveRecord;
use yii\db\Expression;

class WorkOrderItem extends ActiveRecord
{
    public static function tableName()
    {
        return 'work_order_items';
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
            [['work_order_id', 'length', 'width', 'height', 'quantity'], 'required'],
            [['work_order_id', 'quotation_item_id', 'ply_count', 'quantity', 'produced_quantity', 'pending_quantity'], 'integer'],
            [['length', 'width', 'height', 'unit_rate', 'amount'], 'number'],
            [['notes'], 'string'],
            [['box_name', 'box_type', 'flute_type', 'gsm', 'print_type'], 'string', 'max' => 255],
        ];
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        if ((int)$this->pending_quantity === 0 && (int)$this->quantity > 0) {
            $this->pending_quantity = (int)$this->quantity - (int)$this->produced_quantity;
        }

        if ((float)$this->amount <= 0 && (float)$this->unit_rate > 0) {
            $this->amount = (float)$this->unit_rate * (int)$this->quantity;
        }

        return true;
    }

    public function getWorkOrder()
    {
        return $this->hasOne(WorkOrder::class, ['id' => 'work_order_id']);
    }
}
