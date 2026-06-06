import {
  QualityControlRules,
  PreCheckConfig,
  DEFAULT_QC_RULES,
  DEFAULT_PRE_CHECK_CONFIG,
  SCHEME_DRAFT_SCHEMA_VERSION,
  SchemeDraft,
  RuleConflict,
  RuleConflictSeverity,
  ImportValidationIssue,
  ImportValidationResult,
  ImportValidationIssueCode,
  AnomalyType,
} from '@/types'
import { generateId } from './helpers'

const QC_RULE_FIELDS: Array<{ key: keyof QualityControlRules; label: string; numeric: boolean; higherIsLooser?: boolean }> = [
  { key: 'overdueVisitDaysThreshold', label: '逾期未访阈值', numeric: true, higherIsLooser: true },
  { key: 'unplannedVisitWindowDays', label: '未预约匹配窗口', numeric: true, higherIsLooser: true },
  { key: 'bloodPressureSystolicMax', label: '收缩压上限', numeric: true, higherIsLooser: true },
  { key: 'bloodPressureSystolicMin', label: '收缩压下限', numeric: true, higherIsLooser: false },
  { key: 'bloodPressureDiastolicMax', label: '舒张压上限', numeric: true, higherIsLooser: true },
  { key: 'bloodPressureDiastolicMin', label: '舒张压下限', numeric: true, higherIsLooser: false },
  { key: 'bloodGlucoseMax', label: '血糖上限', numeric: true, higherIsLooser: true },
  { key: 'bloodGlucoseMin', label: '血糖下限', numeric: true, higherIsLooser: false },
  { key: 'enabled', label: '规则启用开关', numeric: false },
  { key: 'homeVisitStatusMappings', label: '上门状态映射', numeric: false },
]

const REQUIRED_DRAFT_FIELDS = [
  'draftId',
  'name',
  'qcRules',
  'preCheckConfig',
  'schemaVersion',
  'createdAt',
  'createdBy',
  'updatedAt',
]

const REQUIRED_QC_RULE_FIELDS: Array<keyof QualityControlRules> = [
  'overdueVisitDaysThreshold',
  'unplannedVisitWindowDays',
  'bloodPressureSystolicMax',
  'bloodPressureDiastolicMax',
  'bloodGlucoseMax',
  'bloodPressureSystolicMin',
  'bloodPressureDiastolicMin',
  'bloodGlucoseMin',
  'homeVisitStatusMappings',
  'enabled',
]

const REQUIRED_PRECHECK_FIELDS: Array<keyof PreCheckConfig> = [
  'maxDisplayIssues',
  'allowWarningContinue',
]

export function compareNumericRule(
  field: string,
  label: string,
  oldVal: number,
  newVal: number,
  higherIsLooser: boolean
): RuleConflict | null {
  if (oldVal === newVal) return null
  let severity: RuleConflictSeverity = 'different'
  let suggestion = ''
  if (higherIsLooser) {
    if (newVal > oldVal) {
      severity = 'looser'
      suggestion = `阈值从 ${oldVal} 放宽到 ${newVal}，识别条件过宽，可能减少异常数。如要收紧请将值调低。`
    } else {
      severity = 'stricter'
      suggestion = `阈值从 ${oldVal} 收紧到 ${newVal}，识别条件过严，可能增加异常数。如要放宽请将值调高。`
    }
  } else {
    if (newVal < oldVal) {
      severity = 'looser'
      suggestion = `下限从 ${oldVal} 放宽到 ${newVal}，识别条件过宽，可能减少异常数。如要收紧请将值调高。`
    } else {
      severity = 'stricter'
      suggestion = `下限从 ${oldVal} 收紧到 ${newVal}，识别条件过严，可能增加异常数。如要放宽请将值调低。`
    }
  }
  return { field, label: label, oldValue: oldVal, newValue: newVal, severity, suggestion }
}

