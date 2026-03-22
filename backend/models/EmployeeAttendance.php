<?php

namespace app\models;

use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

class EmployeeAttendance extends ActiveRecord
{
    public static function tableName()
    {
        return 'employee_attendance';
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
            [['employee_id', 'date', 'status'], 'required'],
            [['employee_id'], 'integer'],
            [['date'], 'date', 'format' => 'php:Y-m-d'],
            [['check_in', 'check_out'], 'safe'],
            [['overtime_hours'], 'number'],
            [['notes'], 'string'],
            [['status'], 'in', 'range' => ['present', 'absent', 'half_day', 'leave', 'holiday']],
            [['employee_id', 'date'], 'unique', 'targetAttribute' => ['employee_id', 'date']],
        ];
    }

    public function getEmployee()
    {
        return $this->hasOne(Employee::class, ['id' => 'employee_id']);
    }

    public function fields()
    {
        return [
            'id',
            'employee_id',
            'date',
            'status',
            'check_in',
            'check_out',
            'overtime_hours',
            'notes',
            'created_at',
            'updated_at',
        ];
    }
}
