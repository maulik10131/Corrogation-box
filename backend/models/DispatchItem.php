<?php

namespace app\models;

use yii\behaviors\TimestampBehavior;
use yii\db\ActiveRecord;
use yii\db\Expression;

class DispatchItem extends ActiveRecord
{
    public static function tableName()
    {
        return 'dispatch_items';
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
            [['dispatch_id', 'item_name', 'quantity'], 'required'],
            [['dispatch_id', 'work_order_item_id', 'quantity', 'delivered_quantity', 'pending_quantity'], 'integer'],
            [['notes'], 'string'],
            [['item_name'], 'string', 'max' => 255],
            [['unit'], 'string', 'max' => 20],
        ];
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        if ((int)$this->pending_quantity === 0 && (int)$this->quantity > 0) {
            $this->pending_quantity = max(0, (int)$this->quantity - (int)$this->delivered_quantity);
        }

        return true;
    }

    public function getDispatch()
    {
        return $this->hasOne(Dispatch::class, ['id' => 'dispatch_id']);
    }
}