export function detectRuleConflicts(
  oldRules: QualityControlRules,
  newRules: QualityControlRules
): RuleConflict[] {
  const conflicts: RuleConflict[] = []
  QC_RULE_FIELDS.forEach(({ key, label, numeric, higherIsLooser }) => {
    const oldVal = oldRules[key]
    const newVal = newRules[key]
    if (numeric && typeof oldVal === 'number' && typeof newVal === 'number' && higherIsLooser !== undefined) {
      const c = compareNumericRule(key as string, label, oldVal, newVal, higherIsLooser)
      if (c) conflicts.push(c)
    } else if (key === 'enabled') {
      if (oldVal !== newVal) {
        conflicts.push({
          field: key as string,
          label: label,
          oldValue: oldVal,
          newValue: newVal,
          severity: newVal ? 'looser' : 'stricter',
          suggestion: newVal
            ? '启用质控规则，将识别逾期未访、未预约到访、指标越界三类异常。如要停用请关闭开关。'
            : '停用质控规则，仅识别重复随访和居民不在名册两类异常。如要完整识别请开启开关。',
        })
      }
    } else if (key === 'homeVisitStatusMappings') {
      const oldArr = oldVal as AnomalyType[]
      const newArr = newVal as AnomalyType[]
      const oldSet = new Set(oldArr)
      const newSet = new Set(newArr)
      const added = newArr.filter(t => !oldSet.has(t))
      const removed = oldArr.filter(t => !newSet.has(t))
      if (added.length > 0 || removed.length > 0) {
        conflicts.push({
          field: key as string,
          label: label,
          oldValue: oldArr,
          newValue: newArr,
          severity: 'different',
          suggestion:
            (added.length > 0 ? `新增上门映射: ${added.join('、')}，这些异常首次识别将自动标记为"需上门"。` : '') +
            (removed.length > 0 ? ` 移除上门映射: ${removed.join('、')}，这些异常首次识别将标记为"待处理"。` : ''),
        })
      }
    }
  })
  return conflicts
}

export function createEmptyDraft(operator: string): SchemeDraft {
  return {
    draftId: generateId('DRAFT'),
    name: `草稿 ${new Date().toLocaleString('zh-CN')}`,
    description: '',
    qcRules: { ...DEFAULT_QC_RULES, homeVisitStatusMappings: [...DEFAULT_QC_RULES.homeVisitStatusMappings] },
    preCheckConfig: { ...DEFAULT_PRE_CHECK_CONFIG },
    schemaVersion: SCHEME_DRAFT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    createdBy: operator,
    updatedAt: new Date().toISOString(),
  }
}

