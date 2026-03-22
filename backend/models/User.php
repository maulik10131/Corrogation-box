<?php

namespace app\models;

use yii\db\ActiveRecord;
use yii\web\IdentityInterface;

class User extends ActiveRecord implements IdentityInterface
{
    public static function tableName()
    {
        return 'users';
    }

    public function rules()
    {
        $rules = [
            [['username', 'email'], 'required'],
            [['username', 'email'], 'unique'],
            [['email'], 'email'],
            [['username'], 'string', 'max' => 255],
        ];

        if ($this->hasColumn('full_name')) {
            $rules[] = [['full_name'], 'string', 'max' => 255];
        }

        if ($this->hasColumn('phone')) {
            $rules[] = [['phone'], 'string', 'max' => 15];
        }

        if ($this->hasColumn('role')) {
            $rules[] = [['role'], 'in', 'range' => ['admin', 'manager', 'supervisor', 'operator', 'staff']];
        }

        if ($this->hasColumn('department')) {
            $rules[] = [['department'], 'in', 'range' => ['production', 'store', 'accounts', 'dispatch', 'admin']];
        }

        if ($this->hasColumn('salary')) {
            $rules[] = [['salary'], 'number'];
        }

        if ($this->hasColumn('status')) {
            $rules[] = [['status'], 'boolean'];
        }

        if ($this->hasColumn('access_token')) {
            $rules[] = [['access_token'], 'string', 'max' => 100];
            $rules[] = [['access_token'], 'safe'];
        }

        return $rules;
    }

    public function fields()
    {
        $fields = [
            'id',
            'username',
            'email',
        ];

        $optionalFields = ['full_name', 'phone', 'role', 'department', 'salary', 'status', 'created_at'];
        foreach ($optionalFields as $field) {
            if ($this->hasColumn($field)) {
                $fields[] = $field;
            }
        }

        return $fields;
    }

    // IdentityInterface methods
    public static function findIdentity($id)
    {
        return static::findOne($id);
    }

    public static function findIdentityByAccessToken($token, $type = null)
    {
        if (!static::hasStaticColumn('access_token')) {
            return null;
        }

        return static::findOne(['access_token' => $token]);
    }

    public static function findByUsername($username)
    {
        $query = static::find()->where(['username' => $username]);

        if (static::hasStaticColumn('status')) {
            $query->andWhere(['status' => 1]);
        }

        return $query->one();
    }

    public function getId()
    {
        return $this->id;
    }

    public function getAuthKey()
    {
        return $this->auth_key;
    }

    public function validateAuthKey($authKey)
    {
        return $this->auth_key === $authKey;
    }

    public function validatePassword($password)
    {
        return \Yii::$app->security->validatePassword($password, $this->password_hash);
    }

    public function setPassword($password)
    {
        $this->password_hash = \Yii::$app->security->generatePasswordHash($password);
    }

    public function getAttendances()
    {
        return $this->hasMany(Attendance::class, ['user_id' => 'id']);
    }

    private function hasColumn(string $column): bool
    {
        return static::hasStaticColumn($column);
    }

    private static function hasStaticColumn(string $column): bool
    {
        $schema = static::getTableSchema();
        return $schema !== null && isset($schema->columns[$column]);
    }
}