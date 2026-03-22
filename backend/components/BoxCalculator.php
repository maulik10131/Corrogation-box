<?php

namespace app\components;

/**
 * Advanced Corrugation Box Calculator
 * All formulas for box costing and specifications
 */
class BoxCalculator
{
    // Flute specifications
    const FLUTE_SPECS = [
        'A' => ['height' => 4.8, 'take_up' => 1.56, 'pitch' => 8.5],
        'B' => ['height' => 2.5, 'take_up' => 1.42, 'pitch' => 6.5],
        'C' => ['height' => 3.6, 'take_up' => 1.48, 'pitch' => 7.5],
        'E' => ['height' => 1.5, 'take_up' => 1.27, 'pitch' => 3.2],
        'F' => ['height' => 0.8, 'take_up' => 1.25, 'pitch' => 2.4],
        'N' => ['height' => 0.5, 'take_up' => 1.20, 'pitch' => 1.8],
    ];

    // Combined flute configurations
    const COMBINED_FLUTES = [
        'BC' => ['flutes' => ['B', 'C'], 'height' => 6.1],
        'BE' => ['flutes' => ['B', 'E'], 'height' => 4.0],
        'AB' => ['flutes' => ['A', 'B'], 'height' => 7.3],
        'AC' => ['flutes' => ['A', 'C'], 'height' => 8.4],
        'EB' => ['flutes' => ['E', 'B'], 'height' => 4.0],
        'EE' => ['flutes' => ['E', 'E'], 'height' => 3.0],
    ];

    // Box type formulas
    const BOX_TYPES = [
        'RSC' => 'Regular Slotted Container',
        'HSC' => 'Half Slotted Container',
        'FOL' => 'Full Overlap',
        'DIE_CUT' => 'Die Cut Box',
        'PARTITION' => 'Partition',
        'PAD' => 'Pad/Sheet',
        'INNER' => 'Inner Box',
        'TRAY' => 'Tray',
    ];

    // Joint/Flap allowances in mm
    const ALLOWANCES = [
        'joint' => 35,           // Manufacturer's joint
        'flap_gap' => 3,         // Gap between flaps
        'score_allowance' => 2,  // Score line allowance
        'trim' => 10,            // Trim allowance
    ];

    /**
     * Get flute specifications
     */
    public static function getFluteSpec($fluteType)
    {
        // Single flute
        if (isset(self::FLUTE_SPECS[$fluteType])) {
            return self::FLUTE_SPECS[$fluteType];
        }

        // Combined flute
        if (isset(self::COMBINED_FLUTES[$fluteType])) {
            $combined = self::COMBINED_FLUTES[$fluteType];
            $totalTakeUp = 0;
            foreach ($combined['flutes'] as $flute) {
                $totalTakeUp += self::FLUTE_SPECS[$flute]['take_up'] ?? 1.4;
            }
            return [
                'height' => $combined['height'],
                'take_up' => $totalTakeUp / count($combined['flutes']),
            ];
        }

        // Default
        return ['height' => 2.5, 'take_up' => 1.42];
    }

    /**
     * Calculate Deckle Size (Sheet Width) for RSC box
     * Formula: L + W + Joint Allowance
     */
    public static function calculateDeckle($length, $width, $boxType = 'RSC')
    {
        $joint = self::ALLOWANCES['joint'];
        
        switch ($boxType) {
            case 'RSC':
            case 'HSC':
                return $length + $width + $joint;
            case 'FOL':
                return $length + $width + $joint + 20; // Extra overlap
            case 'DIE_CUT':
                return $length + $width + 50; // Die cut allowance
            case 'PARTITION':
            case 'PAD':
                return $length + 20; // Just trim
            default:
                return $length + $width + $joint;
        }
    }

    /**
     * Calculate Cutting Size (Sheet Length) for RSC box
     * Formula: (L × 2) + (W × 2) + Flap allowance
     */
    public static function calculateCutting($length, $width, $height, $boxType = 'RSC')
    {
        switch ($boxType) {
            case 'RSC':
                // 2L + 2W + gaps
                return (2 * $length) + (2 * $width) + (4 * self::ALLOWANCES['flap_gap']);
            case 'HSC':
                // Only bottom flaps
                return (2 * $length) + (2 * $width) + $height;
            case 'FOL':
                // Full overlap flaps
                return (2 * $length) + (2 * $width) + (2 * $width);
            case 'DIE_CUT':
            case 'TRAY':
                return (2 * $length) + (2 * $height) + 40;
            case 'PARTITION':
                return $width + 10;
            case 'PAD':
                return $width + 20;
            default:
                return (2 * $length) + (2 * $width);
        }
    }

