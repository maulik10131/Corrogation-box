<?php

namespace app\models;

use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

class Attendance extends ActiveRecord
{
    const STATUS_PRESENT = 'present';
    const STATUS_ABSENT = 'absent';
    const STATUS_HALF_DAY = 'half_day';
    const STATUS_LATE = 'late';
    const STATUS_LEAVE = 'leave';
    const STATUS_HOLIDAY = 'holiday';

    const LEAVE_CASUAL = 'casual';
    const LEAVE_SICK = 'sick';
    const LEAVE_EARNED = 'earned';
    const LEAVE_UNPAID = 'unpaid';

    public static function tableName()
    {
        return 'attendance';
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
            [['user_id', 'date'], 'required'],
            [['user_id', 'marked_by'], 'integer'],
            [['date'], 'date', 'format' => 'php:Y-m-d'],
            [['check_in', 'check_out'], 'safe'],
            [['status'], 'in', 'range' => [
                self::STATUS_PRESENT, 
                self::STATUS_ABSENT, 
                self::STATUS_HALF_DAY, 
                self::STATUS_LATE, 
                self::STATUS_LEAVE, 
                self::STATUS_HOLIDAY
            ]],
            [['leave_type'], 'in', 'range' => [
                self::LEAVE_CASUAL, 
                self::LEAVE_SICK, 
                self::LEAVE_EARNED, 
                self::LEAVE_UNPAID
            ]],
            [['overtime_hours'], 'number', 'min' => 0, 'max' => 12],
            [['notes'], 'string', 'max' => 500],
            [['user_id', 'date'], 'unique', 'targetAttribute' => ['user_id', 'date'], 'message' => 'Attendance already marked for this date.'],
            [['user_id'], 'exist', 'targetClass' => User::class, 'targetAttribute' => 'id'],
        ];
    }

    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'user_id' => 'Employee',
            'date' => 'Date',
            'check_in' => 'Check In',
            'check_out' => 'Check Out',
            'status' => 'Status',
            'leave_type' => 'Leave Type',
            'overtime_hours' => 'Overtime (Hours)',
            'notes' => 'Notes',
        ];
    }

    public function getUser()
    {
        return $this->hasOne(User::class, ['id' => 'user_id']);
    }

    public function getMarkedByUser()
    {
        return $this->hasOne(User::class, ['id' => 'marked_by']);
    }

    /**
     * Calculate working hours
     */
    public function getWorkingHours()
    {
        if ($this->check_in && $this->check_out) {
            $checkIn = strtotime($this->check_in);
            $checkOut = strtotime($this->check_out);
            
            if ($checkOut > $checkIn) {
                $diff = ($checkOut - $checkIn) / 3600; // Convert to hours
                return round($diff, 2);
            }
        }
        return 0;
    }

    /**
     * Check if late (after 9:30 AM)
     */
    public function isLate($graceTime = '09:30:00')
    {
        if ($this->check_in) {
            return $this->check_in > $graceTime;
        }
        return false;
    }

    public function fields()
    {
        return [
            'id',
            'user_id',
            'user_name' => function () {
                return $this->user ? $this->user->full_name : null;
            },
            'user_department' => function () {
                return $this->user ? $this->user->department : null;
            },
            'date',
            'check_in',
            'check_out',
            'status',
            'status_label' => function () {
                return ucfirst(str_replace('_', ' ', $this->status));
            },
            'leave_type',
            'overtime_hours',
            'working_hours' => function () {
                return $this->getWorkingHours();
            },
            'is_late' => function () {
                return $this->isLate();
            },
            'notes',
            'marked_by',
            'marked_by_name' => function () {
                return $this->markedByUser ? $this->markedByUser->full_name : null;
            },
            'created_at',
            'updated_at',
        ];
    }

    /**
     * Get status options for dropdown
     */
    public static function getStatusOptions()
    {
        return [
            self::STATUS_PRESENT => 'Present',
            self::STATUS_ABSENT => 'Absent',
            self::STATUS_HALF_DAY => 'Half Day',
            self::STATUS_LATE => 'Late',
            self::STATUS_LEAVE => 'Leave',
            self::STATUS_HOLIDAY => 'Holiday',
        ];
    }

    /**
     * Get leave type options
     */
    public static function getLeaveTypeOptions()
    {
        return [
            self::LEAVE_CASUAL => 'Casual Leave',
            self::LEAVE_SICK => 'Sick Leave',
            self::LEAVE_EARNED => 'Earned Leave',
            self::LEAVE_UNPAID => 'Unpaid Leave',
        ];
    }
}