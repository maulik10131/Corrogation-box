<?php

namespace app\models;

use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

class InventoryCategory extends ActiveRecord
{
    public static function tableName()
    {
        return 'inventory_categories';
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
            [['name', 'code'], 'required'],
            [['description'], 'string'],
            [['parent_id', 'status'], 'integer'],
            [['name', 'code', 'icon'], 'string', 'max' => 255],
            [['color'], 'string', 'max' => 20],
            [['code'], 'unique'],
        ];
    }

    public function fields()
    {
        return [
            'id',
            'name',
            'code',
            'description',
            'parent_id',
            'parent_name' => function () {
                return $this->parent ? $this->parent->name : null;
            },
            'color',
            'icon',
            'items_count' => function () {
                return (int) $this->getItems()->count();
            },
            'status',
            'created_at',
        ];
    }

    public function getParent()
    {
        return $this->hasOne(self::class, ['id' => 'parent_id']);
    }

    public function getItems()
    {
        return $this->hasMany(InventoryItem::class, ['category' => 'name']);
    }
}
