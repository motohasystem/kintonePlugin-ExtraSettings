import { ConfigManager } from "plugin-parameters-helper";
import { Settings } from "./settings";
import { ConfigMigrator } from "kintoneplugin-config-migrator";
import { CONSTANTS } from "../constants";

(function (PLUGIN_ID: string | undefined) {
    'use strict';
    console.info('run config main')

    if (PLUGIN_ID == undefined) {
        throw new Error('PLUGIN_ID == undefined で呼び出されました。')
    }

    const setting_prefs = Settings.preference
    const setting_input = Settings.input
    const manager = new ConfigManager(PLUGIN_ID, setting_input, setting_prefs)
    manager.build()

    const migrator = new ConfigMigrator(PLUGIN_ID)
    migrator.put_forms('config_body')

    // 自動バリデーション
    // 1秒遅れて実行する
    setTimeout(() => {
        enableAutoValidation('multiline-' + CONSTANTS.FIELD_SETTING_DATA)
    }, 1000)

})(kintone.$PLUGIN_ID);


// 設定値の自動バリデーションを有効にする
// 設定値のフォーカスが外れた時点で、JSON / XML / TOML / YAML / INI / CSV の形式チェックを自動的に行い、
// 適合するフォーマット形式を表示する。どの形式にも適合しない場合は、テキストデータであることを示す。
function enableAutoValidation(FIELD_SETTING_DATA: string) {
    const inputElem = document.querySelector(`textarea[id="${FIELD_SETTING_DATA}"]`) as HTMLTextAreaElement
    if (!inputElem) {
        console.warn(`enableAutoValidation: 指定されたフィールドコードの要素が見つかりません。FIELD_SETTING_DATA=${FIELD_SETTING_DATA}`)
        return
    }

    inputElem.addEventListener('blur', (_event) => {
        const value = inputElem.value.trim()
        const format = detectFormat(value)

        // 結果表示
        const messageElemId = `${FIELD_SETTING_DATA}_format_message`
        let messageElem = document.getElementById(messageElemId)
        if (!messageElem) {
            messageElem = document.createElement('div')
            messageElem.id = messageElemId
            inputElem.parentNode?.insertBefore(messageElem, inputElem.nextSibling)
        }

        if (format === 'JSON' || format === 'YAML' || format === 'INI' || format === 'XML' || format === 'TOML') {
            messageElem.textContent = `検出された形式: ${format}`
            messageElem.style.color = 'green'
        } else if (format === 'CSV?') {
            messageElem.textContent = `検出された形式: ${format}`
            messageElem.style.color = 'orange'
        } else {
            messageElem.textContent = `検出された形式: テキストデータ`
            messageElem.style.color = 'gray'
        }
    })
}

// 入力値の形式を検出する
// JSON → XML → TOML → YAML → INI → CSV → TEXT の順でチェック
// どれにもマッチしない場合は'TEXT'を返す
function detectFormat(value: string): 'JSON' | 'XML' | 'TOML' | 'YAML' | 'INI' | 'CSV?' | 'TEXT' {
    if (!value) {
        return 'TEXT'
    }

    // JSON形式チェック（厳密なパース）
    try {
        JSON.parse(value)
        return 'JSON'
    } catch (e) {
        // JSONではない
    }

    // XML形式チェック
    // - <?xml 宣言で始まる
    // - <tag>...</tag> パターンが含まれる
    const xmlDeclaration = /^<\?xml\s+/
    const xmlTag = /<([a-zA-Z_][a-zA-Z0-9_-]*)[^>]*>[\s\S]*<\/\1>/
    if (xmlDeclaration.test(value) || xmlTag.test(value)) {
        return 'XML'
    }

    // TOML形式チェック（INIより先にチェック）
    // - [section] + key = "value" (引用符付き値)
    const tomlSection = /^\s*\[[^\]]+\]\s*$/m
    const tomlKeyQuotedValue = /^[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*["'].+["']$/m
    if (tomlSection.test(value) && tomlKeyQuotedValue.test(value)) {
        return 'TOML'
    }

    // YAML形式チェック（パターンマッチ）
    // - "---" で始まるYAMLドキュメント
    // - "key: value" 形式の行が含まれる
    const yamlDocumentStart = /^---\s*$/m
    const yamlKeyValue = /^[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*.+$/m
    const yamlListItem = /^\s*-\s+.+$/m
    if (yamlDocumentStart.test(value) || yamlKeyValue.test(value) || yamlListItem.test(value)) {
        return 'YAML'
    }

    // INI形式チェック（パターンマッチ）
    // - [section] 形式のセクションヘッダー
    // - key=value 形式のエントリ
    const iniSection = /^\s*\[[^\]]+\]\s*$/m
    const iniKeyValue = /^[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*.+$/m
    if (iniSection.test(value) || iniKeyValue.test(value)) {
        return 'INI'
    }

    // CSV形式チェック（曖昧なのでCSV?として返す）
    // - 複数行あり、各行にカンマが含まれる
    // - 各行のカンマ数が一致している
    const lines = value.split('\n').filter(line => line.trim() !== '')
    if (lines.length >= 2) {
        const commaCountFirst = (lines[0].match(/,/g) || []).length
        if (commaCountFirst > 0) {
            const allLinesHaveSameCommaCount = lines.every(line => {
                const count = (line.match(/,/g) || []).length
                return count === commaCountFirst
            })
            if (allLinesHaveSameCommaCount) {
                return 'CSV?'
            }
        }
    }

    return 'TEXT'
}

