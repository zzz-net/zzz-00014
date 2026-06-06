import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  Anomaly,
  AnomalyType,
  Appointment,
  DataType,
  DEFAULT_LOG_FILTERS,
  DEFAULT_QC_RULES,
  DEFAULT_PRE_CHECK_CONFIG,
  Filters,
  Followup,
  ImportResult,
  LogActionType,
  LogFilters,
  OperationLog,
  PreCheckConfig,
  PreCheckFilterDataType,
  PreCheckFilterSeverity,
  PreCheckIssue,
  PreCheckResult,
  QualityControlRules,
  Resident,
  ReviewStatus,
  RuleVersion,
  UnregisteredRecord,
  PreCheckIssueCodeLabels,
  DataTypeLabels,
} from '@/types'
import { parseCSV, generateCSV, downloadFile } from '@/utils/csv'
import { validateData } from '@/utils/validator'
import { detectAnomalies, calculateRuleDiffPreview } from '@/utils/anomaly'
import { preCheckResidents, preCheckAppointments, preCheckFollowups, buildPreCheckResult } from '@/utils/precheck'
import { computeHash, generateId, todayStr } from '@/utils/helpers'

interface AppState {
  residents: Resident[]
  appointments: Appointment[]
  followups: Followup[]
  importedFileHashes: Record<DataType, string>
  anomalies: Anomaly[]
  unregisteredRecords: UnregisteredRecord[]
  lastImportResult: Record<DataType, ImportResult | null>
  filters: Filters
  qcRules: QualityControlRules
  ruleVersions: RuleVersion[]
  currentRuleVersion: string
  operationLogs: OperationLog[]
  logFilters: LogFilters
  currentOperator: string
  preCheckConfig: PreCheckConfig
  preCheckResult: PreCheckResult | null
  preCheckPendingFile: { type: DataType; text: string; fileName: string; hash: string } | null
  preCheckFilterSeverity: PreCheckFilterSeverity
  preCheckFilterDataType: PreCheckFilterDataType
  preCheckFilterSearch: string
  importData: (type: DataType, fileText: string, fileName: string) => Promise<ImportResult>
  runPreCheck: (type: DataType, fileText: string, fileName: string) => Promise<PreCheckResult>
  confirmImportFromPreCheck: (mode: 'all' | 'validOnly') => Promise<ImportResult | null>
  cancelPreCheck: () => void
  clearPreCheckResult: () => void
  setPreCheckConfig: (config: Partial<PreCheckConfig>) => void
  setPreCheckFilter: (filter: { severity?: PreCheckFilterSeverity; dataType?: PreCheckFilterDataType; search?: string }) => void
  getFilteredPreCheckIssues: () => PreCheckIssue[]
  exportPreCheckReport: (format: 'csv' | 'json') => void
  updateAnomaly: (id: string, status?: ReviewStatus, remark?: string, handler?: string) => void
  setFilters: (filters: Partial<Filters>) => void
  resetFilters: () => void
  getFilteredAnomalies: () => Anomaly[]
  exportFilteredData: (format: 'json' | 'csv') => void
  resetAll: () => void
  setQCRules: (rules: QualityControlRules, description?: string, saveVersion?: boolean) => void
  restoreDefaultRules: () => void
  applyRuleVersion: (version: string) => { preview: ReturnType<typeof calculateRuleDiffPreview> | null }
  deleteRuleVersion: (version: string) => void
  recalculateAnomalies: (respectProtection?: boolean) => void
  previewRuleChange: (newRules: QualityControlRules) => ReturnType<typeof calculateRuleDiffPreview>
  setLogFilters: (filters: Partial<LogFilters>) => void
  resetLogFilters: () => void
  getFilteredLogs: () => OperationLog[]
  exportLogs: (format: 'json' | 'csv') => void
  setCurrentOperator: (name: string) => void
  addLog: (actionType: LogActionType, description: string, details?: Record<string, unknown>) => void
}

