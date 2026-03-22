<?php

namespace app\controllers\api;

use Yii;
use yii\web\Controller;
use yii\web\Response;
use app\models\Employee;
use app\models\EmployeeAttendance;

class EmployeeAttendanceController extends Controller
{
    public $enableCsrfValidation = false;

    public function beforeAction($action)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        return parent::beforeAction($action);
    }

    public function actionIndex()
    {
        $date = Yii::$app->request->get('date', date('Y-m-d'));
        $rows = EmployeeAttendance::find()->where(['date' => $date])->all();

        return [
            'success' => true,
            'data' => $rows,
        ];
    }

    public function actionBulkSave()
    {
        $date = Yii::$app->request->post('date', date('Y-m-d'));
        $entries = Yii::$app->request->post('entries', []);

        if (empty($entries) || !is_array($entries)) {
            Yii::$app->response->statusCode = 422;
            return ['success' => false, 'message' => 'Entries are required'];
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            foreach ($entries as $entry) {
                $employeeId = (int) ($entry['employee_id'] ?? 0);
                if ($employeeId <= 0) {
                    continue;
                }

                $model = EmployeeAttendance::findOne(['employee_id' => $employeeId, 'date' => $date]);
                if (!$model) {
                    $model = new EmployeeAttendance();
                    $model->employee_id = $employeeId;
                    $model->date = $date;
                }

                $model->status = $entry['status'] ?? 'present';
                $model->check_in = $entry['check_in'] ?? null;
                $model->check_out = $entry['check_out'] ?? null;
                $model->overtime_hours = (float) ($entry['overtime_hours'] ?? 0);
                $model->notes = $entry['notes'] ?? '';

                if (!$model->save()) {
                    throw new \RuntimeException(json_encode($model->errors));
                }
            }

            $transaction->commit();
            return [
                'success' => true,
                'message' => 'Attendance saved successfully',
            ];
        } catch (\Throwable $e) {
            $transaction->rollBack();
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    public function actionMonthlyReport()
    {
        $month = (int) Yii::$app->request->get('month', date('m'));
        $year = (int) Yii::$app->request->get('year', date('Y'));
        $department = Yii::$app->request->get('department');
        $employeeId = Yii::$app->request->get('employee_id');

        $employeesQuery = Employee::find()->where(['status' => 1]);
        if (!empty($department)) {
            $employeesQuery->andWhere(['department' => $department]);
        }
        if (!empty($employeeId)) {
            $employeesQuery->andWhere(['id' => (int) $employeeId]);
        }
        $employees = $employeesQuery->all();

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = date('Y-m-t', strtotime($startDate));

        $attendanceQuery = EmployeeAttendance::find()
            ->where(['>=', 'date', $startDate])
            ->andWhere(['<=', 'date', $endDate]);

        if (!empty($employeeId)) {
            $attendanceQuery->andWhere(['employee_id' => (int) $employeeId]);
        } else {
            $employeeIds = array_map(function ($employee) {
                return $employee->id;
            }, $employees);
            $attendanceQuery->andWhere(['in', 'employee_id', !empty($employeeIds) ? $employeeIds : [0]]);
        }

        $attendances = $attendanceQuery->all();

        $map = [];
        $dailyTrend = [];
        foreach ($attendances as $att) {
            $map[$att->employee_id][] = $att;

            if (!isset($dailyTrend[$att->date])) {
                $dailyTrend[$att->date] = ['date' => date('d', strtotime($att->date)), 'present' => 0, 'absent' => 0, 'leave' => 0];
            }

            if ($att->status === 'present') {
                $dailyTrend[$att->date]['present']++;
            } elseif ($att->status === 'absent') {
                $dailyTrend[$att->date]['absent']++;
            } elseif ($att->status === 'leave') {
                $dailyTrend[$att->date]['leave']++;
            }
        }

        $report = [];
        $deptAgg = [];

        foreach ($employees as $employee) {
            $rows = $map[$employee->id] ?? [];
            $present = 0;
            $absent = 0;
            $halfDay = 0;
            $leave = 0;
            $overtime = 0.0;

            foreach ($rows as $row) {
                if ($row->status === 'present') $present++;
                if ($row->status === 'absent') $absent++;
                if ($row->status === 'half_day') $halfDay++;
                if ($row->status === 'leave') $leave++;
                $overtime += (float) $row->overtime_hours;
            }

            $workingDays = date('t', strtotime($startDate));
            $attendancePercentage = $workingDays > 0 ? round((($present + ($halfDay * 0.5)) / $workingDays) * 100, 2) : 0;

            $report[] = [
                'employee_id' => $employee->id,
                'employee_name' => $employee->name,
                'employee_code' => $employee->employee_code,
                'department' => $employee->department,
                'present' => $present,
                'absent' => $absent,
                'half_day' => $halfDay,
                'leave' => $leave,
                'total_days' => $workingDays,
                'working_days' => $workingDays,
                'overtime_hours' => round($overtime, 2),
                'attendance_percentage' => $attendancePercentage,
            ];

            if (!isset($deptAgg[$employee->department])) {
                $deptAgg[$employee->department] = ['present' => 0, 'absent' => 0, 'total' => 0];
            }
            $deptAgg[$employee->department]['present'] += $present;
            $deptAgg[$employee->department]['absent'] += $absent;
            $deptAgg[$employee->department]['total'] += max(1, ($present + $absent + $halfDay + $leave));
        }

        $departmentStats = [];
        foreach ($deptAgg as $dept => $agg) {
            $departmentStats[] = [
                'department' => $dept,
                'present' => $agg['present'],
                'absent' => $agg['absent'],
                'total' => $agg['total'],
                'percentage' => $agg['total'] > 0 ? round(($agg['present'] / $agg['total']) * 100, 2) : 0,
            ];
        }

        return [
            'success' => true,
            'data' => [
                'report' => $report,
                'daily_trend' => array_values($dailyTrend),
                'department_stats' => $departmentStats,
            ],
        ];
    }
}