    /**
     * Calculate Sheet Area in square meters
     */
    public static function calculateSheetArea($deckle, $cutting)
    {
        return ($deckle * $cutting) / 1000000; // mm² to m²
    }

    /**
     * Calculate Board Thickness based on ply and flute
     */
    public static function calculateBoardThickness($plyCount, $fluteType)
    {
        $spec = self::getFluteSpec($fluteType);
        $fluteHeight = $spec['height'];
        
        // Liner thickness approximately 0.3mm per layer
        $linerThickness = 0.3;
        
        switch ($plyCount) {
            case 3:
                return $fluteHeight + (2 * $linerThickness);
            case 5:
                if (isset(self::COMBINED_FLUTES[$fluteType])) {
                    return self::COMBINED_FLUTES[$fluteType]['height'] + (3 * $linerThickness);
                }
                return (2 * $fluteHeight) + (3 * $linerThickness);
            case 7:
                return (3 * $fluteHeight) + (4 * $linerThickness);
            default:
                return $fluteHeight + (2 * $linerThickness);
        }
    }

    /**
     * Calculate paper weight for corrugated board
     * 
     * @param int $plyCount - 3, 5, or 7 ply
     * @param string $fluteType - Flute type
     * @param float $sheetArea - Sheet area in sq meters
     * @param array $paperConfig - GSM values for each layer
     * @return array - Weight breakdown
     */
    public static function calculatePaperWeight($plyCount, $fluteType, $sheetArea, $paperConfig)
    {
        $weights = [
            'liner_weight' => 0,
            'fluting_weight' => 0,
            'total_weight' => 0,
            'breakdown' => [],
        ];

        // Get flute take-up factor
        $spec = self::getFluteSpec($fluteType);
        $takeUp = $spec['take_up'];

        if ($plyCount == 3) {
            // 3 Ply: Top Liner + Fluting + Bottom Liner
            $topLiner = ($paperConfig['top_liner'] ?? 150) * $sheetArea / 1000;
            $fluting = ($paperConfig['fluting'] ?? 120) * $sheetArea * $takeUp / 1000;
            $bottomLiner = ($paperConfig['bottom_liner'] ?? 150) * $sheetArea / 1000;

            $weights['breakdown'] = [
                ['layer' => 'Top Liner', 'gsm' => $paperConfig['top_liner'] ?? 150, 'weight' => round($topLiner, 4)],
                ['layer' => 'Fluting', 'gsm' => $paperConfig['fluting'] ?? 120, 'weight' => round($fluting, 4), 'take_up' => $takeUp],
                ['layer' => 'Bottom Liner', 'gsm' => $paperConfig['bottom_liner'] ?? 150, 'weight' => round($bottomLiner, 4)],
            ];
            $weights['liner_weight'] = $topLiner + $bottomLiner;
            $weights['fluting_weight'] = $fluting;

        } elseif ($plyCount == 5) {
            // 5 Ply: Top + Fluting1 + Middle + Fluting2 + Bottom
            $flutes = isset(self::COMBINED_FLUTES[$fluteType]) ? self::COMBINED_FLUTES[$fluteType]['flutes'] : [$fluteType, $fluteType];
            $takeUp1 = self::FLUTE_SPECS[$flutes[0]]['take_up'] ?? 1.42;
            $takeUp2 = self::FLUTE_SPECS[$flutes[1]]['take_up'] ?? 1.42;

            $topLiner = ($paperConfig['top_liner'] ?? 180) * $sheetArea / 1000;
            $fluting1 = ($paperConfig['fluting1'] ?? 120) * $sheetArea * $takeUp1 / 1000;
            $middleLiner = ($paperConfig['middle_liner'] ?? 150) * $sheetArea / 1000;
            $fluting2 = ($paperConfig['fluting2'] ?? 120) * $sheetArea * $takeUp2 / 1000;
            $bottomLiner = ($paperConfig['bottom_liner'] ?? 180) * $sheetArea / 1000;

            $weights['breakdown'] = [
                ['layer' => 'Top Liner', 'gsm' => $paperConfig['top_liner'] ?? 180, 'weight' => round($topLiner, 4)],
                ['layer' => 'Fluting 1 (' . $flutes[0] . ')', 'gsm' => $paperConfig['fluting1'] ?? 120, 'weight' => round($fluting1, 4), 'take_up' => $takeUp1],
                ['layer' => 'Middle Liner', 'gsm' => $paperConfig['middle_liner'] ?? 150, 'weight' => round($middleLiner, 4)],
                ['layer' => 'Fluting 2 (' . $flutes[1] . ')', 'gsm' => $paperConfig['fluting2'] ?? 120, 'weight' => round($fluting2, 4), 'take_up' => $takeUp2],
                ['layer' => 'Bottom Liner', 'gsm' => $paperConfig['bottom_liner'] ?? 180, 'weight' => round($bottomLiner, 4)],
            ];
            $weights['liner_weight'] = $topLiner + $middleLiner + $bottomLiner;
            $weights['fluting_weight'] = $fluting1 + $fluting2;

        } elseif ($plyCount == 7) {
            // 7 Ply: Top + F1 + L2 + F2 + L3 + F3 + Bottom
            $topLiner = ($paperConfig['top_liner'] ?? 200) * $sheetArea / 1000;
            $fluting1 = ($paperConfig['fluting1'] ?? 150) * $sheetArea * $takeUp / 1000;
            $liner2 = ($paperConfig['liner2'] ?? 150) * $sheetArea / 1000;
            $fluting2 = ($paperConfig['fluting2'] ?? 120) * $sheetArea * $takeUp / 1000;
            $liner3 = ($paperConfig['liner3'] ?? 150) * $sheetArea / 1000;
            $fluting3 = ($paperConfig['fluting3'] ?? 120) * $sheetArea * $takeUp / 1000;
            $bottomLiner = ($paperConfig['bottom_liner'] ?? 200) * $sheetArea / 1000;

            $weights['breakdown'] = [
                ['layer' => 'Top Liner', 'gsm' => $paperConfig['top_liner'] ?? 200, 'weight' => round($topLiner, 4)],
                ['layer' => 'Fluting 1', 'gsm' => $paperConfig['fluting1'] ?? 150, 'weight' => round($fluting1, 4)],
                ['layer' => 'Liner 2', 'gsm' => $paperConfig['liner2'] ?? 150, 'weight' => round($liner2, 4)],
                ['layer' => 'Fluting 2', 'gsm' => $paperConfig['fluting2'] ?? 120, 'weight' => round($fluting2, 4)],
                ['layer' => 'Liner 3', 'gsm' => $paperConfig['liner3'] ?? 150, 'weight' => round($liner3, 4)],
                ['layer' => 'Fluting 3', 'gsm' => $paperConfig['fluting3'] ?? 120, 'weight' => round($fluting3, 4)],
                ['layer' => 'Bottom Liner', 'gsm' => $paperConfig['bottom_liner'] ?? 200, 'weight' => round($bottomLiner, 4)],
            ];
            $weights['liner_weight'] = $topLiner + $liner2 + $liner3 + $bottomLiner;
            $weights['fluting_weight'] = $fluting1 + $fluting2 + $fluting3;
        }

        $weights['total_weight'] = $weights['liner_weight'] + $weights['fluting_weight'];

        return $weights;
    }

