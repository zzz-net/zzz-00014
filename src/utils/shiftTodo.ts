import {
  SHIFT_TODO_SCHEMA_VERSION,
  ShiftTodoList,
  ShiftTodoItem,
  ShiftTodoImportIssue,
  ShiftTodoImportValidationResult,
  ShiftTodoConflictCode,
  Anomaly,
  AnomalyTypeLabels,
  ReviewStatusLabels,
  Filters,
} from '@/types'
import { generateId } from './helpers'

const REQUIRED_LIST_FIELDS = [
  'listId',
  'name',
  'schemaVersion',
  'createdAt',
  'createdBy',
  'updatedAt',
  'items',
]

const REQUIRED_ITEM_FIELDS: Array<keyof ShiftTodoItem> = [
  'itemId',
  'anomalyId',
  'anomalyType',
  'anomalySeverity',
  'residentId',
  'anomalyDescription',
  'anomalyStatus',
  'anomalyUpdatedAt',
  'responsibleNurse',
  'deadline',
  'handlingNote',
  'completed',
  'createdAt',
  'addedBy',
]

export function anomalyToShiftTodoItem(
  anomaly: Anomaly,
  params: {
    responsibleNurse: string
    deadline: string
    handlingNote: string
    operator: string
  }
): ShiftTodoItem {
  return {
    itemId: generateId('TODO'),
    anomalyId: anomaly.anomalyId,
    anomalyType: anomaly.type,
    anomalySeverity: anomaly.severity,
    residentId: anomaly.residentId,
    residentName: anomaly.residentName,
    anomalyDescription: anomaly.description,
    anomalyStatus: anomaly.status,
    anomalyUpdatedAt: anomaly.updatedAt,
    responsibleNurse: params.responsibleNurse || anomaly.nurse || anomaly.handler || '',
    deadline: params.deadline,
    handlingNote: params.handlingNote,
    completed: false,
    completedAt: null,
    completedBy: null,
    createdAt: new Date().toISOString(),
    addedBy: params.operator,
  }
}

export function buildShiftTodoList(params: {
  name: string
  description: string
  operator: string
  items?: ShiftTodoItem[]
}): ShiftTodoList {
  return {
    listId: generateId('SHLIST'),
    name: params.name || `班次待办 ${new Date().toLocaleString('zh-CN')}`,
    description: params.description || '',
    schemaVersion: SHIFT_TODO_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    createdBy: params.operator,
    updatedAt: new Date().toISOString(),
    items: params.items || [],
  }
}

