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
        const fieldId = 'multiline-' + CONSTANTS.FIELD_SETTING_DATA
        enableAutoValidation(fieldId)
        enableFileDropImport(fieldId)
        setupValueEditor(fieldId)
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

// 設定JSONテキストエリアへのファイルドラッグ&ドロップを有効化する。
// 対応拡張子: json / yaml / yml / txt / ini
function enableFileDropImport(FIELD_SETTING_DATA: string) {
    const inputElem = document.querySelector(`textarea[id="${FIELD_SETTING_DATA}"]`) as HTMLTextAreaElement
    if (!inputElem) {
        console.warn(`enableFileDropImport: 指定されたフィールドコードの要素が見つかりません。FIELD_SETTING_DATA=${FIELD_SETTING_DATA}`)
        return
    }

    const allowedExtensions = new Set(['json', 'yaml', 'yml', 'txt', 'ini'])
    const activeClassName = 'drop-import-target-active'

    const showDropMessage = (message: string, color: string) => {
        const messageElemId = `${FIELD_SETTING_DATA}_drop_message`
        let messageElem = document.getElementById(messageElemId)
        if (!messageElem) {
            messageElem = document.createElement('div')
            messageElem.id = messageElemId
            inputElem.parentNode?.insertBefore(messageElem, inputElem.nextSibling)
        }
        messageElem.textContent = message
        messageElem.style.color = color
    }

    const preventDefault = (event: DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
    }

    inputElem.addEventListener('dragenter', (event) => {
        preventDefault(event)
        inputElem.classList.add(activeClassName)
    })

    inputElem.addEventListener('dragover', (event) => {
        preventDefault(event)
        inputElem.classList.add(activeClassName)
    })

    inputElem.addEventListener('dragleave', (event) => {
        preventDefault(event)
        inputElem.classList.remove(activeClassName)
    })

    inputElem.addEventListener('drop', (event) => {
        preventDefault(event)
        inputElem.classList.remove(activeClassName)

        const file = event.dataTransfer?.files?.[0]
        if (!file) {
            return
        }

        const extension = file.name.split('.').pop()?.toLowerCase() || ''
        if (!allowedExtensions.has(extension)) {
            showDropMessage(`対応外のファイル形式です: ${file.name}（json / yaml / txt / ini を使用してください）`, 'red')
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            const value = typeof reader.result === 'string' ? reader.result : ''
            inputElem.value = value
            inputElem.dispatchEvent(new Event('input', { bubbles: true }))
            inputElem.dispatchEvent(new Event('change', { bubbles: true }))
            inputElem.dispatchEvent(new Event('blur'))
            showDropMessage(`ファイルを読み込みました: ${file.name}`, 'green')
        }
        reader.onerror = () => {
            showDropMessage(`ファイルの読み込みに失敗しました: ${file.name}`, 'red')
        }
        reader.readAsText(file, 'utf-8')
    })
}

type JsonPathSegment = string | number
type EditorScalarType = 'string' | 'number' | 'boolean' | 'null'

interface YamlEditorEntry {
    lineIndex: number
    pathSegments: JsonPathSegment[]
    scalarType: EditorScalarType
    value: string | number | boolean | null
    linePrefix: string
}

// JSON/YAML入力時に、値だけを編集できるGUIをテキストエリア下へ表示する。
function setupValueEditor(FIELD_SETTING_DATA: string) {
    const inputElem = document.querySelector(`textarea[id="${FIELD_SETTING_DATA}"]`) as HTMLTextAreaElement
    if (!inputElem) {
        console.warn(`setupValueEditor: 指定されたフィールドコードの要素が見つかりません。FIELD_SETTING_DATA=${FIELD_SETTING_DATA}`)
        return
    }

    const editorId = `${FIELD_SETTING_DATA}_value_editor`
    let editorElem = document.getElementById(editorId)
    if (!editorElem) {
        editorElem = document.createElement('div')
        editorElem.id = editorId
        editorElem.className = 'value-editor-container'
        inputElem.parentNode?.insertBefore(editorElem, inputElem.nextSibling)
    }

    let renderTimer: number | undefined
    const scheduleRender = () => {
        if (renderTimer) {
            window.clearTimeout(renderTimer)
        }
        renderTimer = window.setTimeout(() => {
            renderValueEditor(inputElem, editorElem as HTMLElement)
        }, 120)
    }

    inputElem.addEventListener('input', scheduleRender)
    inputElem.addEventListener('blur', scheduleRender)
    scheduleRender()
}

