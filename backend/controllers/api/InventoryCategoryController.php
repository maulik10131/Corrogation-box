<?php

namespace app\controllers\api;

use Yii;
use yii\web\Controller;
use yii\web\Response;
use yii\web\NotFoundHttpException;
use app\models\InventoryCategory;

class InventoryCategoryController extends Controller
{
    public $enableCsrfValidation = false;

    public function beforeAction($action)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        return parent::beforeAction($action);
    }

    public function actionIndex()
    {
        $categories = InventoryCategory::find()->orderBy(['name' => SORT_ASC])->all();
        return [
            'success' => true,
            'data' => $categories,
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
        $model = new InventoryCategory();
        $body = Yii::$app->request->bodyParams;

        $model->load($body, '');
        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Category created successfully',
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
                'message' => 'Category updated successfully',
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
            'message' => 'Category deleted successfully',
        ];
    }

    protected function findModel($id)
    {
        $model = InventoryCategory::findOne((int) $id);
        if (!$model) {
            throw new NotFoundHttpException('Category not found');
        }

        return $model;
    }
}
