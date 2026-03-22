<?php

namespace app\models;

use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

class RawMaterial extends ActiveRecord
{
    const CATEGORY_KRAFT_PAPER = 'kraft_paper';
    const CATEGORY_DUPLEX_PAPER = 'duplex_paper';
    const CATEGORY_FLUTING_PAPER = 'fluting_paper';
    const CATEGORY_SEMI_KRAFT = 'semi_kraft';
    const CATEGORY_GUM = 'gum';
    const CATEGORY_INK = 'ink';
    const CATEGORY_STRAPPING = 'strapping';
    const CATEGORY_PINS = 'pins';
    const CATEGORY_THREAD = 'thread';
    const CATEGORY_OTHER = 'other';

    public static function tableName()
    {
        return 'raw_materials';
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
            [['name', 'category', 'unit'], 'required'],
            [['name', 'sub_category', 'warehouse_location'], 'string', 'max' => 255],
            [['code', 'rack_number'], 'string', 'max' => 50],
            [['code'], 'unique'],
            [['category'], 'in', 'range' => array_keys(self::getCategoryOptions())],
            [['unit'], 'in', 'range' => ['kg', 'ltr', 'pcs', 'roll', 'bundle', 'box', 'meter']],
            [['gsm', 'bf'], 'integer', 'min' => 0],
            [['width', 'current_stock', 'min_stock_level', 'max_stock_level', 'last_purchase_rate', 'avg_rate'], 'number', 'min' => 0],
            [['description'], 'string'],
            [['status'], 'boolean'],
        ];
    }

    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'name' => 'Material Name',
            'code' => 'Material Code',
            'category' => 'Category',
            'gsm' => 'GSM',
            'bf' => 'Bursting Factor',
            'unit' => 'Unit',
            'current_stock' => 'Current Stock',
            'min_stock_level' => 'Minimum Stock Level',
            'last_purchase_rate' => 'Last Purchase Rate',
            'avg_rate' => 'Average Rate',
        ];
    }

    public function fields()
    {
        return [
            'id',
            'name',
            'code',
            'category',
            'category_label' => function () {
                return self::getCategoryOptions()[$this->category] ?? $this->category;
            },
            'sub_category',
            'gsm',
            'bf',
            'width',
            'unit',
            'current_stock',
            'min_stock_level',
            'max_stock_level',
            'last_purchase_rate',
            'avg_rate',
            'stock_value' => function () {
                return round($this->current_stock * $this->avg_rate, 2);
            },
            'is_low_stock' => function () {
                return $this->current_stock <= $this->min_stock_level;
            },
            'is_paper' => function () {
                return in_array($this->category, [
                    self::CATEGORY_KRAFT_PAPER,
                    self::CATEGORY_DUPLEX_PAPER,
                    self::CATEGORY_FLUTING_PAPER,
                    self::CATEGORY_SEMI_KRAFT,
                ]);
            },
            'warehouse_location',
            'rack_number',
            'description',
            'status',
            'created_at',
            'updated_at',
        ];
    }

    public static function getCategoryOptions()
    {
        return [
            self::CATEGORY_KRAFT_PAPER => 'Kraft Paper',
            self::CATEGORY_DUPLEX_PAPER => 'Duplex Paper',
            self::CATEGORY_FLUTING_PAPER => 'Fluting Paper',
            self::CATEGORY_SEMI_KRAFT => 'Semi Kraft',
            self::CATEGORY_GUM => 'Gum/Adhesive',
            self::CATEGORY_INK => 'Ink',
            self::CATEGORY_STRAPPING => 'Strapping',
            self::CATEGORY_PINS => 'Pins',
            self::CATEGORY_THREAD => 'Thread',
            self::CATEGORY_OTHER => 'Other',
        ];
    }

    public static function getUnitOptions()
    {
        return [
            'kg' => 'Kilogram (kg)',
            'ltr' => 'Liter (ltr)',
            'pcs' => 'Pieces (pcs)',
            'roll' => 'Roll',
            'bundle' => 'Bundle',
            'box' => 'Box',
            'meter' => 'Meter (m)',
        ];
    }

    public function getTransactions()
    {
        return $this->hasMany(StockTransaction::class, ['material_id' => 'id']);
    }

    /**
     * Update stock after transaction
     */
    public function updateStock($quantity, $type = 'in', $rate = null)
    {
        if ($type === 'in') {
            $this->current_stock += $quantity;
            
            // Update average rate
            if ($rate && $rate > 0) {
                $this->last_purchase_rate = $rate;
                // Weighted average calculation
                $totalValue = ($this->current_stock - $quantity) * $this->avg_rate + $quantity * $rate;
                $this->avg_rate = $this->current_stock > 0 ? round($totalValue / $this->current_stock, 2) : $rate;
            }
        } else {
            $this->current_stock -= $quantity;
            if ($this->current_stock < 0) {
                $this->current_stock = 0;
            }
        }
        
        return $this->save(false, ['current_stock', 'last_purchase_rate', 'avg_rate', 'updated_at']);
    }
}