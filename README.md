# 汎用J型設定プラグイン (General-Purpose JSON Config Plugin)

kintoneアプリに任意のJSON設定を保存し、JavaScriptカスタマイズから取得できる開発者向けプラグインです。

## 概要

このプラグインは、kintoneプラグインの設定ストレージを活用して、任意のJSON形式の設定データを保存・取得できるようにします。JavaScriptカスタマイズを開発する際に、設定値をハードコーディングせずに外部化したい場合に便利です。

## 機能

- プラグイン設定画面から任意のJSONを登録
- 登録したJSONをJavaScriptカスタマイズから `kintone.plugin.app.getConfig()` で取得
- 複数のアプリで異なる設定を使い分け可能

## インストール

1. [Releases](../../releases) から最新の `plugin_prod.zip` をダウンロード
2. kintoneシステム管理 > プラグイン からプラグインを追加
3. 利用するアプリの設定 > プラグイン から本プラグインを追加

## 使い方

### 1. プラグインの設定

1. アプリの設定 > プラグイン > 汎用J型設定プラグイン の設定アイコンをクリック
2. **タイトル**: 識別用のタイトルを入力（例：「API設定」「表示オプション」）
3. **設定JSON**: 保存したいJSON形式のデータを入力
4. 「保存」をクリック

### 2. JavaScriptカスタマイズからの取得

```javascript
(function() {
    'use strict';

    // プラグインIDを指定して設定を取得
    const PLUGIN_ID = 'xxxxxxxxxxxxxxxx'; // プラグインIDを指定
    const conf = kintone.plugin.app.getConfig(PLUGIN_ID);

    // 設定データをパース
    const settingData = JSON.parse(conf['config']);

    // タイトルを取得
    const pluginName = settingData['field_plugin_name'];

    // 設定JSONを取得
    const settingJson = JSON.parse(settingData['field_setting_data']);

    console.log('プラグインタイトル:', pluginName);
    console.log('設定JSON:', settingJson);

    // settingJson を使って処理を実行
    // 例: settingJson.apiEndpoint, settingJson.options など

})();
```

### 3. プラグインIDの確認方法

プラグインを適用したアプリを開くと、ブラウザのコンソールに以下のようなメッセージが表示されます：

```
実行中...[ 汎用J型設定プラグイン ]
PLUGIN_ID: [ xxxxxxxxxxxxxxxx ]
```

このPLUGIN_IDをJavaScriptカスタマイズで使用してください。

## 設定JSONの例

```json
{
    "apiEndpoint": "https://api.example.com/v1",
    "timeout": 30000,
    "options": {
        "retry": 3,
        "debug": false
    },
    "fieldMapping": {
        "name": "顧客名",
        "email": "メールアドレス"
    }
}
```

## ライセンス

MIT License

## 開発元

[キン担ラボ](https://www.monosus.co.jp/solutions/web-digital/dx/kintanlab)
