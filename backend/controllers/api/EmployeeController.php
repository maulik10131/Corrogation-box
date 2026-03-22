<?php

namespace app\controllers\api;

use Yii;
use yii\web\Controller;
use yii\web\Response;
use yii\web\NotFoundHttpException;
use app\models\Employee;

class EmployeeController extends Controller
{
    public $enableCsrfValidation = false;

    public function beforeAction($action)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        return parent::beforeAction($action);
    }

    public function actionIndex()
    {
        $query = Employee::find();
        $search = Yii::$app->request->get('search');
        $status = Yii::$app->request->get('status');

        if (!empty($search)) {
            $query->andWhere([
                'or',
                ['like', 'name', $search],
                ['like', 'employee_code', $search],
                ['like', 'department', $search],
                ['like', 'designation', $search],
            ]);
        }

        if ($status !== null && $status !== '') {
            $query->andWhere(['status' => (int) $status]);
        }

        $employees = $query->orderBy(['created_at' => SORT_DESC])->all();

        return [
            'success' => true,
            'data' => $employees,
        ];
    }

    public function actionView($id)
    {
        return [
            'success' => true,
            'data' => $this->findModel($id),
        ];
    }

    public function actionCreate()
    {
        $model = new Employee();
        $body = Yii::$app->request->bodyParams;

        $model->load($body, '');
        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Employee created successfully',
                'data' => $model,
            ];
        }

        Yii::$app->response->statusCode = 422;
        return [
            'success' => false,
            'errors' => $model->errors,
        ];
    }

    public function actionUpdate($id)
    {
        $model = $this->findModel($id);
        $body = Yii::$app->request->bodyParams;

        $model->load($body, '');
        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Employee updated successfully',
                'data' => $model,
            ];
        }

        Yii::$app->response->statusCode = 422;
        return [
            'success' => false,
            'errors' => $model->errors,
        ];
    }

    public function actionDelete($id)
    {
        $model = $this->findModel($id);
        $model->delete();

        return [
            'success' => true,
            'message' => 'Employee deleted successfully',
        ];
    }

    protected function findModel($id)
    {
        $model = Employee::findOne((int) $id);
        if (!$model) {
            throw new NotFoundHttpException('Employee not found');
        }

        return $model;
    }
}
