<?php

namespace app\controllers\api;

use yii\rest\Controller;
use yii\web\Response;
use app\models\BoxOrder;
use app\models\RawMaterial;
use app\models\Attendance;
use app\models\Customer;

class DashboardController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $behaviors;
    }

    /**
     * Dashboard Statistics
     * GET /api/dashboard/stats
     */
    public function actionStats()
    {
        $today = date('Y-m-d');
        $thisMonth = date('Y-m');

        // Orders Stats
        $totalOrders = BoxOrder::find()->count();
        $pendingOrders = BoxOrder::find()->where(['status' => ['draft', 'confirmed', 'in_production']])->count();
        $completedToday = BoxOrder::find()
            ->where(['status' => 'completed'])
            ->andWhere(['DATE(updated_at)' => $today])
            ->count();

        // Inventory Stats
        $lowStockItems = RawMaterial::find()
            ->where('current_stock <= min_stock_level')
            ->andWhere(['status' => 1])
            ->count();
        
        $totalMaterials = RawMaterial::find()->where(['status' => 1])->count();

        // Attendance Stats
        $presentToday = Attendance::find()
            ->where(['date' => $today, 'status' => 'present'])
            ->count();
        
        $absentToday = Attendance::find()
            ->where(['date' => $today, 'status' => 'absent'])
            ->count();

        // Customers
        $totalCustomers = Customer::find()->where(['status' => 1])->count();

        // Recent Orders
        $recentOrders = BoxOrder::find()
            ->with('customer')
            ->orderBy(['created_at' => SORT_DESC])
            ->limit(5)
            ->all();

        // Low Stock Materials
        $lowStockMaterials = RawMaterial::find()
            ->where('current_stock <= min_stock_level')
            ->andWhere(['status' => 1])
            ->limit(5)
            ->all();

        return [
            'success' => true,
            'data' => [
                'orders' => [
                    'total' => $totalOrders,
                    'pending' => $pendingOrders,
                    'completed_today' => $completedToday,
                ],
                'inventory' => [
                    'total_materials' => $totalMaterials,
                    'low_stock_count' => $lowStockItems,
                ],
                'attendance' => [
                    'present_today' => $presentToday,
                    'absent_today' => $absentToday,
                ],
                'customers' => [
                    'total' => $totalCustomers,
                ],
                'recent_orders' => $recentOrders,
                'low_stock_materials' => $lowStockMaterials,
            ]
        ];
    }
}