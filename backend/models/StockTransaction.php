<?php

namespace app\models;

use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;
use Yii;

class StockTransaction extends ActiveRecord
{
    // Transaction Types
    const TYPE_PURCHASE = 'purchase';
    const TYPE_PURCHASE_RETURN = 'purchase_return';
    const TYPE_PRODUCTION_ISSUE = 'production_issue';
    const TYPE_PRODUCTION_RETURN = 'production_return';
    const TYPE_ADJUSTMENT_IN = 'adjustment_in';
    const TYPE_ADJUSTMENT_OUT = 'adjustment_out';
    const TYPE_WASTAGE = 'wastage';
    const TYPE_TRANSFER = 'transfer';

    public static function tableName()
    {
        return 'stock_transactions';
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
            [['material_id', 'transaction_type', 'quantity', 'transaction_date'], 'required'],
            [['material_id', 'supplier_id', 'reference_id', 'created_by', 'approved_by'], 'integer'],
            [['quantity', 'previous_stock', 'current_stock', 'rate', 'total_amount'], 'number'],
            [['quantity'], 'number', 'min' => 0.01],
            [['transaction_type'], 'in', 'range' => array_keys(self::getTypeOptions())],
            [['transaction_date', 'invoice_date', 'approved_at'], 'safe'],
            [['transaction_number', 'reference_number', 'invoice_no', 'challan_no', 'batch_no'], 'string', 'max' => 100],
            [['vehicle_no', 'reference_type'], 'string', 'max' => 50],
            [['notes'], 'string'],
            [['transaction_number'], 'unique'],
            [['material_id'], 'exist', 'targetClass' => RawMaterial::class, 'targetAttribute' => 'id'],
            [['supplier_id'], 'exist', 'targetClass' => Supplier::class, 'targetAttribute' => 'id'],
        ];
    }

    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'transaction_number' => 'Transaction No.',
            'material_id' => 'Material',
            'transaction_type' => 'Type',
            'quantity' => 'Quantity',
            'rate' => 'Rate',
            'total_amount' => 'Total Amount',
            'supplier_id' => 'Supplier',
            'invoice_no' => 'Invoice No.',
        ];
    }

    public function fields()
    {
        return [
            'id',
            'transaction_number',
            'material_id',
            'material_name' => function () {
                return $this->material ? $this->material->name : null;
            },
            'material_code' => function () {
                return $this->material ? $this->material->code : null;
            },
            'material_unit' => function () {
                return $this->material ? $this->material->unit : null;
            },
            'transaction_type',
            'type_label' => function () {
                return self::getTypeOptions()[$this->transaction_type] ?? $this->transaction_type;
            },
            'is_inward' => function () {
                return $this->isInward();
            },
            'transaction_date',
            'quantity',
            'previous_stock',
            'current_stock',
            'rate',
            'total_amount',
            'reference_type',
            'reference_id',
            'reference_number',
            'supplier_id',
            'supplier_name' => function () {
                return $this->supplier ? $this->supplier->name : null;
            },
            'invoice_no',
            'invoice_date',
            'challan_no',
            'vehicle_no',
            'batch_no',
            'notes',
            'created_by',
            'created_by_name' => function () {
                return $this->createdByUser ? $this->createdByUser->full_name : null;
            },
            'approved_by',
            'approved_at',
            'created_at',
        ];
    }

    public static function getTypeOptions()
    {
        return [
            self::TYPE_PURCHASE => 'Purchase (In)',
            self::TYPE_PURCHASE_RETURN => 'Purchase Return (Out)',
            self::TYPE_PRODUCTION_ISSUE => 'Production Issue (Out)',
            self::TYPE_PRODUCTION_RETURN => 'Production Return (In)',
            self::TYPE_ADJUSTMENT_IN => 'Stock Adjustment (In)',
            self::TYPE_ADJUSTMENT_OUT => 'Stock Adjustment (Out)',
            self::TYPE_WASTAGE => 'Wastage (Out)',
            self::TYPE_TRANSFER => 'Transfer',
        ];
    }

    public static function getInwardTypes()
    {
        return [
            self::TYPE_PURCHASE,
            self::TYPE_PRODUCTION_RETURN,
            self::TYPE_ADJUSTMENT_IN,
        ];
    }

    public static function getOutwardTypes()
    {
        return [
            self::TYPE_PURCHASE_RETURN,
            self::TYPE_PRODUCTION_ISSUE,
            self::TYPE_ADJUSTMENT_OUT,
            self::TYPE_WASTAGE,
        ];
    }

    public function isInward()
    {
        return in_array($this->transaction_type, self::getInwardTypes());
    }

    public function getMaterial()
    {
        return $this->hasOne(RawMaterial::class, ['id' => 'material_id']);
    }

    public function getSupplier()
    {
        return $this->hasOne(Supplier::class, ['id' => 'supplier_id']);
    }

    public function getCreatedByUser()
    {
        return $this->hasOne(User::class, ['id' => 'created_by']);
    }

    public function getApprovedByUser()
    {
        return $this->hasOne(User::class, ['id' => 'approved_by']);
    }

    public function beforeSave($insert)
    {
        if (parent::beforeSave($insert)) {
            // Generate transaction number
            if ($insert && empty($this->transaction_number)) {
                $prefix = $this->isInward() ? 'IN' : 'OUT';
                $date = date('Ymd');
                $lastTxn = self::find()
                    ->where(['like', 'transaction_number', "$prefix-$date-", false])
                    ->orderBy(['id' => SORT_DESC])
                    ->one();
                
                $sequence = 1;
                if ($lastTxn) {
                    $parts = explode('-', $lastTxn->transaction_number);
                    $sequence = (int) end($parts) + 1;
                }
                $this->transaction_number = sprintf('%s-%s-%04d', $prefix, $date, $sequence);
            }

            // Calculate total amount
            $this->total_amount = round($this->quantity * $this->rate, 2);

            return true;
        }
        return false;
    }

    public function afterSave($insert, $changedAttributes)
    {
        parent::afterSave($insert, $changedAttributes);

        // Update material stock
        if ($insert) {
            $material = $this->material;
            if ($material) {
                $type = $this->isInward() ? 'in' : 'out';
                $material->updateStock($this->quantity, $type, $this->rate);
            }
        }
    }

    /**
     * Generate transaction with stock update
     */
    public static function createTransaction($data)
    {
        $transaction = Yii::$app->db->beginTransaction();
        
        try {
            $model = new self();
            $model->load($data, '');
            
            // Get current stock
            $material = RawMaterial::findOne($model->material_id);
            if (!$material) {
                throw new \Exception('Material not found');
            }

            $model->previous_stock = $material->current_stock;
            
            // Check if sufficient stock for outward
            if (!$model->isInward() && $material->current_stock < $model->quantity) {
                throw new \Exception('Insufficient stock. Available: ' . $material->current_stock . ' ' . $material->unit);
            }

            // Calculate new stock
            if ($model->isInward()) {
                $model->current_stock = $material->current_stock + $model->quantity;
            } else {
                $model->current_stock = $material->current_stock - $model->quantity;
            }

            if (!$model->save()) {
                throw new \Exception(json_encode($model->errors));
            }

            $transaction->commit();
            return ['success' => true, 'data' => $model];
            
        } catch (\Exception $e) {
            $transaction->rollBack();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}