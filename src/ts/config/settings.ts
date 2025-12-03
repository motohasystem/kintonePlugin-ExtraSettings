import { FieldType, KintoneConfigSetting, KintonePluginPreference } from "plugin-parameters-helper";
import { CONSTANTS } from "../constants";

// 設定項目に関する設定、デスクトップ側からも参照する。
export class Settings {
    // 設定項目の定義
    static preference: KintonePluginPreference = {
        'title': CONSTANTS.PLUGIN_NAME
        , 'description': CONSTANTS.PLUGIN_DESCRIPTION
    }

    static input: KintoneConfigSetting = [
        ///////////////////////////////
        // 汎用設定を構築する
        ///////////////////////////////
        {
            'label': '汎用設定を構築する'
            , 'desc': 'プラグインのタイトルと、設定JSONを登録してください。'
            , 'type': FieldType.Label
        }
        , {
            'label': 'タイトル'
            , 'desc': '表示用のプラグインタイトルを入力してください。'
            , 'code': CONSTANTS.FIELD_PLUGIN_NAME
            , 'type': FieldType.Text
            , 'required': true
        }
        // 設定用JSON
        , {
            'label': '設定JSON'
            , 'desc': 'プラグインの設定JSONを入力してください。'
            , 'code': CONSTANTS.FIELD_SETTING_DATA
            , 'type': FieldType.MultilineText
            , 'required': false
        }
        ///////////////////////////////
    ]
}
