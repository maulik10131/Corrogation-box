<?php

namespace app\models;

use yii\db\ActiveRecord;
use app\components\BoxCalculator;

class BoxOrder extends ActiveRecord
{
    public static function tableName()
    {
        return 'box_orders';
    }

    public function rules()
    {
        return [
            [['customer_id', 'length', 'width', 'height', 'ply_count', 'flute_type', 'quantity'], 'required'],
            [['order_number'], 'unique'],
            [['length', 'width', 'height'], 'number', 'min' => 1],
            [['ply_count'], 'in', 'range' => [3, 5, 7]],
            [['flute_type'], 'in', 'range' => ['A', 'B', 'C', 'E', 'F', 'BC', 'BE']],
            [['quantity'], 'integer', 'min' => 1],
            [['paper_config'], 'safe'],
            [['delivery_date'], 'date', 'format' => 'php:Y-m-d'],
            [['notes', 'box_name'], 'string'],
        ];
    }

    public function beforeSave($insert)
    {
        if (parent::beforeSave($insert)) {
            // Auto-generate order number
            if ($insert && empty($this->order_number)) {
                $this->order_number = 'ORD-' . date('Ymd') . '-' . str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
            }
            
            // Calculate box dimensions
            $this->calculateBoxSpecs();
            
            return true;
        }
        return false;
    }

    protected function calculateBoxSpecs()
    {
        $calc = new BoxCalculator();
        
        $this->deckle_size = $calc->calculateDeckle($this->length, $this->width);
        $this->cutting_size = $calc->calculateCutting($this->length, $this->width, $this->height);
        $this->sheet_area = $calc->calculateSheetArea($this->deckle_size, $this->cutting_size);
    }

    public function getCustomer()
    {
        return $this->hasOne(Customer::class, ['id' => 'customer_id']);
    }

    public function getProductionLogs()
    {
        return $this->hasMany(ProductionLog::class, ['order_id' => 'id']);
    }

    public function fields()
    {
        $fields = parent::fields();
        $fields['customer_name'] = function() {
            return $this->customer ? $this->customer->name : null;
        };
        $fields['paper_config'] = function() {
            return json_decode($this->paper_config, true);
        };
        return $fields;
    }
}