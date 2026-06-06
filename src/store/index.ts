import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  Anomaly,
  Appointment,
  DataType,
  Filters,
  Followup,
  ImportResult,
  Resident,
  ReviewStatus,
  UnregisteredRecord,
  AnomalyType,
} from '@/types'
import { parseCSV, generateCSV, downloadFile } from '@/utils/csv'
import { validateData } from '@/utils/validator'
import { detectAnomalies } from '@/utils/anomaly'
import { computeHash, todayStr } from '@/utils/helpers'

interface AppState {
  residents: Resident[]
  appointments: Appointment[]
  followups: Followup[]
  importedFileHashes: Record<DataType, string>
  anomalies: Anomaly[]
  unregisteredRecords: UnregisteredRecord[]
  lastImportResult: Record<DataType, ImportResult | null>
  filters: Filters
  importData: (type: DataType, fileText: string, fileName: string) => Promise<ImportResult>
  updateAnomaly: (id: string, status?: ReviewStatus, remark?: string, handler?: string) => void
  setFilters: (filters: Partial<Filters>) => void
  resetFilters: () => void
  getFilteredAnomalies: () => Anomaly[]
  exportFilteredData: (format: 'json' | 'csv') => void
  resetAll: () => void
}

const DEFAULT_FILTERS: Filters = {
  sites: [],
  nurses: [],
  anomalyTypes: [],
  statuses: [],
  searchText: '',
}

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
            s.anomalies
          )
          newState.anomalies = anomalies
          newState.unregisteredRecords = unregisteredRecords

          return newState
        })

        return get().lastImportResult[type]!
      },

      updateAnomaly: (id, status, remark, handler) => {
        set(s => ({
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
        }))
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
      },

      resetAll: () => {
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
      }),
    }
  )
)
