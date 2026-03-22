<?php

namespace app\controllers\api;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use app\components\BoxCalculator;
use app\models\PaperRate;
use app\models\ConversionCost;

class BoxController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $behaviors;
    }

    /**
     * Full box calculation
     * POST /api/box/calculate
     */
    public function actionCalculate()
    {
        $params = Yii::$app->request->post();
        
        // Validation
        if (empty($params['length']) || empty($params['width']) || empty($params['height'])) {
            return [
                'success' => false,
                'error' => 'Length, Width, and Height are required',
            ];
        }

        $result = BoxCalculator::calculate($params);
        return $result;
    }

    /**
     * Quick calculation (basic)
     * POST /api/box/quick-calculate
     */
    public function actionQuickCalculate()
    {
        $request = Yii::$app->request;
        
        $length = (float) $request->post('length', 0);
        $width = (float) $request->post('width', 0);
        $height = (float) $request->post('height', 0);
        $plyCount = (int) $request->post('ply_count', 3);
        $fluteType = $request->post('flute_type', 'B');
        $quantity = (int) $request->post('quantity', 100);

        if ($length <= 0 || $width <= 0 || $height <= 0) {
            return ['success' => false, 'error' => 'Invalid dimensions'];
        }

        // Use default paper config
        $paperConfig = BoxCalculator::getDefaultPaperConfig($plyCount);
        
        // Get current paper rate
        $avgRate = PaperRate::find()
            ->where(['status' => 1])
            ->average('rate') ?? 42;

        // Get conversion cost
        $conversionCost = ConversionCost::find()
            ->where(['ply_count' => $plyCount, 'status' => 1])
            ->one();
        $convCostPerSqm = $conversionCost ? $conversionCost->cost_per_sqm : 2.5;

        $result = BoxCalculator::calculate([
            'length' => $length,
            'width' => $width,
            'height' => $height,
            'ply_count' => $plyCount,
            'flute_type' => $fluteType,
            'paper_config' => $paperConfig,
            'paper_rate' => $avgRate,
            'conversion_cost' => $convCostPerSqm,
            'quantity' => $quantity,
            'margin_percent' => 15,
        ]);

        return $result;
    }

    /**
     * Get box configuration options
     * GET /api/box/options
     */
    public function actionOptions()
    {
        return [
            'success' => true,
            'data' => [
                'box_types' => BoxCalculator::BOX_TYPES,
                'flute_types' => [
                    'A' => 'A Flute (4.8mm) - Heavy duty',
                    'B' => 'B Flute (2.5mm) - Standard',
                    'C' => 'C Flute (3.6mm) - General purpose',
                    'E' => 'E Flute (1.5mm) - Retail/Display',
                    'F' => 'F Flute (0.8mm) - Fine printing',
                    'BC' => 'BC Flute (6.1mm) - Double wall',
                    'BE' => 'BE Flute (4.0mm) - Double wall',
                    'EB' => 'EB Flute (4.0mm) - Double wall',
                ],
                'ply_options' => [
                    3 => '3 Ply (Single Wall)',
                    5 => '5 Ply (Double Wall)',
                    7 => '7 Ply (Triple Wall)',
                ],
                'flute_specs' => BoxCalculator::FLUTE_SPECS,
                'units' => [
                    'dimensions' => 'mm',
                    'weight' => 'kg',
                    'area' => 'sq.m',
                    'rate' => '₹/kg',
                ],
            ],
        ];
    }

    /**
     * Get default paper configuration
     * GET /api/box/paper-config/{plyCount}
     */
    public function actionPaperConfig($plyCount)
    {
        $config = BoxCalculator::getDefaultPaperConfig((int) $plyCount);
        
        return [
            'success' => true,
            'data' => $config,
        ];
    }

    /**
     * Get current paper rates
     * GET /api/box/paper-rates
     */
    public function actionPaperRates()
    {
        $rates = PaperRate::find()
            ->where(['status' => 1])
            ->orderBy(['paper_type' => SORT_ASC, 'gsm' => SORT_ASC])
            ->all();

        $grouped = [];
        foreach ($rates as $rate) {
            $type = $rate->paper_type;
            if (!isset($grouped[$type])) {
                $grouped[$type] = [];
            }
            $grouped[$type][] = [
                'id' => $rate->id,
                'gsm' => $rate->gsm,
                'bf' => $rate->bf,
                'rate' => $rate->rate,
            ];
        }

        return [
            'success' => true,
            'data' => $grouped,
        ];
    }

    /**
     * Get conversion costs
     * GET /api/box/conversion-costs
     */
    public function actionConversionCosts()
    {
        $costs = ConversionCost::find()
            ->where(['status' => 1])
            ->orderBy(['ply_count' => SORT_ASC])
            ->all();

        return [
            'success' => true,
            'data' => $costs,
        ];
    }

    /**
     * Compare box configurations
     * POST /api/box/compare
     */
    public function actionCompare()
    {
        $configurations = Yii::$app->request->post('configurations', []);
        
        if (empty($configurations) || !is_array($configurations)) {
            return ['success' => false, 'error' => 'Configurations array is required'];
        }

        $results = [];
        foreach ($configurations as $index => $config) {
            $result = BoxCalculator::calculate($config);
            if ($result['success']) {
                $results[] = [
                    'config_index' => $index,
                    'label' => $config['label'] ?? "Option " . ($index + 1),
                    'result' => $result,
                ];
            }
        }

        // Sort by cost
        usort($results, function ($a, $b) {
            return $a['result']['cost']['cost_per_box'] <=> $b['result']['cost']['cost_per_box'];
        });

        return [
            'success' => true,
            'data' => $results,
            'cheapest' => $results[0] ?? null,
        ];
    }

    /**
     * Suggest optimal configuration
     * POST /api/box/suggest
     */
    public function actionSuggest()
    {
        $request = Yii::$app->request;
        
        $length = (float) $request->post('length', 0);
        $width = (float) $request->post('width', 0);
        $height = (float) $request->post('height', 0);
        $maxWeight = (float) $request->post('max_weight', 0); // Max content weight in kg
        $priority = $request->post('priority', 'cost'); // cost, strength, weight

        if ($length <= 0 || $width <= 0 || $height <= 0) {
            return ['success' => false, 'error' => 'Invalid dimensions'];
        }

        // Generate configurations to compare
        $configurations = [];
        $fluteOptions = ['B', 'C', 'E'];
        $plyOptions = [3, 5];

        foreach ($plyOptions as $ply) {
            foreach ($fluteOptions as $flute) {
                $config = BoxCalculator::getDefaultPaperConfig($ply);
                $configurations[] = [
                    'label' => "{$ply} Ply - {$flute} Flute",
                    'length' => $length,
                    'width' => $width,
                    'height' => $height,
                    'ply_count' => $ply,
                    'flute_type' => $flute,
                    'paper_config' => $config,
                    'paper_rate' => 42,
                    'conversion_cost' => $ply == 3 ? 2.5 : 4.0,
                    'quantity' => 100,
                    'margin_percent' => 15,
                ];
            }
        }

        // Calculate all options
        $results = [];
        foreach ($configurations as $config) {
            $result = BoxCalculator::calculate($config);
            if ($result['success']) {
                // Check if strength is sufficient for max weight
                $sufficient = true;
                if ($maxWeight > 0) {
                    $stackingLoad = $result['strength']['max_stacking_load'] ?? 0;
                    $sufficient = $stackingLoad >= ($maxWeight * 10); // kg to N approximation
                }
                
                $results[] = [
                    'label' => $config['label'],
                    'ply_count' => $config['ply_count'],
                    'flute_type' => $config['flute_type'],
                    'cost_per_box' => $result['cost']['cost_per_box'],
                    'box_weight' => $result['weight']['box_weight'],
                    'bct' => $result['strength']['bct'],
                    'max_load' => $result['strength']['max_stacking_load'],
                    'strength_sufficient' => $sufficient,
                    'full_result' => $result,
                ];
            }
        }

        // Filter and sort based on priority
        $validResults = array_filter($results, function ($r) use ($maxWeight) {
            return $maxWeight == 0 || $r['strength_sufficient'];
        });

        if (empty($validResults)) {
            $validResults = $results; // Fallback to all if none sufficient
        }

        switch ($priority) {
            case 'strength':
                usort($validResults, function ($a, $b) {
                    return $b['bct'] <=> $a['bct'];
                });
                break;
            case 'weight':
                usort($validResults, function ($a, $b) {
                    return $a['box_weight'] <=> $b['box_weight'];
                });
                break;
            default: // cost
                usort($validResults, function ($a, $b) {
                    return $a['cost_per_box'] <=> $b['cost_per_box'];
                });
        }

        return [
            'success' => true,
            'data' => [
                'recommended' => $validResults[0] ?? null,
                'alternatives' => array_slice($validResults, 1, 3),
                'all_options' => $results,
            ],
        ];
    }
}