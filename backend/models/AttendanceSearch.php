<?php

namespace app\models;

use yii\base\Model;
use yii\data\ActiveDataProvider;

class AttendanceSearch extends Attendance
{
    public $user_name;
    public $department;
    public $from_date;
    public $to_date;
    public $month;
    public $year;

    public function rules()
    {
        return [
            [['id', 'user_id', 'marked_by'], 'integer'],
            [['date', 'check_in', 'check_out', 'status', 'leave_type', 'notes'], 'safe'],
            [['user_name', 'department', 'from_date', 'to_date'], 'safe'],
            [['month', 'year'], 'integer'],
            [['overtime_hours'], 'number'],
        ];
    }

    public function scenarios()
    {
        return Model::scenarios();
    }

    public function search($params)
    {
        $query = Attendance::find()->with(['user']);

        $dataProvider = new ActiveDataProvider([
            'query' => $query,
            'sort' => [
                'defaultOrder' => ['date' => SORT_DESC, 'id' => SORT_DESC],
            ],
            'pagination' => [
                'pageSize' => 50,
            ],
        ]);

        $this->load($params, '');

        if (!$this->validate()) {
            return $dataProvider;
        }

        // Filter by user_id
        $query->andFilterWhere(['attendance.user_id' => $this->user_id]);

        // Filter by status
        $query->andFilterWhere(['attendance.status' => $this->status]);

        // Filter by date
        $query->andFilterWhere(['attendance.date' => $this->date]);

        // Filter by date range
        if ($this->from_date) {
            $query->andWhere(['>=', 'attendance.date', $this->from_date]);
        }
        if ($this->to_date) {
            $query->andWhere(['<=', 'attendance.date', $this->to_date]);
        }

        // Filter by month/year
        if ($this->month) {
            $query->andWhere(['MONTH(attendance.date)' => $this->month]);
        }
        if ($this->year) {
            $query->andWhere(['YEAR(attendance.date)' => $this->year]);
        }

        // Filter by department (join with users)
        if ($this->department) {
            $query->joinWith('user');
            $query->andWhere(['users.department' => $this->department]);
        }

        // Filter by user name
        if ($this->user_name) {
            $query->joinWith('user');
            $query->andWhere(['like', 'users.full_name', $this->user_name]);
        }

        return $dataProvider;
    }
}