function renderValueEditor(inputElem: HTMLTextAreaElement, editorElem: HTMLElement) {
    const raw = inputElem.value || ''
    const format = detectFormat(raw.trim())

    editorElem.innerHTML = ''

    if (!raw.trim() || (format !== 'JSON' && format !== 'YAML')) {
        return
    }

    const titleElem = document.createElement('h4')
    titleElem.className = 'value-editor-title'
    titleElem.textContent = `値エディタ (${format})`
    editorElem.appendChild(titleElem)

    if (format === 'JSON') {
        renderJsonValueEditor(inputElem, editorElem, raw)
        return
    }

    renderYamlValueEditor(inputElem, editorElem, raw)
}

function renderJsonValueEditor(inputElem: HTMLTextAreaElement, editorElem: HTMLElement, raw: string) {
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch (_error) {
        appendEditorNotice(editorElem, 'JSONの解析に失敗したため、値エディタを表示できません。', 'red')
        return
    }

    const treeElem = document.createElement('div')
    treeElem.className = 'value-editor-tree'

    const applyLeafChange = (pathSegments: JsonPathSegment[], newValue: string | number | boolean | null) => {
        if (!pathSegments.length) {
            parsed = newValue
        } else {
            setJsonValueByPath(parsed, pathSegments, newValue)
        }
        inputElem.value = JSON.stringify(parsed, null, 2)
        inputElem.dispatchEvent(new Event('input', { bubbles: true }))
        inputElem.dispatchEvent(new Event('change', { bubbles: true }))
    }

    renderJsonTreeNode(treeElem, '$', [], parsed, 0, applyLeafChange)
    if (!treeElem.childElementCount) {
        appendEditorNotice(editorElem, '編集可能な値が見つかりません。', 'gray')
        return
    }
    editorElem.appendChild(treeElem)
}

function renderJsonTreeNode(
    parentElem: HTMLElement,
    label: string,
    pathSegments: JsonPathSegment[],
    nodeValue: unknown,
    depth: number,
    onLeafChange: (pathSegments: JsonPathSegment[], newValue: string | number | boolean | null) => void
) {
    if (isJsonScalar(nodeValue)) {
        const rowElem = createEditorRow(label, depth, detectScalarType(nodeValue), nodeValue, (newValue) => {
            onLeafChange(pathSegments, newValue)
        })
        parentElem.appendChild(rowElem)
        return
    }

    const groupElem = document.createElement('details')
    groupElem.className = 'value-editor-group'
    groupElem.open = depth <= 1

    const summaryElem = document.createElement('summary')
    summaryElem.className = 'value-editor-group-summary'
    summaryElem.textContent = formatJsonGroupLabel(label, nodeValue)
    summaryElem.style.paddingLeft = `${Math.max(0, depth) * 14}px`
    groupElem.appendChild(summaryElem)

    const childrenElem = document.createElement('div')
    childrenElem.className = 'value-editor-group-children'

    if (Array.isArray(nodeValue)) {
        if (!nodeValue.length) {
            const emptyElem = document.createElement('div')
            emptyElem.className = 'value-editor-empty'
            emptyElem.textContent = '(empty array)'
            childrenElem.appendChild(emptyElem)
        } else {
            nodeValue.forEach((item, index) => {
                renderJsonTreeNode(childrenElem, `[${index}]`, [...pathSegments, index], item, depth + 1, onLeafChange)
            })
        }
    } else if (nodeValue && typeof nodeValue === 'object') {
        const keys = Object.keys(nodeValue as Record<string, unknown>)
        if (!keys.length) {
            const emptyElem = document.createElement('div')
            emptyElem.className = 'value-editor-empty'
            emptyElem.textContent = '(empty object)'
            childrenElem.appendChild(emptyElem)
        } else {
            keys.forEach((key) => {
                renderJsonTreeNode(
                    childrenElem,
                    key,
                    [...pathSegments, key],
                    (nodeValue as Record<string, unknown>)[key],
                    depth + 1,
                    onLeafChange
                )
            })
        }
    }

    groupElem.appendChild(childrenElem)
    parentElem.appendChild(groupElem)
}

