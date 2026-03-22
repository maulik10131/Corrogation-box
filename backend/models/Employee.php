<?php

namespace app\models;

use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

class Employee extends ActiveRecord
{
    public static function tableName()
    {
        return 'employees';
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
            [['name', 'employee_code', 'department', 'designation', 'phone', 'joining_date'], 'required'],
            [['salary'], 'number'],
            [['status'], 'integer'],
            [['joining_date'], 'date', 'format' => 'php:Y-m-d'],
            [['name', 'department', 'designation', 'email'], 'string', 'max' => 255],
            [['employee_code', 'phone'], 'string', 'max' => 20],
            [['employee_code'], 'unique'],
            [['email'], 'email'],
        ];
    }

    public function fields()
    {
        return [
            'id',
            'name',
            'employee_code',
            'department',
            'designation',
            'phone',
            'email',
            'joining_date',
            'salary',
            'status',
            'created_at',
        ];
    }
}
