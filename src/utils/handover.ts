import {
  HANDOVER_PACKAGE_SCHEMA_VERSION,
  HandoverPackage,
  HandoverAnomalyItem,
  HandoverImportBatchSummary,
  HandoverFiltersSummary,
  HandoverImportIssue,
  HandoverImportValidationResult,
  HandoverConflictCode,
  Anomaly,
  ReviewStatus,
  Filters,
  ImportBatch,
  QualityControlRules,
  DataTypeLabels,
} from '@/types'
import { generateId } from './helpers'

const PROTECTED_STATUSES = [ReviewStatus.CONFIRMED, ReviewStatus.IGNORED]

const REQUIRED_PACKAGE_FIELDS = [
  'packageId',
  'name',
  'schemaVersion',
  'createdAt',
  'createdBy',
  'sourceMode',
  'selectedCount',
  'ruleVersion',
  'ruleVersionName',
  'qcRules',
  'anomalies',
  'importBatchSummaries',
]

const REQUIRED_ANOMALY_FIELDS: Array<keyof HandoverAnomalyItem> = [
  'anomalyId',
  'type',
  'severity',
  'residentId',
  'description',
  'status',
  'remark',
  'handler',
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

export function anomalyToHandoverItem(a: Anomaly): HandoverAnomalyItem {
  return {
    anomalyId: a.anomalyId,
    type: a.type,
    severity: a.severity,
    residentId: a.residentId,
    residentName: a.residentName,
    description: a.description,
    status: a.status,
    remark: a.remark,
    handler: a.handler,
    updatedAt: a.updatedAt,
    site: a.site,
    nurse: a.nurse,
  }
}

export function buildHandoverPackage(params: {
  name: string
  description: string
  sourceMode: 'filter' | 'selected'
  filters: Filters | null
  anomalies: Anomaly[]
  importBatches: ImportBatch[]
  ruleVersion: string
  ruleVersionName: string
  qcRules: QualityControlRules
  operator: string
}): HandoverPackage {
  const batchSummaries: HandoverImportBatchSummary[] = params.importBatches
    .filter(b => !b.reverted)
    .slice(0, 20)
    .map(b => ({
      batchId: b.batchId,
      dataType: b.dataType,
      fileName: b.fileName,
      importedCount: b.importedCount,
      skippedCount: b.skippedCount,
      operator: b.operator,
      createdAt: b.createdAt,
    }))

  const filtersSummary: HandoverFiltersSummary | null = params.filters
    ? {
        sites: [...params.filters.sites],
        nurses: [...params.filters.nurses],
        anomalyTypes: [...params.filters.anomalyTypes],
        statuses: [...params.filters.statuses],
        searchText: params.filters.searchText,
      }
    : null

  return {
    packageId: generateId('HANDOVER'),
    name: params.name || `交接包 ${new Date().toLocaleString('zh-CN')}`,
    description: params.description || '',
    schemaVersion: HANDOVER_PACKAGE_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    createdBy: params.operator,
    sourceMode: params.sourceMode,
    filters: filtersSummary,
    selectedCount: params.anomalies.length,
    ruleVersion: params.ruleVersion,
    ruleVersionName: params.ruleVersionName,
    qcRules: {
      ...params.qcRules,
      homeVisitStatusMappings: [...params.qcRules.homeVisitStatusMappings],
    },
    anomalies: params.anomalies.map(anomalyToHandoverItem),
    importBatchSummaries: batchSummaries,
  }
}

export function serializeHandoverForExport(pkg: HandoverPackage): string {
  return JSON.stringify(
    {
      packageId: pkg.packageId,
      name: pkg.name,
      description: pkg.description,
      schemaVersion: pkg.schemaVersion,
      createdAt: pkg.createdAt,
      createdBy: pkg.createdBy,
      sourceMode: pkg.sourceMode,
      filters: pkg.filters,
      selectedCount: pkg.selectedCount,
      ruleVersion: pkg.ruleVersion,
      ruleVersionName: pkg.ruleVersionName,
      qcRules: pkg.qcRules,
      anomalies: pkg.anomalies,
      importBatchSummaries: pkg.importBatchSummaries,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  )
}

export function handoverToCSV(pkg: HandoverPackage): string {
  const headers = [
    '异常ID',
    '异常类型',
    '严重程度',
    '居民编号',
    '居民姓名',
    '站点',
    '责任护士',
    '异常描述',
    '复核状态',
    '备注',
    '处理人',
    '更新时间',
  ]
  const statusMap: Record<ReviewStatus, string> = {
    [ReviewStatus.PENDING]: '待处理',
    [ReviewStatus.CONFIRMED]: '已确认',
    [ReviewStatus.IGNORED]: '忽略',
    [ReviewStatus.NEED_HOME_VISIT]: '需上门',
  }
  const typeMap: Record<string, string> = {
    OVERDUE_VISIT: '逾期未访',
    UNPLANNED_VISIT: '未预约到访',
    DUPLICATE_FOLLOWUP: '重复随访',
    ABNORMAL_METRIC: '指标越界',
    UNREGISTERED_RESIDENT: '居民不在名册',
  }
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
  const rows = pkg.anomalies.map(a => [
    a.anomalyId,
    typeMap[a.type] || a.type,
    severityMap[a.severity] || a.severity,
    a.residentId,
    a.residentName || '',
    a.site || '',
    a.nurse || '',
    a.description,
    statusMap[a.status] || a.status,
    a.remark,
    a.handler,
    a.updatedAt,
  ])
  return [headers.join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n')
}

export function validateHandoverImport(
  jsonText: string,
  localAnomalies: Anomaly[]
): HandoverImportValidationResult {
  const issues: HandoverImportIssue[] = []

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return {
      valid: false,
      canApply: false,
      issues: [
        {
          code: HandoverConflictCode.INVALID_JSON,
          severity: 'error',
          message: 'JSON 解析失败，请检查文件格式',
          suggestion: '请使用由本系统"导出交接包"功能生成的 JSON 文件。',
        },
      ],
      errorCount: 1,
      warningCount: 0,
      applicableCount: 0,
      protectedCount: 0,
      notFoundCount: 0,
      olderStatusCount: 0,
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      valid: false,
      canApply: false,
      issues: [
        {
          code: HandoverConflictCode.INVALID_TYPE,
          severity: 'error',
          message: '文件内容不是有效的交接包对象',
          suggestion: '交接包应为单个 JSON 对象，包含 packageId、name、anomalies 等字段。',
        },
      ],
      errorCount: 1,
      warningCount: 0,
      applicableCount: 0,
      protectedCount: 0,
      notFoundCount: 0,
      olderStatusCount: 0,
    }
  }

  const obj = parsed as Record<string, unknown>

  REQUIRED_PACKAGE_FIELDS.forEach(field => {
    if (!(field in obj)) {
      issues.push({
        code: HandoverConflictCode.MISSING_FIELD,
        severity: 'error',
        field,
        message: `交接包缺失必填字段: ${field}`,
        suggestion: `请确保导入的 JSON 包含 "${field}" 字段，可通过重新生成交接包来获取完整结构。`,
      })
    }
  })

  if (typeof obj.schemaVersion !== 'string') {
    issues.push({
      code: HandoverConflictCode.INVALID_TYPE,
      severity: 'error',
      field: 'schemaVersion',
      message: 'schemaVersion 字段类型错误，应为字符串',
      suggestion: `请设置 schemaVersion 为字符串类型，例如 "${HANDOVER_PACKAGE_SCHEMA_VERSION}"。`,
    })
  } else if (obj.schemaVersion !== HANDOVER_PACKAGE_SCHEMA_VERSION) {
    issues.push({
      code: HandoverConflictCode.VERSION_MISMATCH,
      severity: 'warning',
      field: 'schemaVersion',
      message: `交接包 schemaVersion(${obj.schemaVersion}) 与系统版本(${HANDOVER_PACKAGE_SCHEMA_VERSION}) 不匹配`,
      suggestion: `当前系统使用版本 ${HANDOVER_PACKAGE_SCHEMA_VERSION}。如字段兼容可继续应用，否则请使用相同版本的系统重新导出交接包。`,
    })
  }

  if (typeof obj.qcRules === 'object' && obj.qcRules !== null) {
    const rules = obj.qcRules as Record<string, unknown>
    REQUIRED_QC_RULE_FIELDS.forEach(field => {
      if (!(field in rules)) {
        issues.push({
          code: HandoverConflictCode.MISSING_FIELD,
          severity: 'error',
          field: `qcRules.${field}`,
          message: `缺失 qcRules 下的必填字段: ${field}`,
          suggestion: `qcRules 是质控规则配置对象，必须包含 "${field}" 字段。`,
        })
      }
    })
  } else if ('qcRules' in obj) {
    issues.push({
      code: HandoverConflictCode.INVALID_TYPE,
      severity: 'error',
      field: 'qcRules',
      message: 'qcRules 字段类型错误，应为对象',
      suggestion: 'qcRules 应为质控规则对象。',
    })
  }

  let applicableCount = 0
  let protectedCount = 0
  let notFoundCount = 0
  let olderStatusCount = 0

  if (Array.isArray(obj.anomalies)) {
    const anomalyArr = obj.anomalies as Array<Record<string, unknown>>
    const localAnomalyMap = new Map(localAnomalies.map(a => [a.anomalyId, a]))

    anomalyArr.forEach((item, idx) => {
      REQUIRED_ANOMALY_FIELDS.forEach(field => {
        if (!(field in item)) {
          issues.push({
            code: HandoverConflictCode.MISSING_FIELD,
            severity: 'error',
            field: `anomalies[${idx}].${field}`,
            message: `交接包异常记录第 ${idx + 1} 条缺失字段: ${field}`,
            suggestion: `异常记录必须包含 "${field}" 字段，请检查或重新生成交接包。`,
          })
        }
      })

      const anomalyId = item.anomalyId as string
      if (anomalyId) {
        const local = localAnomalyMap.get(anomalyId)
        if (!local) {
          notFoundCount++
          issues.push({
            code: HandoverConflictCode.ANOMALY_NOT_FOUND,
            severity: 'warning',
            anomalyId,
            message: `异常记录 ${anomalyId} 在本地不存在`,
            suggestion: '该异常可能已被删除或尚未导入对应数据。应用时将跳过此条，不会影响其他记录。',
          })
        } else {
          if (PROTECTED_STATUSES.includes(local.status)) {
            protectedCount++
            issues.push({
              code: HandoverConflictCode.PROTECTED_STATUS,
              severity: 'warning',
              anomalyId,
              message: `异常 ${anomalyId} 当前状态为"${local.status}"，属于人工复核结果，受保护不被覆盖`,
              suggestion: '如需修改，请在异常看板手动调整该条记录的状态，然后再应用交接包。',
            })
          } else {
            const itemUpdatedAt = item.updatedAt as string
            if (itemUpdatedAt && local.updatedAt && new Date(itemUpdatedAt) < new Date(local.updatedAt)) {
              olderStatusCount++
              issues.push({
                code: HandoverConflictCode.STATUS_OLDER,
                severity: 'warning',
                anomalyId,
                message: `异常 ${anomalyId} 的交接包更新时间(${itemUpdatedAt.slice(0, 19)})早于本地更新时间(${local.updatedAt.slice(0, 19)})，本地可能已有更新`,
                suggestion: '为避免覆盖较新的本地结果，该条记录将被跳过。请确认以哪份数据为准，如需以交接包为准请手动更新本地记录后再应用。',
              })
            } else {
              applicableCount++
            }
          }
        }
      }
    })
  } else {
    issues.push({
      code: HandoverConflictCode.INVALID_TYPE,
      severity: 'error',
      field: 'anomalies',
      message: 'anomalies 字段类型错误，应为数组',
      suggestion: 'anomalies 应为异常记录数组。',
    })
  }

  const errorCount = issues.filter(i => i.severity === 'error').length
  const warningCount = issues.filter(i => i.severity === 'warning').length

  const valid = errorCount === 0
  const canApply = valid && applicableCount > 0

  return {
    valid,
    canApply,
    issues,
    errorCount,
    warningCount,
    parsedPackage: valid ? (parsed as HandoverPackage) : undefined,
    applicableCount,
    protectedCount,
    notFoundCount,
    olderStatusCount,
  }
}

export { DataTypeLabels }