function formatJsonGroupLabel(label: string, nodeValue: unknown): string {
    if (Array.isArray(nodeValue)) {
        return `${label} [Array: ${nodeValue.length}]`
    }
    if (nodeValue && typeof nodeValue === 'object') {
        return `${label} [Object: ${Object.keys(nodeValue as Record<string, unknown>).length}]`
    }
    return label
}

function isJsonScalar(value: unknown): value is string | number | boolean | null {
    return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function renderYamlValueEditor(inputElem: HTMLTextAreaElement, editorElem: HTMLElement, raw: string) {
    const lines = raw.split(/\r?\n/)
    const entries = collectYamlEditorEntries(lines)

    if (!entries.length) {
        appendEditorNotice(editorElem, '編集可能なYAMLの値が見つかりません。', 'gray')
        return
    }

    const treeElem = document.createElement('div')
    treeElem.className = 'value-editor-tree'

    const rootNode = buildValueTree(entries)
    rootNode.children.forEach((childNode) => {
        renderYamlTreeNode(treeElem, childNode, 0, (entry, newValue) => {
            const serialized = serializeYamlScalar(newValue)
            lines[entry.lineIndex] = `${entry.linePrefix}${serialized}`
            inputElem.value = lines.join('\n')
            inputElem.dispatchEvent(new Event('input', { bubbles: true }))
            inputElem.dispatchEvent(new Event('change', { bubbles: true }))
        })
    })

    editorElem.appendChild(treeElem)
}

interface ValueTreeNode {
    segment: JsonPathSegment | null
    children: ValueTreeNode[]
    leafEntry?: YamlEditorEntry
}

function buildValueTree(entries: YamlEditorEntry[]): ValueTreeNode {
    const root: ValueTreeNode = { segment: null, children: [] }

    entries.forEach((entry) => {
        let cursor = root
        entry.pathSegments.forEach((segment, index) => {
            let child = cursor.children.find((node) => node.segment === segment)
            if (!child) {
                child = { segment, children: [] }
                cursor.children.push(child)
            }
            cursor = child

            if (index === entry.pathSegments.length - 1) {
                cursor.leafEntry = entry
            }
        })
    })

    return root
}

function renderYamlTreeNode(
    parentElem: HTMLElement,
    node: ValueTreeNode,
    depth: number,
    onLeafChange: (entry: YamlEditorEntry, newValue: string | number | boolean | null) => void
) {
    const label = formatPathSegmentLabel(node.segment)
    const leafEntry = node.leafEntry
    if (leafEntry && node.children.length === 0) {
        const rowElem = createEditorRow(label, depth, leafEntry.scalarType, leafEntry.value, (newValue) => {
            onLeafChange(leafEntry, newValue)
        })
        parentElem.appendChild(rowElem)
        return
    }

    const groupElem = document.createElement('details')
    groupElem.className = 'value-editor-group'
    groupElem.open = depth <= 1

    const summaryElem = document.createElement('summary')
    summaryElem.className = 'value-editor-group-summary'
    summaryElem.textContent = formatYamlGroupLabel(label, node)
    summaryElem.style.paddingLeft = `${Math.max(0, depth) * 14}px`
    groupElem.appendChild(summaryElem)

    const childrenElem = document.createElement('div')
    childrenElem.className = 'value-editor-group-children'
    node.children.forEach((childNode) => {
        renderYamlTreeNode(childrenElem, childNode, depth + 1, onLeafChange)
    })

    if (!node.children.length) {
        const emptyElem = document.createElement('div')
        emptyElem.className = 'value-editor-empty'
        emptyElem.textContent = '(empty)'
        childrenElem.appendChild(emptyElem)
    }

    groupElem.appendChild(childrenElem)
    parentElem.appendChild(groupElem)
}

function formatPathSegmentLabel(segment: JsonPathSegment | null): string {
    if (segment === null) {
        return '$'
    }
    if (typeof segment === 'number') {
        return `[${segment}]`
    }
    return segment
}

function formatYamlGroupLabel(label: string, node: ValueTreeNode): string {
    const hasIndexChild = node.children.some((child) => typeof child.segment === 'number')
    const kind = hasIndexChild ? 'Array' : 'Object'
    return `${label} [${kind}: ${node.children.length}]`
}

function appendEditorNotice(editorElem: HTMLElement, message: string, color: string) {
    const noteElem = document.createElement('div')
    noteElem.textContent = message
    noteElem.style.color = color
    editorElem.appendChild(noteElem)
}

function createEditorRow(
    label: string,
    depth: number,
    scalarType: EditorScalarType,
    value: string | number | boolean | null,
    onChange: (newValue: string | number | boolean | null) => void
): HTMLElement {
    const rowElem = document.createElement('div')
    rowElem.className = 'value-editor-row'

    const labelElem = document.createElement('label')
    labelElem.className = 'value-editor-label'
    labelElem.textContent = label
    labelElem.style.paddingLeft = `${Math.max(0, depth) * 14}px`
    rowElem.appendChild(labelElem)

    let controlElem: HTMLInputElement
    if (scalarType === 'boolean') {
        controlElem = document.createElement('input')
        controlElem.type = 'checkbox'
        controlElem.checked = value === true
        controlElem.addEventListener('change', () => {
            onChange(controlElem.checked)
        })
    } else {
        controlElem = document.createElement('input')
        controlElem.type = scalarType === 'number' ? 'number' : 'text'
        controlElem.className = 'value-editor-input'
        controlElem.value = value === null ? 'null' : String(value)
        controlElem.addEventListener('change', () => {
            onChange(castScalarValue(controlElem.value, scalarType))
        })
    }

    rowElem.appendChild(controlElem)
    return rowElem
}

function castScalarValue(rawValue: string, scalarType: EditorScalarType): string | number | boolean | null {
    if (scalarType === 'number') {
        const num = Number(rawValue)
        return Number.isFinite(num) ? num : 0
    }
    if (scalarType === 'boolean') {
        return rawValue.toLowerCase() === 'true'
    }
    if (scalarType === 'null') {
        return null
    }
    return rawValue
}

function detectScalarType(value: string | number | boolean | null): EditorScalarType {
    if (value === null) {
        return 'null'
    }
    if (typeof value === 'number') {
        return 'number'
    }
    if (typeof value === 'boolean') {
        return 'boolean'
    }
    return 'string'
}

function setJsonValueByPath(root: unknown, pathSegments: JsonPathSegment[], newValue: string | number | boolean | null) {
    if (!pathSegments.length) {
        return
    }

    let cursor: unknown = root
    for (let i = 0; i < pathSegments.length - 1; i += 1) {
        const segment = pathSegments[i]
        if (typeof segment === 'number') {
            cursor = (cursor as unknown[])[segment]
        } else {
            cursor = (cursor as Record<string, unknown>)[segment]
        }
    }

    const last = pathSegments[pathSegments.length - 1]
    if (typeof last === 'number') {
        (cursor as unknown[])[last] = newValue
    } else {
        (cursor as Record<string, unknown>)[last] = newValue
    }
}

function collectYamlEditorEntries(lines: string[]): YamlEditorEntry[] {
    const entries: YamlEditorEntry[] = []
    const containerStack: Array<{
        indent: number
        pathSegments: JsonPathSegment[]
        type: 'object' | 'array' | 'unknown'
        nextArrayIndex: number
    }> = [{ indent: -1, pathSegments: [], type: 'object', nextArrayIndex: 0 }]

    lines.forEach((line, lineIndex) => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#') || trimmed === '---' || trimmed === '...') {
            return
        }

        const indentMatch = line.match(/^(\s*)/)
        const lineIndent = indentMatch ? indentMatch[1] : ''
        const indentSpaces = lineIndent.length

        while (containerStack.length > 1 && containerStack[containerStack.length - 1].indent >= indentSpaces) {
            containerStack.pop()
        }

        const parent = containerStack[containerStack.length - 1]
        const isListItem = trimmed.startsWith('-')
        if (isListItem) {
            if (parent.type === 'unknown') {
                parent.type = 'array'
            }
        } else if (parent.type === 'unknown') {
            parent.type = 'object'
        }

        if (isListItem) {
            if (parent.type !== 'array') {
                parent.type = 'array'
            }

            const index = parent.nextArrayIndex
            parent.nextArrayIndex += 1
            const itemPath = [...parent.pathSegments, index]
            const itemContent = trimmed.slice(1).trim()

            if (!itemContent || itemContent === '|' || itemContent === '>') {
                containerStack.push({
                    indent: indentSpaces,
                    pathSegments: itemPath,
                    type: 'unknown',
                    nextArrayIndex: 0
                })
                return
            }

            const inlineMapMatch = itemContent.match(/^([^:#\n][^:]*)\s*:\s*(.*)$/)
            if (inlineMapMatch) {
                const key = inlineMapMatch[1].trim()
                const valuePart = inlineMapMatch[2]

                containerStack.push({
                    indent: indentSpaces,
                    pathSegments: itemPath,
                    type: 'object',
                    nextArrayIndex: 0
                })

                if (valuePart === '' || valuePart === '|' || valuePart === '>') {
                    containerStack.push({
                        indent: indentSpaces + 1,
                        pathSegments: [...itemPath, key],
                        type: 'unknown',
                        nextArrayIndex: 0
                    })
                    return
                }

                const parsed = parseYamlScalar(valuePart)
                entries.push({
                    lineIndex,
                    pathSegments: [...itemPath, key],
                    scalarType: parsed.scalarType,
                    value: parsed.value,
                    linePrefix: `${lineIndent}- ${key}: `
                })
                return
            }

            const parsed = parseYamlScalar(itemContent)
            entries.push({
                lineIndex,
                pathSegments: itemPath,
                scalarType: parsed.scalarType,
                value: parsed.value,
                linePrefix: `${lineIndent}- `
            })
            return
        }

        const mapMatch = trimmed.match(/^([^:#\n][^:]*)\s*:\s*(.*)$/)
        if (!mapMatch) {
            return
        }

        const key = mapMatch[1].trim()
        const valuePart = mapMatch[2]
        const keyPath = [...parent.pathSegments, key]

        if (valuePart === '' || valuePart === '|' || valuePart === '>') {
            containerStack.push({
                indent: indentSpaces,
                pathSegments: keyPath,
                type: 'unknown',
                nextArrayIndex: 0
            })
            return
        }

        const parsed = parseYamlScalar(valuePart)
        entries.push({
            lineIndex,
            pathSegments: keyPath,
            scalarType: parsed.scalarType,
            value: parsed.value,
            linePrefix: `${lineIndent}${key}: `
        })
    })

    return entries
}

function parseYamlScalar(raw: string): { scalarType: EditorScalarType; value: string | number | boolean | null } {
    const value = raw.trim()

    if (/^(true|false)$/i.test(value)) {
        return { scalarType: 'boolean', value: value.toLowerCase() === 'true' }
    }
    if (value === 'null' || value === '~') {
        return { scalarType: 'null', value: null }
    }
    if (/^[+-]?\d+(\.\d+)?$/.test(value)) {
        return { scalarType: 'number', value: Number(value) }
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return { scalarType: 'string', value: value.slice(1, -1) }
    }

    return { scalarType: 'string', value }
}

function serializeYamlScalar(value: string | number | boolean | null): string {
    if (value === null) {
        return 'null'
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false'
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? String(value) : '0'
    }

    const str = String(value)
    if (
        str === '' ||
        /^\s|\s$/.test(str) ||
        /[:#]/.test(str) ||
        /^(true|false|null|~)$/i.test(str) ||
        /^[+-]?\d+(\.\d+)?$/.test(str)
    ) {
        return `"${str.replace(/"/g, '\\"')}"`
    }
    return str
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
