<?php

namespace app\models;

use yii\db\ActiveRecord;
use app\components\BoxCalculator;

class QuotationItem extends ActiveRecord
{
    public static function tableName()
    {
        return 'quotation_items';
    }

    public function rules()
    {
        return [
            [['quotation_id', 'length', 'width', 'height', 'quantity'], 'required'],
            [['quotation_id', 'ply_count', 'ups', 'quantity', 'sort_order'], 'integer'],
            [['length', 'width', 'height', 'deckle_size', 'cutting_size', 'sheet_area'], 'number', 'min' => 0],
            [['paper_weight', 'box_weight'], 'number'],
            [['paper_rate', 'paper_cost', 'conversion_cost', 'printing_cost', 'die_cost', 'other_cost'], 'number'],
            [['cost_per_box', 'margin_percent', 'selling_price', 'amount'], 'number'],
            [['box_name'], 'string', 'max' => 255],
            [['box_type'], 'in', 'range' => ['RSC', 'HSC', 'FOL', 'DIE_CUT', 'PARTITION', 'PAD', 'INNER', 'TRAY']],
            [['flute_type'], 'string', 'max' => 10],
            [['paper_config'], 'safe'],
            [['notes'], 'string'],
        ];
    }

    public function getQuotation()
    {
        return $this->hasOne(Quotation::class, ['id' => 'quotation_id']);
    }

    /**
     * Calculate item from box parameters
     */
    public function calculateFromBox()
    {
        $paperConfig = is_string($this->paper_config) ? json_decode($this->paper_config, true) : $this->paper_config;
        
        if (empty($paperConfig)) {
            $paperConfig = BoxCalculator::getDefaultPaperConfig($this->ply_count);
        }

        $result = BoxCalculator::calculate([
            'length' => $this->length,
            'width' => $this->width,
            'height' => $this->height,
            'ply_count' => $this->ply_count,
            'flute_type' => $this->flute_type,
            'box_type' => $this->box_type,
            'paper_config' => $paperConfig,
            'paper_rate' => $this->paper_rate,
            'conversion_cost' => $this->conversion_cost ?: 2.5,
            'printing_cost' => $this->printing_cost,
            'die_cost' => $this->die_cost,
            'other_cost' => $this->other_cost,
            'ups' => $this->ups ?: 1,
            'margin_percent' => $this->margin_percent ?: 15,
            'quantity' => $this->quantity,
        ]);

        if ($result['success']) {
            $this->deckle_size = $result['dimensions']['deckle_size'];
            $this->cutting_size = $result['dimensions']['cutting_size'];
            $this->sheet_area = $result['dimensions']['sheet_area_sqm'];
            $this->paper_weight = $result['weight']['paper_weight_per_sheet'];
            $this->box_weight = $result['weight']['box_weight'];
            $this->paper_cost = $result['cost']['paper_cost'];
            $this->cost_per_box = $result['cost']['cost_per_box'];
            $this->selling_price = $result['pricing']['selling_price'];
            $this->amount = $this->selling_price * $this->quantity;
        }

        return $result;
    }

    public function beforeSave($insert)
    {
        if (parent::beforeSave($insert)) {
            // Store paper_config as JSON
            if (is_array($this->paper_config)) {
                $this->paper_config = json_encode($this->paper_config);
            }
            
            // Calculate amount
            $this->amount = $this->selling_price * $this->quantity;
            
            return true;
        }
        return false;
    }

    public function afterSave($insert, $changedAttributes)
    {
        parent::afterSave($insert, $changedAttributes);
        
        // Update quotation totals
        if ($this->quotation) {
            $this->quotation->calculateTotals();
        }
    }

    public function afterDelete()
    {
        parent::afterDelete();
        
        // Update quotation totals
        if ($this->quotation) {
            $this->quotation->calculateTotals();
        }
    }

    public function fields()
    {
        return [
            'id',
            'quotation_id',
            'box_name',
            'box_type',
            'length',
            'width',
            'height',
            'dimensions_display' => function () {
                return "{$this->length} x {$this->width} x {$this->height} mm";
            },
            'ply_count',
            'flute_type',
            'paper_config' => function () {
                return is_string($this->paper_config) ? json_decode($this->paper_config, true) : $this->paper_config;
            },
            'deckle_size',
            'cutting_size',
            'sheet_area',
            'ups',
            'paper_weight',
            'box_weight',
            'paper_rate',
            'paper_cost',
            'conversion_cost',
            'printing_cost',
            'die_cost',
            'other_cost',
            'cost_per_box',
            'margin_percent',
            'selling_price',
            'quantity',
            'amount',
            'notes',
            'sort_order',
        ];
    }
}