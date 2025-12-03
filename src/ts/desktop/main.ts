export type SettingValue = string | {} | []

/**
 * メイン処理
 */
(function (PLUGIN_ID) {
    'use strict';

    if (PLUGIN_ID == undefined) {
        throw new Error('PLUGIN_ID == undefined で呼び出されました。')
    }
    const conf = kintone.plugin.app.getConfig(PLUGIN_ID)
    const settingData = JSON.parse(conf["config"]);
    // const settingJson = JSON.parse(settingData["field_setting_data"]);

    const pluginName = settingData['field_plugin_name'] || "汎用設定プラグイン";

    const message = `実行中...[ ${pluginName} ]
PLUGIN_ID: [ ${PLUGIN_ID} ]

    kintoneのJavaScriptカスタマイズコードの中から、汎用設定プラグインに格納したJSONを取得して利用できます。
    JavaScript APIの kintone.plugin.app.getConfig() メソッドで取得します。

    情報の取得例: 
        const conf = kintone.plugin.app.getConfig("${PLUGIN_ID}")
        const settingData = JSON.parse(conf["config"]);
        const settingJson = JSON.parse(settingData["field_setting_data"]);
`;

    console.info(message);


})(kintone.$PLUGIN_ID);
