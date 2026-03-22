<?php

namespace app\controllers\api;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\data\ActiveDataProvider;
use app\models\Attendance;
use app\models\AttendanceSearch;
use app\models\User;

class AttendanceController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $behaviors;
    }

    /**
     * List all attendance records with filters
     * GET /api/attendance
     */
    public function actionIndex()
    {
        $searchModel = new AttendanceSearch();
        $params = Yii::$app->request->queryParams;
        
        $dataProvider = $searchModel->search($params);
        
        return [
            'success' => true,
            'data' => $dataProvider->getModels(),
            'pagination' => [
                'totalCount' => $dataProvider->getTotalCount(),
                'pageCount' => $dataProvider->getPagination()->getPageCount(),
                'currentPage' => $dataProvider->getPagination()->getPage() + 1,
                'perPage' => $dataProvider->getPagination()->getPageSize(),
            ],
        ];
    }

    /**
     * View single attendance record
     * GET /api/attendance/{id}
     */
    public function actionView($id)
    {
        $model = Attendance::findOne($id);
        
        if (!$model) {
            return ['success' => false, 'error' => 'Attendance record not found'];
        }

        return ['success' => true, 'data' => $model];
    }

    /**
     * Create new attendance record
     * POST /api/attendance
     */
    public function actionCreate()
    {
        $model = new Attendance();
        $model->load(Yii::$app->request->post(), '');

        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Attendance created successfully',
                'data' => $model,
            ];
        }

        return [
            'success' => false,
            'errors' => $model->errors,
        ];
    }

    /**
     * Update attendance record
     * PUT /api/attendance/{id}
     */
    public function actionUpdate($id)
    {
        $model = Attendance::findOne($id);

        if (!$model) {
            return ['success' => false, 'error' => 'Attendance record not found'];
        }

        $model->load(Yii::$app->request->post(), '');

        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Attendance updated successfully',
                'data' => $model,
            ];
        }

        return [
            'success' => false,
            'errors' => $model->errors,
        ];
    }

    /**
     * Delete attendance record
     * DELETE /api/attendance/{id}
     */
    public function actionDelete($id)
    {
        $model = Attendance::findOne($id);

        if (!$model) {
            return ['success' => false, 'error' => 'Attendance record not found'];
        }

        if ($model->delete()) {
            return [
                'success' => true,
                'message' => 'Attendance deleted successfully',
            ];
        }

        return [
            'success' => false,
            'error' => 'Failed to delete attendance',
        ];
    }

    /**
     * Mark attendance (Create or Update)
     * POST /api/attendance/mark
     */
    public function actionMark()
    {
        $request = Yii::$app->request;
        $userId = $request->post('user_id');
        $date = $request->post('date', date('Y-m-d'));

        if (!$userId) {
            return ['success' => false, 'error' => 'User ID is required'];
        }

        // Check if user exists
        $user = User::findOne($userId);
        if (!$user) {
            return ['success' => false, 'error' => 'User not found'];
        }

        // Find existing or create new
        $model = Attendance::findOne(['user_id' => $userId, 'date' => $date]);
        $isNew = false;

        if (!$model) {
            $model = new Attendance();
            $model->user_id = $userId;
            $model->date = $date;
            $isNew = true;
        }

        // Update fields
        $model->status = $request->post('status', Attendance::STATUS_PRESENT);
        
        if ($request->post('check_in')) {
            $model->check_in = $request->post('check_in');
        } elseif ($isNew && $model->status === Attendance::STATUS_PRESENT) {
            $model->check_in = date('H:i:s');
        }

        if ($request->post('check_out')) {
            $model->check_out = $request->post('check_out');
        }

        $model->leave_type = $request->post('leave_type');
        $model->overtime_hours = $request->post('overtime_hours', 0);
        $model->notes = $request->post('notes');
        // $model->marked_by = Yii::$app->user->id; // If auth is implemented

        // Auto-detect late
        if ($model->status === Attendance::STATUS_PRESENT && $model->isLate()) {
            $model->status = Attendance::STATUS_LATE;
        }

        if ($model->save()) {
            return [
                'success' => true,
                'message' => $isNew ? 'Attendance marked successfully' : 'Attendance updated successfully',
                'data' => $model,
            ];
        }

        return [
            'success' => false,
            'errors' => $model->errors,
        ];
    }

    /**
     * Bulk mark attendance for multiple users
     * POST /api/attendance/bulk-mark
     */
    public function actionBulkMark()
    {
        $request = Yii::$app->request;
        $date = $request->post('date', date('Y-m-d'));
        $attendances = $request->post('attendances', []);

        if (empty($attendances)) {
            return ['success' => false, 'error' => 'No attendance data provided'];
        }

        $success = 0;
        $failed = 0;
        $errors = [];

        foreach ($attendances as $item) {
            $userId = $item['user_id'] ?? null;
            if (!$userId) continue;

            $model = Attendance::findOne(['user_id' => $userId, 'date' => $date]);
            
            if (!$model) {
                $model = new Attendance();
                $model->user_id = $userId;
                $model->date = $date;
            }

            $model->status = $item['status'] ?? Attendance::STATUS_PRESENT;
            $model->check_in = $item['check_in'] ?? null;
            $model->check_out = $item['check_out'] ?? null;
            $model->leave_type = $item['leave_type'] ?? null;
            $model->overtime_hours = $item['overtime_hours'] ?? 0;
            $model->notes = $item['notes'] ?? null;

            if ($model->save()) {
                $success++;
            } else {
                $failed++;
                $errors[$userId] = $model->errors;
            }
        }

        return [
            'success' => true,
            'message' => "Marked: $success, Failed: $failed",
            'data' => [
                'success_count' => $success,
                'failed_count' => $failed,
                'errors' => $errors,
            ],
        ];
    }

    /**
     * Check In
     * POST /api/attendance/check-in
     */
    public function actionCheckIn()
    {
        $userId = Yii::$app->request->post('user_id');
        $date = date('Y-m-d');
        $time = date('H:i:s');

        $model = Attendance::findOne(['user_id' => $userId, 'date' => $date]);

        if ($model && $model->check_in) {
            return ['success' => false, 'error' => 'Already checked in today'];
        }

        if (!$model) {
            $model = new Attendance();
            $model->user_id = $userId;
            $model->date = $date;
        }

        $model->check_in = $time;
        $model->status = $model->isLate() ? Attendance::STATUS_LATE : Attendance::STATUS_PRESENT;

        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Checked in at ' . $time,
                'data' => $model,
            ];
        }

        return ['success' => false, 'errors' => $model->errors];
    }

    /**
     * Check Out
     * POST /api/attendance/check-out
     */
    public function actionCheckOut()
    {
        $userId = Yii::$app->request->post('user_id');
        $date = date('Y-m-d');
        $time = date('H:i:s');

        $model = Attendance::findOne(['user_id' => $userId, 'date' => $date]);

        if (!$model) {
            return ['success' => false, 'error' => 'No check-in found for today'];
        }

        if ($model->check_out) {
            return ['success' => false, 'error' => 'Already checked out today'];
        }

        $model->check_out = $time;

        // Calculate overtime (after 6 PM = 18:00)
        if ($time > '18:00:00') {
            $overtime = (strtotime($time) - strtotime('18:00:00')) / 3600;
            $model->overtime_hours = round($overtime, 2);
        }

        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Checked out at ' . $time,
                'data' => $model,
            ];
        }

        return ['success' => false, 'errors' => $model->errors];
    }

    /**
     * Today's attendance summary
     * GET /api/attendance/today
     */
    public function actionToday()
    {
        $date = Yii::$app->request->get('date', date('Y-m-d'));

        $attendances = Attendance::find()
            ->with('user')
            ->where(['date' => $date])
            ->all();

        $summary = [
            'date' => $date,
            'total' => count($attendances),
            'present' => 0,
            'absent' => 0,
            'late' => 0,
            'half_day' => 0,
            'leave' => 0,
        ];

        foreach ($attendances as $att) {
            if (isset($summary[$att->status])) {
                $summary[$att->status]++;
            }
        }

        // Get users who haven't marked attendance
        $markedUserIds = array_column($attendances, 'user_id');
        $unmarkedUsers = User::find()
            ->where(['status' => 1])
            ->andWhere(['not in', 'id', $markedUserIds ?: [0]])
            ->all();

        return [
            'success' => true,
            'data' => [
                'summary' => $summary,
                'attendances' => $attendances,
                'unmarked_users' => $unmarkedUsers,
            ],
        ];
    }

    /**
     * Monthly report
     * GET /api/attendance/monthly-report
     */
    public function actionMonthlyReport()
    {
        $month = Yii::$app->request->get('month', date('m'));
        $year = Yii::$app->request->get('year', date('Y'));
        $department = Yii::$app->request->get('department');
        $userId = Yii::$app->request->get('user_id');

        // Get all users
        $usersQuery = User::find()->where(['status' => 1]);
        if ($department) {
            $usersQuery->andWhere(['department' => $department]);
        }
        if ($userId) {
            $usersQuery->andWhere(['id' => $userId]);
        }
        $users = $usersQuery->all();

        // Get attendance for the month
        $attendanceQuery = Attendance::find()
            ->where(['MONTH(date)' => $month, 'YEAR(date)' => $year]);
        
        if ($userId) {
            $attendanceQuery->andWhere(['user_id' => $userId]);
        } elseif ($department) {
            $userIds = array_column($users, 'id');
            $attendanceQuery->andWhere(['in', 'user_id', $userIds]);
        }

        $attendances = $attendanceQuery->all();

        // Group by user
        $attendanceMap = [];
        foreach ($attendances as $att) {
            $attendanceMap[$att->user_id][$att->date] = $att;
        }

        // Calculate days in month
        $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
        $workingDays = 0;
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dayOfWeek = date('N', strtotime("$year-$month-$d"));
            if ($dayOfWeek < 7) { // Exclude Sundays (7)
                $workingDays++;
            }
        }

        // Build report
        $report = [];
        foreach ($users as $user) {
            $userAttendance = $attendanceMap[$user->id] ?? [];
            
            $stats = [
                'user_id' => $user->id,
                'user_name' => $user->full_name,
                'department' => $user->department,
                'present' => 0,
                'absent' => 0,
                'late' => 0,
                'half_day' => 0,
                'leave' => 0,
                'holiday' => 0,
                'overtime_hours' => 0,
                'total_working_hours' => 0,
                'attendance_percentage' => 0,
                'daily_records' => [],
            ];

            for ($d = 1; $d <= $daysInMonth; $d++) {
                $dateStr = sprintf('%04d-%02d-%02d', $year, $month, $d);
                $dayOfWeek = date('N', strtotime($dateStr));
                
                $record = $userAttendance[$dateStr] ?? null;
                
                $dayData = [
                    'date' => $dateStr,
                    'day' => date('D', strtotime($dateStr)),
                    'is_sunday' => ($dayOfWeek == 7),
                    'status' => null,
                    'check_in' => null,
                    'check_out' => null,
                    'working_hours' => 0,
                ];

                if ($record) {
                    $dayData['status'] = $record->status;
                    $dayData['check_in'] = $record->check_in;
                    $dayData['check_out'] = $record->check_out;
                    $dayData['working_hours'] = $record->getWorkingHours();
                    
                    $stats[$record->status]++;
                    $stats['overtime_hours'] += $record->overtime_hours;
                    $stats['total_working_hours'] += $record->getWorkingHours();
                } elseif ($dayOfWeek == 7) {
                    $dayData['status'] = 'sunday';
                } elseif (strtotime($dateStr) < strtotime(date('Y-m-d'))) {
                    $dayData['status'] = 'unmarked';
                }

                $stats['daily_records'][] = $dayData;
            }

            // Calculate attendance percentage
            $effectiveDays = $stats['present'] + $stats['late'] + ($stats['half_day'] * 0.5);
            $stats['attendance_percentage'] = $workingDays > 0 
                ? round(($effectiveDays / $workingDays) * 100, 2) 
                : 0;

            $report[] = $stats;
        }

        return [
            'success' => true,
            'data' => [
                'month' => (int) $month,
                'year' => (int) $year,
                'days_in_month' => $daysInMonth,
                'working_days' => $workingDays,
                'report' => $report,
            ],
        ];
    }

    /**
     * Employee attendance history
     * GET /api/attendance/user-history/{userId}
     */
    public function actionUserHistory($userId)
    {
        $user = User::findOne($userId);
        if (!$user) {
            return ['success' => false, 'error' => 'User not found'];
        }

        $fromDate = Yii::$app->request->get('from_date', date('Y-m-01'));
        $toDate = Yii::$app->request->get('to_date', date('Y-m-t'));

        $attendances = Attendance::find()
            ->where(['user_id' => $userId])
            ->andWhere(['>=', 'date', $fromDate])
            ->andWhere(['<=', 'date', $toDate])
            ->orderBy(['date' => SORT_DESC])
            ->all();

        // Calculate summary
        $summary = [
            'present' => 0,
            'absent' => 0,
            'late' => 0,
            'half_day' => 0,
            'leave' => 0,
            'total_overtime' => 0,
            'total_working_hours' => 0,
        ];

        foreach ($attendances as $att) {
            if (isset($summary[$att->status])) {
                $summary[$att->status]++;
            }
            $summary['total_overtime'] += $att->overtime_hours;
            $summary['total_working_hours'] += $att->getWorkingHours();
        }

        return [
            'success' => true,
            'data' => [
                'user' => $user,
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'summary' => $summary,
                'records' => $attendances,
            ],
        ];
    }

    /**
     * Get status options
     * GET /api/attendance/status-options
     */
    public function actionStatusOptions()
    {
        return [
            'success' => true,
            'data' => [
                'statuses' => Attendance::getStatusOptions(),
                'leave_types' => Attendance::getLeaveTypeOptions(),
            ],
        ];
    }
}