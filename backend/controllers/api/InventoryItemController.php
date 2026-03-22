<?php

namespace app\controllers\api;

use Yii;
use yii\web\Controller;
use yii\web\Response;
use yii\web\NotFoundHttpException;
use app\models\InventoryItem;

class InventoryItemController extends Controller
{
    public $enableCsrfValidation = false;

    public function beforeAction($action)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        return parent::beforeAction($action);
    }

    public function actionIndex()
    {
        $query = InventoryItem::find();
        $search = Yii::$app->request->get('search');
        $status = Yii::$app->request->get('status');

        if (!empty($search)) {
            $query->andWhere([
                'or',
                ['like', 'name', $search],
                ['like', 'item_code', $search],
                ['like', 'category', $search],
            ]);
        }

        if ($status !== null && $status !== '') {
            $query->andWhere(['status' => (int) $status]);
        }

        $items = $query->orderBy(['created_at' => SORT_DESC])->all();

        return [
            'success' => true,
            'data' => $items,
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
        $model = new InventoryItem();
        $body = Yii::$app->request->bodyParams;

        $model->load($body, '');
        if ($model->save()) {
            return [
                'success' => true,
                'message' => 'Item created successfully',
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
                'message' => 'Item updated successfully',
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
            'message' => 'Item deleted successfully',
        ];
    }

    protected function findModel($id)
    {
        $model = InventoryItem::findOne((int) $id);
        if (!$model) {
            throw new NotFoundHttpException('Item not found');
        }

        return $model;
    }
}