export function validateDraftImport(
  jsonText: string,
  existingDrafts: SchemeDraft[],
  currentRules: QualityControlRules
): ImportValidationResult {
  const issues: ImportValidationIssue[] = []

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return {
      valid: false,
      canImport: false,
      issues: [
        {
          code: ImportValidationIssueCode.INVALID_JSON,
          severity: 'error',
          message: 'JSON 解析失败，请检查文件格式是否正确',
          suggestion: '请使用由本系统"导出草稿"功能生成的 JSON 文件，或检查语法错误（如缺少引号、逗号）。',
        },
      ],
      errorCount: 1,
      warningCount: 0,
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      valid: false,
      canImport: false,
      issues: [
        {
          code: ImportValidationIssueCode.INVALID_TYPE,
          severity: 'error',
          message: '文件内容不是有效的方案草稿对象',
          suggestion: '方案草稿应为单个 JSON 对象，包含 draftId、name、qcRules 等字段。',
        },
      ],
      errorCount: 1,
      warningCount: 0,
    }
  }

  const obj = parsed as Record<string, unknown>

  REQUIRED_DRAFT_FIELDS.forEach(field => {
    if (!(field in obj)) {
      issues.push({
        code: ImportValidationIssueCode.MISSING_FIELD,
        severity: 'error',
        field,
        message: `缺失必填字段: ${field}`,
        suggestion: `请确保导入的 JSON 包含 "${field}" 字段，可通过重新导出来获取完整结构。`,
      })
    }
  })

  if (typeof obj.schemaVersion !== 'string') {
    issues.push({
      code: ImportValidationIssueCode.INVALID_TYPE,
      severity: 'error',
      field: 'schemaVersion',
      message: 'schemaVersion 字段类型错误，应为字符串',
      suggestion: '请设置 schemaVersion 为字符串类型，例如 "1.0.0"。',
    })
  } else if (obj.schemaVersion !== SCHEME_DRAFT_SCHEMA_VERSION) {
    issues.push({
      code: ImportValidationIssueCode.VERSION_MISMATCH,
      severity: 'warning',
      field: 'schemaVersion',
      message: `方案版本 ${obj.schemaVersion} 与当前系统版本 ${SCHEME_DRAFT_SCHEMA_VERSION} 不匹配`,
      suggestion: `当前系统使用版本 ${SCHEME_DRAFT_SCHEMA_VERSION}。如字段结构兼容可继续导入，否则请使用相同版本的系统重新导出。`,
    })
  }

  if (typeof obj.name === 'string' && obj.name.trim() !== '') {
    const duplicate = existingDrafts.some(d => d.name.trim() === (obj.name as string).trim())
    if (duplicate) {
      issues.push({
        code: ImportValidationIssueCode.DUPLICATE_NAME,
        severity: 'error',
        field: 'name',
        message: `草稿名称 "${obj.name}" 已存在`,
        suggestion: `请修改导入文件中的 name 字段为其他名称，或先删除系统中已有的同名草稿。`,
      })
    }
  }

  if (typeof obj.qcRules === 'object' && obj.qcRules !== null) {
    const rules = obj.qcRules as Record<string, unknown>
    REQUIRED_QC_RULE_FIELDS.forEach(field => {
      if (!(field in rules)) {
        issues.push({
          code: ImportValidationIssueCode.MISSING_FIELD,
          severity: 'error',
          field: `qcRules.${field}`,
          message: `缺失 qcRules 下的必填字段: ${field}`,
          suggestion: `qcRules 是质控规则配置对象，必须包含 "${field}" 字段。请参考默认规则结构重新导出。`,
        })
      }
    })
  } else {
    issues.push({
      code: ImportValidationIssueCode.MISSING_FIELD,
      severity: 'error',
      field: 'qcRules',
      message: '缺失或无效的 qcRules 字段',
      suggestion: 'qcRules 应为对象，包含阈值、开关、上门映射等质控规则。',
    })
  }

  if (typeof obj.preCheckConfig === 'object' && obj.preCheckConfig !== null) {
    const cfg = obj.preCheckConfig as Record<string, unknown>
    REQUIRED_PRECHECK_FIELDS.forEach(field => {
      if (!(field in cfg)) {
        issues.push({
          code: ImportValidationIssueCode.MISSING_FIELD,
          severity: 'error',
          field: `preCheckConfig.${field}`,
          message: `缺失 preCheckConfig 下的必填字段: ${field}`,
          suggestion: `preCheckConfig 是预检配置对象，必须包含 "${field}" 字段。`,
        })
      }
    })
  } else {
    issues.push({
      code: ImportValidationIssueCode.MISSING_FIELD,
      severity: 'error',
      field: 'preCheckConfig',
      message: '缺失或无效的 preCheckConfig 字段',
      suggestion: 'preCheckConfig 应为对象，包含 maxDisplayIssues 和 allowWarningContinue。',
    })
  }

  const errorCount = issues.filter(i => i.severity === 'error').length
  const warningCount = issues.filter(i => i.severity === 'warning').length

  if (errorCount > 0) {
    return { valid: false, canImport: false, issues, errorCount, warningCount }
  }

  const draft = parsed as SchemeDraft

  if (typeof draft.qcRules === 'object' && draft.qcRules !== null) {
    const conflicts = detectRuleConflicts(currentRules, draft.qcRules)
    conflicts.forEach(conflict => {
      issues.push({
        code: ImportValidationIssueCode.RULE_CONFLICT,
        severity: 'warning',
        field: conflict.field,
        message: `规则 "${conflict.label}" ${conflict.severity === 'looser' ? '更宽松' : conflict.severity === 'stricter' ? '更严格' : '有变化'}: ${conflict.oldValue} → ${Array.isArray(conflict.newValue) ? (conflict.newValue as unknown[]).length + '项' : conflict.newValue}`,
        suggestion: conflict.suggestion,
        conflict,
      })
    })
  }

  const finalErrorCount = issues.filter(i => i.severity === 'error').length
  const finalWarningCount = issues.filter(i => i.severity === 'warning').length

  return {
    valid: finalErrorCount === 0,
    canImport: finalErrorCount === 0,
    issues,
    errorCount: finalErrorCount,
    warningCount: finalWarningCount,
    parsedDraft: draft,
  }
}

export function serializeDraftForExport(draft: SchemeDraft): string {
  return JSON.stringify(
    {
      draftId: draft.draftId,
      name: draft.name,
      description: draft.description,
      qcRules: draft.qcRules,
      preCheckConfig: draft.preCheckConfig,
      schemaVersion: draft.schemaVersion,
      createdAt: draft.createdAt,
      createdBy: draft.createdBy,
      updatedAt: draft.updatedAt,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  )
}