    /**
     * Calculate Bursting Strength
     * BS = Sum of (GSM × BF) for all liners
     */
    public static function calculateBurstingStrength($paperConfig)
    {
        $bs = 0;
        
        // Only liners contribute to BS
        $liners = ['top_liner', 'middle_liner', 'bottom_liner', 'liner2', 'liner3'];
        
        foreach ($liners as $liner) {
            if (isset($paperConfig[$liner]) && isset($paperConfig[$liner . '_bf'])) {
                $bs += ($paperConfig[$liner] * $paperConfig[$liner . '_bf']) / 100;
            }
        }
        
        return round($bs, 2);
    }

    /**
     * Calculate ECT (Edge Crush Test) approximate value
     */
    public static function calculateECT($plyCount, $fluteType, $paperConfig)
    {
        $spec = self::getFluteSpec($fluteType);
        
        // Simplified ECT calculation
        $linerStrength = (($paperConfig['top_liner'] ?? 150) + ($paperConfig['bottom_liner'] ?? 150)) * 0.008;
        $fluteStrength = ($paperConfig['fluting'] ?? 120) * $spec['take_up'] * 0.006;
        
        $ect = $linerStrength + $fluteStrength;
        
        if ($plyCount >= 5) {
            $ect *= 1.6;
        }
        if ($plyCount >= 7) {
            $ect *= 1.4;
        }
        
        return round($ect, 2);
    }

