<?php

namespace app\models;

use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

class InventoryItem extends ActiveRecord
{
    public static function tableName()
    {
        return 'inventory_items';
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
            [['item_code', 'name', 'category', 'unit'], 'required'],
            [['description'], 'string'],
            [['min_stock', 'max_stock', 'reorder_level', 'status'], 'integer'],
            [['gst_percent', 'current_stock', 'avg_price'], 'number'],
            [['item_code'], 'string', 'max' => 50],
            [['name', 'category', 'unit', 'location'], 'string', 'max' => 255],
            [['hsn_code'], 'string', 'max' => 20],
            [['item_code'], 'unique'],
        ];
    }

    public function fields()
    {
        return [
            'id',
            'item_code',
            'name',
            'category',
            'unit',
            'min_stock',
            'max_stock',
            'reorder_level',
            'location',
            'description',
            'hsn_code',
            'gst_percent',
            'status',
            'current_stock',
            'avg_price',
            'created_at',
        ];
    }
}