const DEFAULT_FILTERS: Filters = {
  sites: [],
  nurses: [],
  anomalyTypes: [],
  statuses: [],
  searchText: '',
}

const INITIAL_VERSIONS: RuleVersion[] = [
  {
    version: 'v1.0.0-default',
    name: '默认规则',
    rules: { ...DEFAULT_QC_RULES },
    createdAt: new Date().toISOString(),
    createdBy: 'system',
    description: '系统默认质控规则版本',
  },
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      residents: [],
      appointments: [],
      followups: [],
      importedFileHashes: { residents: '', appointments: '', followups: '' },
      anomalies: [],
      unregisteredRecords: [],
      lastImportResult: { residents: null, appointments: null, followups: null },
      filters: { ...DEFAULT_FILTERS },
      qcRules: { ...DEFAULT_QC_RULES },
      ruleVersions: INITIAL_VERSIONS,
      currentRuleVersion: 'v1.0.0-default',
      operationLogs: [],
      logFilters: { ...DEFAULT_LOG_FILTERS },
      currentOperator: '未登录用户',
      preCheckConfig: { ...DEFAULT_PRE_CHECK_CONFIG },
      preCheckResult: null,
      preCheckPendingFile: null,
      preCheckFilterSeverity: 'all',
      preCheckFilterDataType: 'all',
      preCheckFilterSearch: '',

      addLog: (actionType, description, details = {}) => {
        const log: OperationLog = {
          logId: generateId('LOG'),
          actionType,
          operator: get().currentOperator,
          timestamp: new Date().toISOString(),
          description,
          details,
        }
        set(s => ({ operationLogs: [log, ...s.operationLogs].slice(0, 5000) }))
      },

      runPreCheck: async (type, fileText, fileName) => {
        const hash = await computeHash(fileText)
        const currentHash = get().importedFileHashes[type]

        const residentIds = new Set(get().residents.map(r => r.residentId))

        let residentResult = null
        let appointmentResult = null
        let followupResult = null

        const prevResult = get().preCheckResult
        if (prevResult) {
          residentResult = prevResult.dataTypes.residents
          appointmentResult = prevResult.dataTypes.appointments
          followupResult = prevResult.dataTypes.followups
        }

        if (type === 'residents') {
          residentResult = preCheckResidents(fileText, fileName)
        } else if (type === 'appointments') {
          const allResidentIds = new Set(residentIds)
          if (residentResult) {
            residentResult.parsedData.forEach(row => {
              if (row['居民编号']) allResidentIds.add(row['居民编号'].trim())
            })
          }
          appointmentResult = preCheckAppointments(fileText, fileName, allResidentIds)
        } else if (type === 'followups') {
          const allResidentIds = new Set(residentIds)
          if (residentResult) {
            residentResult.parsedData.forEach(row => {
              if (row['居民编号']) allResidentIds.add(row['居民编号'].trim())
            })
          }
          followupResult = preCheckFollowups(fileText, fileName, allResidentIds)
        }

        const result = buildPreCheckResult(residentResult, appointmentResult, followupResult)

        set({
          preCheckResult: result,
          preCheckPendingFile: { type, text: fileText, fileName, hash },
          preCheckFilterSeverity: 'all',
          preCheckFilterDataType: 'all',
          preCheckFilterSearch: '',
        })

        get().addLog(LogActionType.PRE_CHECK, `预检${DataTypeLabels[type]}：${fileName}`, {
          type,
          fileName,
          totalIssues: result.overall.totalIssues,
          totalErrors: result.overall.totalErrors,
          totalWarnings: result.overall.totalWarnings,
        })

        if (hash === currentHash && currentHash !== '') {
          const dupResult: ImportResult = {
            success: false,
            isDuplicate: true,
            message: '该文件已导入过，无需重复导入',
            errors: [],
            importedCount: 0,
          }
          set(s => ({ lastImportResult: { ...s.lastImportResult, [type]: dupResult } }))
          get().addLog(LogActionType.IMPORT, `重复导入${type}：${fileName}`, { type, fileName, result: dupResult })
        }

        return result
      },

      confirmImportFromPreCheck: async (mode) => {
        const pending = get().preCheckPendingFile
        const preCheckResult = get().preCheckResult
        if (!pending || !preCheckResult) return null

        const { type, fileName, hash } = pending
        const currentHash = get().importedFileHashes[type]

        if (hash === currentHash && currentHash !== '') {
          const result: ImportResult = {
            success: false,
            isDuplicate: true,
            message: '该文件已导入过，无需重复导入',
            errors: [],
            importedCount: 0,
          }
          set(s => ({ lastImportResult: { ...s.lastImportResult, [type]: result } }))
          get().addLog(LogActionType.IMPORT, `重复导入${type}：${fileName}`, { type, fileName, result })
          set({ preCheckPendingFile: null })
          return result
        }

        const typeResult = preCheckResult.dataTypes[type]
        if (!typeResult) return null

        const hasErrors = typeResult.errorCount > 0
        const config = get().preCheckConfig

        if (hasErrors) {
          const result: ImportResult = {
            success: false,
            isDuplicate: false,
            message: `预检未通过，存在 ${typeResult.errorCount} 个错误，旧数据未被覆盖`,
            errors: typeResult.issues.filter(i => i.severity === 'error').slice(0, 10).map(i => ({
              row: i.row,
              field: i.field,
              message: i.message,
              value: i.value,
            })),
            importedCount: 0,
          }
          set(s => ({ lastImportResult: { ...s.lastImportResult, [type]: result } }))
          get().addLog(LogActionType.PRE_CHECK_CANCEL, `预检未通过取消导入${type}：${fileName}`, {
            type,
            fileName,
            errorCount: typeResult.errorCount,
          })
          set({ preCheckPendingFile: null, preCheckResult: null })
          return result
        }

        if (!config.allowWarningContinue && typeResult.warningCount > 0 && mode !== 'validOnly') {
          const result: ImportResult = {
            success: false,
            isDuplicate: false,
            message: `存在 ${typeResult.warningCount} 个警告，系统配置不允许警告继续导入`,
            errors: typeResult.issues.filter(i => i.severity === 'warning').slice(0, 10).map(i => ({
              row: i.row,
              field: i.field,
              message: i.message,
              value: i.value,
            })),
            importedCount: 0,
          }
          set(s => ({ lastImportResult: { ...s.lastImportResult, [type]: result } }))
          set({ preCheckPendingFile: null, preCheckResult: null })
          return result
        }

        let rows = typeResult.parsedData
        if (mode === 'validOnly') {
          rows = rows.filter((_, idx) => !typeResult.invalidRowIndices.includes(idx))
        }

        if (rows.length === 0) {
          const result: ImportResult = {
            success: false,
            isDuplicate: false,
            message: mode === 'validOnly' ? '没有可导入的有效数据行' : '文件为空或格式错误',
            errors: [],
            importedCount: 0,
          }
          set(s => ({ lastImportResult: { ...s.lastImportResult, [type]: result } }))
          set({ preCheckPendingFile: null, preCheckResult: null })
          return result
        }

        const validation = validateData(type, rows)
        const data = validation.data as Resident[] | Appointment[] | Followup[]

        set(s => {
          const newState: Partial<AppState> = {
            importedFileHashes: { ...s.importedFileHashes, [type]: hash },
            lastImportResult: {
              ...s.lastImportResult,
              [type]: {
                success: true,
                isDuplicate: false,
                message: `成功导入 ${data.length} 条记录${mode === 'validOnly' ? `（跳过${typeResult.invalidRowIndices.length}行无效数据）` : ''}`,
                errors: [],
                importedCount: data.length,
              },
            },
          }

          if (type === 'residents') {
            newState.residents = data as Resident[]
          } else if (type === 'appointments') {
            newState.appointments = data as Appointment[]
          } else if (type === 'followups') {
            newState.followups = data as Followup[]
          }

          const residents = (newState.residents as Resident[]) || s.residents
          const appointments = (newState.appointments as Appointment[]) || s.appointments
          const followups = (newState.followups as Followup[]) || s.followups

          const { anomalies, unregisteredRecords } = detectAnomalies(
            residents,
            appointments,
            followups,
            s.anomalies,
            s.qcRules,
            true
          )
          newState.anomalies = anomalies
          newState.unregisteredRecords = unregisteredRecords

          return newState
        })

        const logType = typeResult.warningCount > 0
          ? LogActionType.PRE_CHECK_IMPORT_WARN
          : LogActionType.PRE_CHECK_IMPORT_PASS
        get().addLog(logType, `${mode === 'validOnly' ? '仅导入有效数据' : '导入数据'}${type}：${fileName}（${data.length}条）`, {
          type,
          fileName,
          count: data.length,
          mode,
          warningCount: typeResult.warningCount,
        })

        set({ preCheckPendingFile: null, preCheckResult: null })
        return get().lastImportResult[type]!
      },

      cancelPreCheck: () => {
        const pending = get().preCheckPendingFile
        if (pending) {
          get().addLog(LogActionType.PRE_CHECK_CANCEL, `取消导入${DataTypeLabels[pending.type]}：${pending.fileName}`, {
            type: pending.type,
            fileName: pending.fileName,
          })
        }
        set({ preCheckPendingFile: null, preCheckResult: null })
      },

      clearPreCheckResult: () => {
        set({ preCheckResult: null, preCheckPendingFile: null })
      },

      setPreCheckConfig: config => {
        set(s => ({ preCheckConfig: { ...s.preCheckConfig, ...config } }))
      },

      setPreCheckFilter: filter => {
        set(s => ({
          preCheckFilterSeverity: filter.severity ?? s.preCheckFilterSeverity,
          preCheckFilterDataType: filter.dataType ?? s.preCheckFilterDataType,
          preCheckFilterSearch: filter.search ?? s.preCheckFilterSearch,
        }))
      },

      getFilteredPreCheckIssues: () => {
        const { preCheckResult, preCheckFilterSeverity, preCheckFilterDataType, preCheckFilterSearch, preCheckConfig } = get()
        if (!preCheckResult) return []

        const allIssues: PreCheckIssue[] = []
        Object.values(preCheckResult.dataTypes).forEach(r => {
          if (r) allIssues.push(...r.issues)
        })

        const filtered = allIssues.filter(issue => {
          if (preCheckFilterSeverity !== 'all' && issue.severity !== preCheckFilterSeverity) return false
          if (preCheckFilterDataType !== 'all' && issue.dataType !== preCheckFilterDataType) return false
          if (preCheckFilterSearch) {
            const search = preCheckFilterSearch.toLowerCase()
            return (
              issue.message.toLowerCase().includes(search) ||
              issue.field.toLowerCase().includes(search) ||
              issue.suggestion.toLowerCase().includes(search) ||
              String(issue.row).includes(search) ||
              (issue.value || '').toLowerCase().includes(search)
            )
          }
          return true
        })

        const sorted = [...filtered].sort((a, b) => {
          if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1
          if (a.dataType !== b.dataType) return a.dataType.localeCompare(b.dataType)
          return a.row - b.row
        })

        return sorted.slice(0, preCheckConfig.maxDisplayIssues)
      },

      exportPreCheckReport: format => {
        const issues = get().getFilteredPreCheckIssues()
        const { preCheckResult, preCheckFilterSeverity, preCheckFilterDataType, preCheckFilterSearch } = get()
        if (!preCheckResult) return

        const data = issues.map(i => ({
          问题ID: i.issueId,
          数据类型: DataTypeLabels[i.dataType],
          严重程度: i.severity === 'error' ? '错误' : '警告',
          问题类型: PreCheckIssueCodeLabels[i.code] || i.code,
          行号: i.row,
          字段: i.field,
          原值: i.value || '',
          问题描述: i.message,
          修复建议: i.suggestion,
        }))

        const timestamp = todayStr().replace(/-/g, '')

        if (format === 'json') {
          const exportObj = {
            exportTime: new Date().toISOString(),
            preCheckId: preCheckResult.preCheckId,
            preCheckTime: preCheckResult.timestamp,
            filters: {
              severity: preCheckFilterSeverity,
              dataType: preCheckFilterDataType,
              search: preCheckFilterSearch,
            },
            summary: {
              totalIssues: preCheckResult.overall.totalIssues,
              totalErrors: preCheckResult.overall.totalErrors,
              totalWarnings: preCheckResult.overall.totalWarnings,
              exportedCount: data.length,
            },
            issues: data,
          }
          downloadFile(JSON.stringify(exportObj, null, 2), `数据预检报告_${timestamp}.json`, 'application/json')
        } else {
          const csv = generateCSV(data)
          downloadFile(csv, `数据预检报告_${timestamp}.csv`, 'text/csv')
        }

        get().addLog(LogActionType.PRE_CHECK_EXPORT, `导出预检报告（${format.toUpperCase()}，${data.length}条）`, {
          format,
          count: data.length,
        })
      },

      importData: async (type, fileText, fileName) => {
        const hash = await computeHash(fileText)
        const currentHash = get().importedFileHashes[type]

        if (hash === currentHash && currentHash !== '') {
          const result: ImportResult = {
            success: false,
            isDuplicate: true,
            message: '该文件已导入过，无需重复导入',
            errors: [],
            importedCount: 0,
          }
          set(s => ({ lastImportResult: { ...s.lastImportResult, [type]: result } }))
          get().addLog(LogActionType.IMPORT, `重复导入${type}：${fileName}`, { type, fileName, result })
          return result
        }

        const rows = parseCSV(fileText)
        if (rows.length === 0) {
          const result: ImportResult = {
            success: false,
            isDuplicate: false,
            message: '文件为空或格式错误',
            errors: [],
            importedCount: 0,
          }
          set(s => ({ lastImportResult: { ...s.lastImportResult, [type]: result } }))
          get().addLog(LogActionType.IMPORT, `导入失败${type}：${fileName}（空文件）`, { type, fileName, result })
          return result
        }

        const validation = validateData(type, rows)
        if (!validation.valid) {
          const result: ImportResult = {
            success: false,
            isDuplicate: false,
            message: `数据校验失败，共 ${validation.errors.length} 个错误`,
            errors: validation.errors,
            importedCount: 0,
          }
          set(s => ({ lastImportResult: { ...s.lastImportResult, [type]: result } }))
          get().addLog(LogActionType.IMPORT, `导入失败${type}：${fileName}（校验失败）`, { type, fileName, result })
          return result
        }

        set(s => {
          const newState: Partial<AppState> = {
            importedFileHashes: { ...s.importedFileHashes, [type]: hash },
            lastImportResult: {
              ...s.lastImportResult,
              [type]: {
                success: true,
                isDuplicate: false,
                message: `成功导入 ${validation.data.length} 条记录`,
                errors: [],
                importedCount: validation.data.length,
              },
            },
          }

          if (type === 'residents') {
            newState.residents = validation.data as Resident[]
          } else if (type === 'appointments') {
            newState.appointments = validation.data as Appointment[]
          } else if (type === 'followups') {
            newState.followups = validation.data as Followup[]
          }

          const residents = (newState.residents as Resident[]) || s.residents
          const appointments = (newState.appointments as Appointment[]) || s.appointments
          const followups = (newState.followups as Followup[]) || s.followups

          const { anomalies, unregisteredRecords } = detectAnomalies(
            residents,
            appointments,
            followups,
            s.anomalies,
            s.qcRules,
            true
          )
          newState.anomalies = anomalies
          newState.unregisteredRecords = unregisteredRecords

          return newState
        })

        get().addLog(LogActionType.IMPORT, `成功导入${type}：${fileName}（${validation.data.length}条）`, {
          type,
          fileName,
          count: validation.data.length,
        })

        return get().lastImportResult[type]!
      },

      updateAnomaly: (id, status, remark, handler) => {
        let oldAnomaly: Anomaly | undefined
        set(s => {
          oldAnomaly = s.anomalies.find(a => a.anomalyId === id)
          return {
            anomalies: s.anomalies.map(a => {
              if (a.anomalyId !== id) return a
              return {
                ...a,
                status: status ?? a.status,
                remark: remark !== undefined ? remark : a.remark,
                handler: handler !== undefined ? handler : a.handler,
                updatedAt: new Date().toISOString(),
              }
            }),
          }
        })
        if (oldAnomaly && status) {
          get().addLog(
            LogActionType.REVIEW_STATUS_CHANGE,
            `修改异常${id}状态：${oldAnomaly.status} → ${status}`,
            { anomalyId: id, oldStatus: oldAnomaly.status, newStatus: status, residentId: oldAnomaly.residentId }
          )
        }
      },

      setFilters: filters => {
        set(s => ({ filters: { ...s.filters, ...filters } }))
      },

      resetFilters: () => {
        set({ filters: { ...DEFAULT_FILTERS } })
      },

      getFilteredAnomalies: () => {
        const { anomalies, filters } = get()
        return anomalies.filter(a => {
          if (filters.sites.length > 0 && a.site && !filters.sites.includes(a.site)) return false
          if (filters.nurses.length > 0 && a.nurse && !filters.nurses.includes(a.nurse)) return false
          if (filters.anomalyTypes.length > 0 && !filters.anomalyTypes.includes(a.type)) return false
          if (filters.statuses.length > 0 && !filters.statuses.includes(a.status)) return false
          if (filters.searchText) {
            const search = filters.searchText.toLowerCase()
            return (
              a.residentId.toLowerCase().includes(search) ||
              (a.residentName || '').toLowerCase().includes(search) ||
              a.description.toLowerCase().includes(search) ||
              (a.remark || '').toLowerCase().includes(search)
            )
          }
          return true
        })
      },

      exportFilteredData: format => {
        const filtered = get().getFilteredAnomalies()
        const { unregisteredRecords, filters } = get()

        const data = filtered.map(a => ({
          异常ID: a.anomalyId,
          异常类型: ({
            [AnomalyType.OVERDUE_VISIT]: '逾期未访',
            [AnomalyType.UNPLANNED_VISIT]: '未预约到访',
            [AnomalyType.DUPLICATE_FOLLOWUP]: '重复随访',
            [AnomalyType.ABNORMAL_METRIC]: '指标越界',
            [AnomalyType.UNREGISTERED_RESIDENT]: '居民不在名册',
          } as Record<string, string>)[a.type] || a.type,
          严重程度: a.severity === 'high' ? '高' : a.severity === 'medium' ? '中' : '低',
          居民编号: a.residentId,
          居民姓名: a.residentName || '',
          站点: a.site || '',
          护士: a.nurse || '',
          异常描述: a.description,
          复核状态: ({
            [ReviewStatus.PENDING]: '待处理',
            [ReviewStatus.CONFIRMED]: '已确认',
            [ReviewStatus.IGNORED]: '忽略',
            [ReviewStatus.NEED_HOME_VISIT]: '需上门',
          } as Record<string, string>)[a.status] || a.status,
          备注: a.remark,
          处理人: a.handler,
          更新时间: a.updatedAt,
        }))

        const timestamp = todayStr().replace(/-/g, '')

        if (format === 'json') {
          const exportObj = {
            exportTime: new Date().toISOString(),
            filters: filters,
            totalCount: data.length,
            anomalies: data,
            unregisteredRecords: unregisteredRecords.map(u => ({
              居民编号: u.residentId,
              来源: u.source === 'appointment' ? '预约记录' : '随访记录',
              日期: u.recordDate,
              站点: u.site,
              护士: u.nurse,
            })),
          }
          downloadFile(JSON.stringify(exportObj, null, 2), `慢病随访复核_${timestamp}.json`, 'application/json')
        } else {
          const csv = generateCSV(data)
          downloadFile(csv, `慢病随访复核_${timestamp}.csv`, 'text/csv')
        }
        get().addLog(LogActionType.EXPORT, `导出异常数据（${format.toUpperCase()}，${data.length}条）`, {
          format,
          count: data.length,
        })
      },

      resetAll: () => {
        get().addLog(LogActionType.RESET, '重置所有数据', {})
        set({
          residents: [],
          appointments: [],
          followups: [],
          importedFileHashes: { residents: '', appointments: '', followups: '' },
          anomalies: [],
          unregisteredRecords: [],
          lastImportResult: { residents: null, appointments: null, followups: null },
          filters: { ...DEFAULT_FILTERS },
        })
      },

      setQCRules: (rules, description = '自定义规则更新', saveVersion = true) => {
        const oldRules = get().qcRules
        if (saveVersion) {
          const versionNum = get().ruleVersions.length + 1
          const newVersion: RuleVersion = {
            version: `v1.${versionNum}.0-${Date.now().toString(36)}`,
            name: description || `规则版本 ${versionNum}`,
            rules: { ...rules },
            createdAt: new Date().toISOString(),
            createdBy: get().currentOperator,
            description,
          }
          set(s => ({
            ruleVersions: [...s.ruleVersions, newVersion],
            currentRuleVersion: newVersion.version,
          }))
        }
        set({ qcRules: { ...rules } })
        const { residents, appointments, followups, anomalies } = get()
        const result = detectAnomalies(residents, appointments, followups, anomalies, rules, true)
        set({ anomalies: result.anomalies, unregisteredRecords: result.unregisteredRecords })
        get().addLog(LogActionType.RULE_CHANGE, `更新质控规则：${description}`, {
          oldRules,
          newRules: rules,
        })
      },

      restoreDefaultRules: () => {
        get().addLog(LogActionType.RULE_CHANGE, '恢复默认质控规则', {})
        set({
          qcRules: { ...DEFAULT_QC_RULES },
          currentRuleVersion: 'v1.0.0-default',
        })
        const { residents, appointments, followups, anomalies } = get()
        const result = detectAnomalies(residents, appointments, followups, anomalies, DEFAULT_QC_RULES, true)
        set({ anomalies: result.anomalies, unregisteredRecords: result.unregisteredRecords })
      },

      previewRuleChange: newRules => {
        const { residents, appointments, followups, anomalies, qcRules } = get()
        return calculateRuleDiffPreview(
          residents,
          appointments,
          followups,
          anomalies,
          qcRules,
          newRules
        )
      },

      applyRuleVersion: version => {
        const versionData = get().ruleVersions.find(v => v.version === version)
        if (!versionData) return { preview: null }
        const preview = get().previewRuleChange(versionData.rules)
        set({
          qcRules: { ...versionData.rules },
          currentRuleVersion: version,
        })
        const { residents, appointments, followups, anomalies } = get()
        const result = detectAnomalies(
          residents,
          appointments,
          followups,
          anomalies,
          versionData.rules,
          true
        )
        set({ anomalies: result.anomalies, unregisteredRecords: result.unregisteredRecords })
        get().addLog(LogActionType.RULE_CHANGE, `应用规则版本：${versionData.name}`, {
          version,
          rules: versionData.rules,
        })
        return { preview }
      },

      deleteRuleVersion: version => {
        if (version === 'v1.0.0-default') return
        set(s => ({
          ruleVersions: s.ruleVersions.filter(v => v.version !== version),
        }))
      },

      recalculateAnomalies: (respectProtection = true) => {
        const { residents, appointments, followups, anomalies, qcRules } = get()
        const oldCount = anomalies.length
        const result = detectAnomalies(
          residents,
          appointments,
          followups,
          anomalies,
          qcRules,
          respectProtection
        )
        set({ anomalies: result.anomalies, unregisteredRecords: result.unregisteredRecords })
        get().addLog(LogActionType.BATCH_RECALCULATE, `批量重算异常（保护=${respectProtection}）`, {
          oldCount,
          newCount: result.anomalies.length,
          respectProtection,
        })
      },

      setLogFilters: filters => {
        set(s => ({ logFilters: { ...s.logFilters, ...filters } }))
      },

      resetLogFilters: () => {
        set({ logFilters: { ...DEFAULT_LOG_FILTERS } })
      },

      getFilteredLogs: () => {
        const { operationLogs, logFilters } = get()
        return operationLogs.filter(log => {
          if (logFilters.actionTypes.length > 0 && !logFilters.actionTypes.includes(log.actionType)) return false
          if (logFilters.operators.length > 0 && !logFilters.operators.includes(log.operator)) return false
          if (logFilters.startTime && log.timestamp < logFilters.startTime) return false
          if (logFilters.endTime && log.timestamp > logFilters.endTime + 'T23:59:59') return false
          if (logFilters.searchText) {
            const search = logFilters.searchText.toLowerCase()
            return (
              log.description.toLowerCase().includes(search) ||
              log.operator.toLowerCase().includes(search) ||
              JSON.stringify(log.details).toLowerCase().includes(search)
            )
          }
          return true
        })
      },

      exportLogs: format => {
        const logs = get().getFilteredLogs()
        const timestamp = todayStr().replace(/-/g, '')
        if (format === 'json') {
          const exportObj = {
            exportTime: new Date().toISOString(),
            totalCount: logs.length,
            logs: logs,
          }
          downloadFile(JSON.stringify(exportObj, null, 2), `操作日志_${timestamp}.json`, 'application/json')
        } else {
          const data = logs.map(l => ({
            日志ID: l.logId,
            操作时间: l.timestamp,
            操作类型: ({
              [LogActionType.IMPORT]: '数据导入',
              [LogActionType.RULE_CHANGE]: '规则变更',
              [LogActionType.BATCH_RECALCULATE]: '批量重算',
              [LogActionType.EXPORT]: '数据导出',
              [LogActionType.REVIEW_STATUS_CHANGE]: '复核状态修改',
              [LogActionType.RESET]: '数据重置',
            } as Record<string, string>)[l.actionType] || l.actionType,
            操作者: l.operator,
            描述: l.description,
            详情: JSON.stringify(l.details),
          }))
          const csv = generateCSV(data)
          downloadFile(csv, `操作日志_${timestamp}.csv`, 'text/csv')
        }
        get().addLog(LogActionType.EXPORT, `导出操作日志（${format.toUpperCase()}，${logs.length}条）`, {
          format,
          count: logs.length,
        })
      },

      setCurrentOperator: (name: string) => {
        set({ currentOperator: name })
      },
    }),
    {
      name: 'chronic-disease-review-board',
      partialize: state => ({
        residents: state.residents,
        appointments: state.appointments,
        followups: state.followups,
        importedFileHashes: state.importedFileHashes,
        anomalies: state.anomalies,
        unregisteredRecords: state.unregisteredRecords,
        qcRules: state.qcRules,
        ruleVersions: state.ruleVersions,
        currentRuleVersion: state.currentRuleVersion,
        operationLogs: state.operationLogs,
        currentOperator: state.currentOperator,
        preCheckConfig: state.preCheckConfig,
      }),
    }
  )
)
