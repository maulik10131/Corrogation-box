<?php

namespace app\models;

use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

class InventoryMovement extends ActiveRecord
{
    const TYPE_IN = 'in';
    const TYPE_OUT = 'out';

    public static function tableName()
    {
        return 'inventory_movements';
    }

    public function behaviors()
    {
        return [
            [
                'class' => TimestampBehavior::class,
                'createdAtAttribute' => 'created_at',
                'updatedAtAttribute' => false,
                'value' => new Expression('NOW()'),
            ],
        ];
    }

    public function rules()
    {
        return [
            [['item_id', 'movement_type', 'movement_date', 'quantity'], 'required'],
            [['item_id'], 'integer'],
            [['quantity', 'rate', 'amount'], 'number'],
            [['movement_type'], 'in', 'range' => [self::TYPE_IN, self::TYPE_OUT]],
            [['movement_date'], 'date', 'format' => 'php:Y-m-d'],
            [['reference_no', 'reference_type'], 'string', 'max' => 100],
            [['remarks'], 'string'],
        ];
    }

    public function getItem()
    {
        return $this->hasOne(InventoryItem::class, ['id' => 'item_id']);
    }

    public function fields()
    {
        return [
            'id',
            'item_id',
            'item_code' => function () {
                return $this->item ? $this->item->item_code : null;
            },
            'item_name' => function () {
                return $this->item ? $this->item->name : null;
            },
            'category' => function () {
                return $this->item ? $this->item->category : null;
            },
            'unit' => function () {
                return $this->item ? $this->item->unit : null;
            },
            'movement_type',
            'movement_date',
            'quantity',
            'rate',
            'amount',
            'reference_no',
            'reference_type',
            'remarks',
            'created_at',
        ];
    }
}
