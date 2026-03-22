<?php

namespace app\models;

use yii\base\Model;
use yii\data\ActiveDataProvider;

class StockTransactionSearch extends StockTransaction
{
    public $material_name;
    public $supplier_name;
    public $from_date;
    public $to_date;
    public $category;

    public function rules()
    {
        return [
            [['id', 'material_id', 'supplier_id', 'created_by'], 'integer'],
            [['transaction_number', 'transaction_type', 'transaction_date', 'invoice_no', 'notes'], 'safe'],
            [['material_name', 'supplier_name', 'from_date', 'to_date', 'category'], 'safe'],
            [['quantity', 'rate', 'total_amount'], 'number'],
        ];
    }

    public function scenarios()
    {
        return Model::scenarios();
    }

    public function search($params)
    {
        $query = StockTransaction::find()
            ->with(['material', 'supplier', 'createdByUser']);

        $dataProvider = new ActiveDataProvider([
            'query' => $query,
            'sort' => [
                'defaultOrder' => ['transaction_date' => SORT_DESC, 'id' => SORT_DESC],
            ],
            'pagination' => [
                'pageSize' => 50,
            ],
        ]);

        $this->load($params, '');

        if (!$this->validate()) {
            return $dataProvider;
        }

        // Filters
        $query->andFilterWhere(['stock_transactions.material_id' => $this->material_id]);
        $query->andFilterWhere(['stock_transactions.supplier_id' => $this->supplier_id]);
        $query->andFilterWhere(['stock_transactions.transaction_type' => $this->transaction_type]);
        $query->andFilterWhere(['like', 'stock_transactions.transaction_number', $this->transaction_number]);
        $query->andFilterWhere(['like', 'stock_transactions.invoice_no', $this->invoice_no]);

        // Date range
        if ($this->from_date) {
            $query->andWhere(['>=', 'stock_transactions.transaction_date', $this->from_date]);
        }
        if ($this->to_date) {
            $query->andWhere(['<=', 'stock_transactions.transaction_date', $this->to_date]);
        }

        // Material name search
        if ($this->material_name) {
            $query->joinWith('material');
            $query->andWhere(['like', 'raw_materials.name', $this->material_name]);
        }

        // Category filter
        if ($this->category) {
            $query->joinWith('material');
            $query->andWhere(['raw_materials.category' => $this->category]);
        }

        return $dataProvider;
    }
}