export function serializeShiftTodoForExport(list: ShiftTodoList): string {
  return JSON.stringify(
    {
      listId: list.listId,
      name: list.name,
      description: list.description,
      schemaVersion: list.schemaVersion,
      createdAt: list.createdAt,
      createdBy: list.createdBy,
      updatedAt: list.updatedAt,
      items: list.items,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  )
}

export function shiftTodoToCSV(list: ShiftTodoList): string {
  const headers = [
    '清单名称',
    '清单描述',
    '清单项ID',
    '异常ID',
    '异常类型',
    '严重程度',
    '居民编号',
    '居民姓名',
    '异常描述',
    '异常复核状态',
    '责任护士',
    '截止时间',
    '处理说明',
    '是否完成',
    '完成时间',
    '完成人',
    '加入时间',
    '加入人',
  ]
  const severityMap: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  }
  const escapeCSV = (v: unknown): string => {
    const s = String(v ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const rows = list.items.map(item => [
    list.name,
    list.description,
    item.itemId,
    item.anomalyId,
    AnomalyTypeLabels[item.anomalyType] || item.anomalyType,
    severityMap[item.anomalySeverity] || item.anomalySeverity,
    item.residentId,
    item.residentName || '',
    item.anomalyDescription,
    ReviewStatusLabels[item.anomalyStatus] || item.anomalyStatus,
    item.responsibleNurse,
    item.deadline,
    item.handlingNote,
    item.completed ? '是' : '否',
    item.completedAt || '',
    item.completedBy || '',
    item.createdAt,
    item.addedBy,
  ])
  return [headers.join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n')
}

export function validateShiftTodoImport(
  jsonText: string,
  existingLists: ShiftTodoList[],
  localAnomalies: Anomaly[]
): ShiftTodoImportValidationResult {
  const issues: ShiftTodoImportIssue[] = []

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return {
      valid: false,
      canImport: false,
      issues: [
        {
          code: ShiftTodoConflictCode.INVALID_JSON,
          severity: 'error',
          message: 'JSON 解析失败，请检查文件格式',
          suggestion: '请使用由本系统"导出班次待办清单"功能生成的 JSON 文件。',
        },
      ],
      errorCount: 1,
      warningCount: 0,
      notFoundCount: 0,
      updatedCount: 0,
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      valid: false,
      canImport: false,
      issues: [
        {
          code: ShiftTodoConflictCode.INVALID_TYPE,
          severity: 'error',
          message: '文件内容不是有效的班次待办清单对象',
          suggestion: '班次待办清单应为单个 JSON 对象，包含 listId、name、items 等字段。',
        },
      ],
      errorCount: 1,
      warningCount: 0,
      notFoundCount: 0,
      updatedCount: 0,
    }
  }

  const obj = parsed as Record<string, unknown>

  REQUIRED_LIST_FIELDS.forEach(field => {
    if (!(field in obj)) {
      issues.push({
        code: ShiftTodoConflictCode.MISSING_FIELD,
        severity: 'error',
        field,
        message: `班次待办清单缺失必填字段: ${field}`,
        suggestion: `请确保导入的 JSON 包含 "${field}" 字段，可通过重新导出清单来获取完整结构。`,
      })
    }
  })

  if (typeof obj.name === 'string') {
    const duplicateName = existingLists.find(l => l.name === obj.name)
    if (duplicateName) {
      issues.push({
        code: ShiftTodoConflictCode.DUPLICATE_NAME,
        severity: 'error',
        listName: obj.name,
        message: `已存在同名班次待办清单: "${obj.name}"`,
        suggestion: '请修改清单名称后再导出，或先删除本地同名清单再导入。',
      })
    }
  }

  if (typeof obj.schemaVersion !== 'string') {
    issues.push({
      code: ShiftTodoConflictCode.INVALID_TYPE,
      severity: 'error',
      field: 'schemaVersion',
      message: 'schemaVersion 字段类型错误，应为字符串',
      suggestion: `请设置 schemaVersion 为字符串类型，例如 "${SHIFT_TODO_SCHEMA_VERSION}"。`,
    })
  } else if (obj.schemaVersion !== SHIFT_TODO_SCHEMA_VERSION) {
    issues.push({
      code: ShiftTodoConflictCode.VERSION_MISMATCH,
      severity: 'error',
      field: 'schemaVersion',
      message: `清单 schemaVersion(${obj.schemaVersion}) 与系统版本(${SHIFT_TODO_SCHEMA_VERSION}) 不匹配`,
      suggestion: `请使用系统版本 ${SHIFT_TODO_SCHEMA_VERSION} 重新导出清单后再导入。`,
    })
  }

  let notFoundCount = 0
  let updatedCount = 0

  if (Array.isArray(obj.items)) {
    const itemArr = obj.items as Array<Record<string, unknown>>
    const localAnomalyMap = new Map(localAnomalies.map(a => [a.anomalyId, a]))

    itemArr.forEach((item, idx) => {
      REQUIRED_ITEM_FIELDS.forEach(field => {
        if (!(field in item)) {
          issues.push({
            code: ShiftTodoConflictCode.MISSING_FIELD,
            severity: 'error',
            field: `items[${idx}].${field}`,
            message: `清单项第 ${idx + 1} 条缺失字段: ${field}`,
            suggestion: `清单项必须包含 "${field}" 字段，请检查或重新导出清单。`,
          })
        }
      })

      const anomalyId = item.anomalyId as string
      if (anomalyId) {
        const local = localAnomalyMap.get(anomalyId)
        if (!local) {
          notFoundCount++
          issues.push({
            code: ShiftTodoConflictCode.ANOMALY_NOT_FOUND,
            severity: 'warning',
            anomalyId,
            message: `异常记录 ${anomalyId} 在本地不存在`,
            suggestion: '该异常可能已被删除或尚未导入对应数据。导入后此条记录仍会保留在清单中，请确认数据完整性。',
          })
        } else {
          const itemUpdatedAt = (item as unknown as ShiftTodoItem).anomalyUpdatedAt
          if (itemUpdatedAt && local.updatedAt && new Date(itemUpdatedAt) < new Date(local.updatedAt)) {
            updatedCount++
            issues.push({
              code: ShiftTodoConflictCode.ANOMALY_UPDATED,
              severity: 'warning',
              anomalyId,
              message: `异常 ${anomalyId} 的清单异常更新时间(${itemUpdatedAt.slice(0, 19)})早于本地异常更新时间(${local.updatedAt.slice(0, 19)})，本地异常可能已有更新`,
              suggestion: '清单仅作为待办跟踪，不会自动覆盖异常数据。请根据实际情况核对异常看板中的最新状态。',
            })
          }
        }
      }
    })
  } else {
    issues.push({
      code: ShiftTodoConflictCode.INVALID_TYPE,
      severity: 'error',
      field: 'items',
      message: 'items 字段类型错误，应为数组',
      suggestion: 'items 应为清单项数组。',
    })
  }

  const errorCount = issues.filter(i => i.severity === 'error').length
  const warningCount = issues.filter(i => i.severity === 'warning').length

  const valid = errorCount === 0
  const canImport = valid

  return {
    valid,
    canImport,
    issues,
    errorCount,
    warningCount,
    parsedList: valid ? (parsed as ShiftTodoList) : undefined,
    notFoundCount,
    updatedCount,
  }
}

export function todayPlusDaysStr(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export { AnomalyTypeLabels, ReviewStatusLabels }
export type { Filters }
