<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;

/**
 * Company model - Represents a company/tenant in master database
 * 
 * @property int $id
 * @property string $company_name
 * @property string $company_code
 * @property string $db_name
 * @property string $db_host
 * @property string $db_username
 * @property string $db_password
 * @property int $db_port
 * @property string $contact_person
 * @property string $email
 * @property string $phone
 * @property string $address
 * @property string $city
 * @property string $state
 * @property string $pincode
 * @property string $gst_number
 * @property string $plan_type
 * @property string $subscription_start
 * @property string $subscription_end
 * @property int $max_users
 * @property int $is_active
 * @property string $created_at
 * @property string $updated_at
 */
class Company extends ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'companies';
    }

    /**
     * Use master database connection
     */
    public static function getDb()
    {
        return Yii::$app->masterDb;
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['company_name', 'company_code', 'db_name'], 'required'],
            [['db_port', 'max_users', 'is_active'], 'integer'],
            [['address'], 'string'],
            [['subscription_start', 'subscription_end', 'created_at', 'updated_at'], 'safe'],
            [['company_name', 'contact_person'], 'string', 'max' => 255],
            [['company_code'], 'string', 'max' => 50],
            [['db_name', 'db_host', 'db_username'], 'string', 'max' => 100],
            [['db_password'], 'string', 'max' => 255],
            [['email'], 'string', 'max' => 191],
            [['email'], 'email'],
            [['phone'], 'string', 'max' => 20],
            [['city', 'state'], 'string', 'max' => 100],
            [['pincode'], 'string', 'max' => 10],
            [['gst_number'], 'string', 'max' => 20],
            [['plan_type'], 'in', 'range' => ['trial', 'basic', 'professional', 'enterprise']],
            ['is_active', 'default', 'value' => 1],
            ['max_users', 'default', 'value' => 5],
            ['db_port', 'default', 'value' => 3306],
            ['db_host', 'default', 'value' => 'localhost'],
            ['plan_type', 'default', 'value' => 'trial'],
        ];
    }

    /**
     * @inheritdoc
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'company_name' => 'Company Name',
            'company_code' => 'Company Code',
            'db_name' => 'Database Name',
            'db_host' => 'Database Host',
            'db_username' => 'Database Username',
            'db_password' => 'Database Password',
            'db_port' => 'Database Port',
            'contact_person' => 'Contact Person',
            'email' => 'Email',
            'phone' => 'Phone',
            'address' => 'Address',
            'city' => 'City',
            'state' => 'State',
            'pincode' => 'Pincode',
            'gst_number' => 'GST Number',
            'plan_type' => 'Plan Type',
            'subscription_start' => 'Subscription Start',
            'subscription_end' => 'Subscription End',
            'max_users' => 'Max Users',
            'is_active' => 'Active',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];
    }

    /**
     * Get users relation
     */
    public function getUsers()
    {
        return $this->hasMany(MasterUser::class, ['company_id' => 'id']);
    }

    /**
     * Check if company is active
     * @return bool
     */
    public function isActive()
    {
        return $this->is_active == 1;
    }

    /**
     * Check if subscription is valid
     * @return bool
     */
    public function hasValidSubscription()
    {
        if (!$this->subscription_end) {
            return true; // No end date means perpetual
        }
        
        return strtotime($this->subscription_end) >= time();
    }

    /**
     * Get days until subscription expires
     * @return int|null
     */
    public function getDaysUntilExpiry()
    {
        if (!$this->subscription_end) {
            return null;
        }
        
        $now = time();
        $end = strtotime($this->subscription_end);
        $diff = $end - $now;
        
        return ceil($diff / 86400); // Convert seconds to days
    }

    /**
     * Get company info for API response
     * @return array
     */
    public function toArray(array $fields = [], array $expand = [], $recursive = true)
    {
        $data = parent::toArray($fields, $expand, $recursive);
        
        // Remove sensitive data
        unset($data['db_username']);
        unset($data['db_password']);
        
        return $data;
    }

    /**
     * Before save - auto-generate db_name from company_code
     */
    public function beforeSave($insert)
    {
        if (parent::beforeSave($insert)) {
            if ($insert && empty($this->db_name)) {
                $this->db_name = 'pms_' . strtolower($this->company_code);
            }
            return true;
        }
        return false;
    }
}