    /**
     * Calculate Box Compression Strength (BCT) using McKee formula
     * BCT = K × ECT × √(Z × H)
     * K = constant (5.87 for RSC)
     * Z = box perimeter
     * H = board thickness
     */
    public static function calculateBCT($length, $width, $height, $plyCount, $fluteType, $paperConfig)
    {
        $ect = self::calculateECT($plyCount, $fluteType, $paperConfig);
        $boardThickness = self::calculateBoardThickness($plyCount, $fluteType);
        $perimeter = 2 * ($length + $width);
        
        $k = 5.87; // McKee constant for RSC
        $bct = $k * $ect * sqrt($perimeter * $boardThickness);
        
        return round($bct, 2);
    }

    /**
     * Calculate costing
     */
    public static function calculateCost($params)
    {
        $paperWeight = $params['paper_weight'] ?? 0;
        $paperRate = $params['paper_rate'] ?? 45;
        $conversionCostPerSqm = $params['conversion_cost_per_sqm'] ?? 2.5;
        $sheetArea = $params['sheet_area'] ?? 0;
        $printingCost = $params['printing_cost'] ?? 0;
        $dieCost = $params['die_cost'] ?? 0;
        $otherCost = $params['other_cost'] ?? 0;
        $ups = $params['ups'] ?? 1; // Number of boxes per sheet
        $wastagePercent = $params['wastage_percent'] ?? 3;

        // Paper cost
        $paperCost = $paperWeight * $paperRate;
        
        // Add wastage
        $paperCost *= (1 + $wastagePercent / 100);

        // Conversion cost
        $conversionCost = $sheetArea * $conversionCostPerSqm;

        // Total cost per sheet
        $sheetCost = $paperCost + $conversionCost + $printingCost + $dieCost + $otherCost;

        // Cost per box
        $costPerBox = $ups > 0 ? $sheetCost / $ups : $sheetCost;

        return [
            'paper_cost' => round($paperCost, 2),
            'conversion_cost' => round($conversionCost, 2),
            'printing_cost' => round($printingCost, 2),
            'die_cost' => round($dieCost, 2),
            'other_cost' => round($otherCost, 2),
            'sheet_cost' => round($sheetCost, 2),
            'cost_per_box' => round($costPerBox, 2),
            'wastage_amount' => round($paperWeight * $paperRate * $wastagePercent / 100, 2),
        ];
    }

    /**
     * Calculate selling price with margin
     */
    public static function calculateSellingPrice($costPerBox, $marginPercent = 15, $roundTo = 0.5)
    {
        $margin = $costPerBox * $marginPercent / 100;
        $sellingPrice = $costPerBox + $margin;
        
        // Round to nearest value
        if ($roundTo > 0) {
            $sellingPrice = ceil($sellingPrice / $roundTo) * $roundTo;
        }

        return [
            'cost' => round($costPerBox, 2),
            'margin_percent' => $marginPercent,
            'margin_amount' => round($margin, 2),
            'selling_price' => round($sellingPrice, 2),
            'profit_per_box' => round($sellingPrice - $costPerBox, 2),
        ];
    }

