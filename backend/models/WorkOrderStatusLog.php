<?php

namespace app\models;

use yii\db\ActiveRecord;

class WorkOrderStatusLog extends ActiveRecord
{
    public static function tableName()
    {
        return 'work_order_status_logs';
    }

    public function rules()
    {
        return [
            [['work_order_id', 'to_status'], 'required'],
            [['work_order_id'], 'integer'],
            [['remarks'], 'string'],
            [['from_status', 'to_status'], 'string', 'max' => 50],
        ];
    }

    public function getWorkOrder()
    {
        return $this->hasOne(WorkOrder::class, ['id' => 'work_order_id']);
    }
}
