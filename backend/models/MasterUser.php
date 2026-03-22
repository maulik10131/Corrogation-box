<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;
use yii\web\IdentityInterface;

/**
 * MasterUser model - For authentication against master database
 * 
 * @property int $id
 * @property int $company_id
 * @property string $username
 * @property string $email
 * @property string $password_hash
 * @property string $full_name
 * @property int $is_super_admin
 * @property string $access_token
 * @property int $status
 * @property string $last_login
 * @property string $created_at
 * @property string $updated_at
 */
class MasterUser extends ActiveRecord implements IdentityInterface
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'master_users';
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
            [['company_id', 'username', 'email', 'password_hash'], 'required'],
            [['company_id', 'is_super_admin', 'status'], 'integer'],
            [['last_login', 'created_at', 'updated_at'], 'safe'],
            [['username', 'full_name'], 'string', 'max' => 100],
            [['email'], 'string', 'max' => 191],
            [['email'], 'email'],
            [['password_hash'], 'string', 'max' => 255],
            [['access_token'], 'string', 'max' => 100],
            ['status', 'default', 'value' => 1],
            ['is_super_admin', 'default', 'value' => 0],
        ];
    }

    /**
     * @inheritdoc
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'company_id' => 'Company ID',
            'username' => 'Username',
            'email' => 'Email',
            'password_hash' => 'Password Hash',
            'full_name' => 'Full Name',
            'is_super_admin' => 'Super Admin',
            'access_token' => 'Access Token',
            'status' => 'Status',
            'last_login' => 'Last Login',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];
    }

    /**
     * Get company relation
     */
    public function getCompany()
    {
        return $this->hasOne(Company::class, ['id' => 'company_id']);
    }

    /**
     * Finds an identity by the given ID.
     * @param string|int $id the ID to be looked for
     * @return IdentityInterface|null the identity object that matches the given ID.
     */
    public static function findIdentity($id)
    {
        return static::findOne(['id' => $id, 'status' => 1]);
    }

    /**
     * Finds an identity by the given token.
     * @param string $token the token to be looked for
     * @param mixed $type the type of the token. Not used in this implementation.
     * @return IdentityInterface|null the identity object that matches the given token.
     */
    public static function findIdentityByAccessToken($token, $type = null)
    {
        return static::findOne(['access_token' => $token, 'status' => 1]);
    }

    /**
     * Finds user by username
     * @param string $username
     * @return static|null
     */
    public static function findByUsername($username)
    {
        return static::findOne(['username' => $username, 'status' => 1]);
    }

    /**
     * Finds user by email
     * @param string $email
     * @return static|null
     */
    public static function findByEmail($email)
    {
        return static::findOne(['email' => $email, 'status' => 1]);
    }

    /**
     * Finds user by username or email
     * @param string $credential
     * @return static|null
     */
    public static function findByCredential($credential)
    {
        return static::find()
            ->where(['username' => $credential, 'status' => 1])
            ->orWhere(['email' => $credential, 'status' => 1])
            ->one();
    }

    /**
     * @inheritdoc
     */
    public function getId()
    {
        return $this->getPrimaryKey();
    }

    /**
     * @inheritdoc
     */
    public function getAuthKey()
    {
        return $this->access_token;
    }

    /**
     * @inheritdoc
     */
    public function validateAuthKey($authKey)
    {
        return $this->getAuthKey() === $authKey;
    }

    /**
     * Validates password
     * @param string $password password to validate
     * @return bool if password provided is valid for current user
     */
    public function validatePassword($password)
    {
        return Yii::$app->security->validatePassword($password, $this->password_hash);
    }

    /**
     * Generates password hash from password and sets it to the model
     * @param string $password
     */
    public function setPassword($password)
    {
        $this->password_hash = Yii::$app->security->generatePasswordHash($password);
    }

    /**
     * Generates "remember me" authentication key
     */
    public function generateAuthKey()
    {
        $this->access_token = Yii::$app->security->generateRandomString(40);
    }

    /**
     * Generate and save access token
     * @return bool
     */
    public function generateAccessToken()
    {
        $this->access_token = Yii::$app->security->generateRandomString(40);
        return $this->save(false, ['access_token']);
    }

    /**
     * Update last login timestamp
     */
    public function updateLastLogin()
    {
        $this->last_login = date('Y-m-d H:i:s');
        $this->save(false, ['last_login']);
    }

    /**
     * Get user info for API response
     * @return array
     */
    public function toArray(array $fields = [], array $expand = [], $recursive = true)
    {
        $data = parent::toArray($fields, $expand, $recursive);
        
        // Remove sensitive data
        unset($data['password_hash']);
        unset($data['access_token']);
        
        // Add company info if loaded
        if ($this->isRelationPopulated('company') && $this->company) {
            $data['company'] = [
                'id' => $this->company->id,
                'name' => $this->company->company_name,
                'code' => $this->company->company_code,
                'db_name' => $this->company->db_name,
            ];
        }
        
        return $data;
    }

    /**
     * Check if user is super admin
     * @return bool
     */
    public function isSuperAdmin()
    {
        return $this->is_super_admin == 1;
    }

    /**
     * Check if user is active
     * @return bool
     */
    public function isActive()
    {
        return $this->status == 1;
    }
}