    /**
     * Full box calculation
     */
    public static function calculate($params)
    {
        // Required params
        $length = (float) ($params['length'] ?? 0);
        $width = (float) ($params['width'] ?? 0);
        $height = (float) ($params['height'] ?? 0);
        $plyCount = (int) ($params['ply_count'] ?? 3);
        $fluteType = $params['flute_type'] ?? 'B';
        $boxType = $params['box_type'] ?? 'RSC';
        $paperConfig = $params['paper_config'] ?? [];
        $ups = (int) ($params['ups'] ?? 1);

        // Validation
        if ($length <= 0 || $width <= 0 || $height <= 0) {
            return ['success' => false, 'error' => 'Invalid dimensions'];
        }

        // Calculate dimensions
        $deckle = self::calculateDeckle($length, $width, $boxType);
        $cutting = self::calculateCutting($length, $width, $height, $boxType);
        $sheetArea = self::calculateSheetArea($deckle, $cutting);
        $boardThickness = self::calculateBoardThickness($plyCount, $fluteType);

        // Calculate paper weight
        $weightData = self::calculatePaperWeight($plyCount, $fluteType, $sheetArea, $paperConfig);
        $boxWeight = $ups > 0 ? $weightData['total_weight'] / $ups : $weightData['total_weight'];

        // Calculate strength
        $burstingStrength = self::calculateBurstingStrength($paperConfig);
        $ect = self::calculateECT($plyCount, $fluteType, $paperConfig);
        $bct = self::calculateBCT($length, $width, $height, $plyCount, $fluteType, $paperConfig);

        // Calculate cost
        $costParams = [
            'paper_weight' => $weightData['total_weight'],
            'paper_rate' => $params['paper_rate'] ?? 45,
            'conversion_cost_per_sqm' => $params['conversion_cost'] ?? 2.5,
            'sheet_area' => $sheetArea,
            'printing_cost' => $params['printing_cost'] ?? 0,
            'die_cost' => $params['die_cost'] ?? 0,
            'other_cost' => $params['other_cost'] ?? 0,
            'ups' => $ups,
            'wastage_percent' => $params['wastage_percent'] ?? 3,
        ];
        $costData = self::calculateCost($costParams);

        // Calculate selling price
        $marginPercent = $params['margin_percent'] ?? 15;
        $priceData = self::calculateSellingPrice($costData['cost_per_box'], $marginPercent);

        // Quantity calculations
        $quantity = (int) ($params['quantity'] ?? 1);
        $totalCost = $costData['cost_per_box'] * $quantity;
        $totalAmount = $priceData['selling_price'] * $quantity;
        $totalProfit = $priceData['profit_per_box'] * $quantity;

        return [
            'success' => true,
            'input' => [
                'length' => $length,
                'width' => $width,
                'height' => $height,
                'ply_count' => $plyCount,
                'flute_type' => $fluteType,
                'box_type' => $boxType,
                'ups' => $ups,
                'quantity' => $quantity,
            ],
            'dimensions' => [
                'deckle_size' => round($deckle, 2),
                'cutting_size' => round($cutting, 2),
                'sheet_area_sqm' => round($sheetArea, 4),
                'sheet_area_sqft' => round($sheetArea * 10.764, 4),
                'board_thickness' => round($boardThickness, 2),
                'internal_dimensions' => [
                    'length' => $length,
                    'width' => $width,
                    'height' => $height,
                ],
                'external_dimensions' => [
                    'length' => round($length + (2 * $boardThickness), 2),
                    'width' => round($width + (2 * $boardThickness), 2),
                    'height' => round($height + $boardThickness, 2),
                ],
            ],
            'weight' => [
                'paper_weight_per_sheet' => round($weightData['total_weight'], 4),
                'box_weight' => round($boxWeight, 4),
                'liner_weight' => round($weightData['liner_weight'], 4),
                'fluting_weight' => round($weightData['fluting_weight'], 4),
                'breakdown' => $weightData['breakdown'],
            ],
            'strength' => [
                'bursting_strength' => $burstingStrength,
                'ect' => $ect,
                'bct' => $bct,
                'max_stacking_load' => round($bct * 0.6, 2), // 60% safety factor
            ],
            'cost' => $costData,
            'pricing' => $priceData,
            'totals' => [
                'quantity' => $quantity,
                'total_cost' => round($totalCost, 2),
                'total_amount' => round($totalAmount, 2),
                'total_profit' => round($totalProfit, 2),
                'total_weight' => round($boxWeight * $quantity, 2),
            ],
        ];
    }

    /**
     * Get default paper config based on ply count
     */
    public static function getDefaultPaperConfig($plyCount)
    {
        switch ($plyCount) {
            case 3:
                return [
                    'top_liner' => 150,
                    'top_liner_bf' => 18,
                    'fluting' => 120,
                    'bottom_liner' => 150,
                    'bottom_liner_bf' => 18,
                ];
            case 5:
                return [
                    'top_liner' => 180,
                    'top_liner_bf' => 20,
                    'fluting1' => 120,
                    'middle_liner' => 150,
                    'middle_liner_bf' => 18,
                    'fluting2' => 120,
                    'bottom_liner' => 180,
                    'bottom_liner_bf' => 20,
                ];
            case 7:
                return [
                    'top_liner' => 200,
                    'top_liner_bf' => 22,
                    'fluting1' => 150,
                    'liner2' => 150,
                    'liner2_bf' => 18,
                    'fluting2' => 120,
                    'liner3' => 150,
                    'liner3_bf' => 18,
                    'fluting3' => 120,
                    'bottom_liner' => 200,
                    'bottom_liner_bf' => 22,
                ];
            default:
                return self::getDefaultPaperConfig(3);
        }
    }
}