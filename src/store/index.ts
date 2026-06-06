import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  Anomaly,
  AnomalyType,
  Appointment,
  DataType,
  DEFAULT_LOG_FILTERS,
  DEFAULT_QC_RULES,
  Filters,
  Followup,
  ImportResult,
  LogActionType,
  LogFilters,
  OperationLog,
  QualityControlRules,
  Resident,
  ReviewStatus,
  RuleVersion,
  UnregisteredRecord,
} from '@/types'
import { parseCSV, generateCSV, downloadFile } from '@/utils/csv'
import { validateData } from '@/utils/validator'
import { detectAnomalies, calculateRuleDiffPreview } from '@/utils/anomaly'
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
  importData: (type: DataType, fileText: string, fileName: string) => Promise<ImportResult>
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
      }),
    }
  )
)
