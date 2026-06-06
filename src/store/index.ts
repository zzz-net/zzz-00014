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
  DEFAULT_FILTERS,
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
  ImportBatch,
  ImportBatchSnapshot,
  ImportBatchPreCheckSummary,
  RevertBatchResult,
  SchemeDraft,
  SandboxApplyResult,
  SandboxUndoResult,
  SandboxApplyHistory,
  ImportValidationResult,
  SCHEME_DRAFT_SCHEMA_VERSION,
  HandoverPackage,
  HandoverImportValidationResult,
  HandoverApplyResult,
  HandoverUndoResult,
  HandoverApplyHistory,
  UserRole,
  ShiftTodoList,
  ShiftTodoImportValidationResult,
  ShiftTodoUndoResult,
  ShiftTodoUndoHistory,
  ShiftTodoUndoSnapshot,
} from '@/types'
import { parseCSV, generateCSV, downloadFile } from '@/utils/csv'
import { validateData } from '@/utils/validator'
import { detectAnomalies, calculateRuleDiffPreview } from '@/utils/anomaly'
import { preCheckResidents, preCheckAppointments, preCheckFollowups, buildPreCheckResult } from '@/utils/precheck'
import { computeHash, generateId, todayStr } from '@/utils/helpers'
import {
  validateDraftImport,
  serializeDraftForExport,
} from '@/utils/sandbox'
import {
  buildHandoverPackage,
  serializeHandoverForExport,
  handoverToCSV,
  validateHandoverImport,
} from '@/utils/handover'
import {
  buildShiftTodoList,
  anomalyToShiftTodoItem,
  serializeShiftTodoForExport,
  shiftTodoToCSV,
  validateShiftTodoImport,
} from '@/utils/shiftTodo'

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
  importBatches: ImportBatch[]
  schemeDrafts: SchemeDraft[]
  sandboxApplyHistory: SandboxApplyHistory[]
  handoverPackages: HandoverPackage[]
  handoverApplyHistory: HandoverApplyHistory[]
  selectedAnomalyIds: string[]
  toggleAnomalySelection: (anomalyId: string) => void
  clearAnomalySelection: () => void
  selectAllFilteredAnomalies: () => void
  createHandoverPackage: (params: { name: string; description: string; sourceMode: 'filter' | 'selected' }) => HandoverPackage
  exportHandoverPackage: (packageId: string, format: 'json' | 'csv') => void
  importHandoverPackage: (jsonText: string) => HandoverImportValidationResult
  applyHandoverPackage: (packageId: string) => HandoverApplyResult
  undoLastHandoverApply: () => HandoverUndoResult
  deleteHandoverPackage: (packageId: string) => void
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
  revertLastBatch: () => RevertBatchResult
  revertBatch: (batchId: string) => RevertBatchResult
  exportBatches: (format: 'json' | 'csv') => void
  _createImportBatch: (
    type: DataType,
    fileName: string,
    fileHash: string,
    importedCount: number,
    skippedCount: number,
    mode: 'all' | 'validOnly' | 'direct',
    preCheckResult: PreCheckResult | null,
    snapshot: ImportBatchSnapshot
  ) => void
  saveSchemeDraft: (name: string, description: string, qcRules: QualityControlRules, preCheckConfig: PreCheckConfig) => SchemeDraft
  updateSchemeDraft: (draftId: string, updates: Partial<SchemeDraft>) => void
  deleteSchemeDraft: (draftId: string) => void
  loadSchemeDraft: (draftId: string) => { qcRules: QualityControlRules; preCheckConfig: PreCheckConfig } | null
  exportSchemeDraft: (draftId: string) => void
  importSchemeDraft: (jsonText: string) => ImportValidationResult
  previewSchemeDraft: (draftId: string) => ReturnType<typeof calculateRuleDiffPreview> | null
  applySchemeDraft: (draftId: string) => SandboxApplyResult
  undoLastSandboxApply: () => SandboxUndoResult
  currentRole: UserRole
  setCurrentRole: (role: UserRole) => void
  shiftTodoLists: ShiftTodoList[]
  shiftTodoUndoHistory: ShiftTodoUndoHistory[]
  createShiftTodoList: (name: string, description: string) => ShiftTodoList | null
  deleteShiftTodoList: (listId: string) => boolean
  batchAddAnomaliesToShiftTodo: (params: {
    listId: string
    sourceMode: 'filter' | 'selected'
    responsibleNurse: string
    deadline: string
    handlingNote: string
  }) => { success: boolean; message: string; addedCount: number }
  removeShiftTodoItem: (listId: string, itemId: string) => boolean
  toggleShiftTodoItemComplete: (listId: string, itemId: string) => boolean
  exportShiftTodoList: (listId: string, format: 'json' | 'csv') => void
  importShiftTodoList: (jsonText: string) => ShiftTodoImportValidationResult
  undoLastShiftTodoBatchAction: () => ShiftTodoUndoResult
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
      importBatches: [],
      schemeDrafts: [],
      sandboxApplyHistory: [],
      handoverPackages: [],
      handoverApplyHistory: [],
      selectedAnomalyIds: [],
      currentRole: UserRole.HEAD_NURSE,
      shiftTodoLists: [],
      shiftTodoUndoHistory: [],

      toggleAnomalySelection: (anomalyId) => {
        set(s => {
          const exists = s.selectedAnomalyIds.includes(anomalyId)
          return {
            selectedAnomalyIds: exists
              ? s.selectedAnomalyIds.filter(id => id !== anomalyId)
              : [...s.selectedAnomalyIds, anomalyId],
          }
        })
      },

      clearAnomalySelection: () => {
        set({ selectedAnomalyIds: [] })
      },

      selectAllFilteredAnomalies: () => {
        const filtered = get().getFilteredAnomalies()
        set({ selectedAnomalyIds: filtered.map(a => a.anomalyId) })
      },

      createHandoverPackage: ({ name, description, sourceMode }) => {
        const s = get()
        const anomalies = sourceMode === 'selected'
          ? s.anomalies.filter(a => s.selectedAnomalyIds.includes(a.anomalyId))
          : s.getFilteredAnomalies()
        const currentVersion = s.ruleVersions.find(v => v.version === s.currentRuleVersion)
        const pkg = buildHandoverPackage({
          name,
          description,
          sourceMode,
          filters: sourceMode === 'filter' ? s.filters : null,
          anomalies,
          importBatches: s.importBatches,
          ruleVersion: s.currentRuleVersion,
          ruleVersionName: currentVersion?.name || s.currentRuleVersion,
          qcRules: s.qcRules,
          operator: s.currentOperator,
        })
        set(state => ({ handoverPackages: [pkg, ...state.handoverPackages].slice(0, 50) }))
        get().addLog(LogActionType.HANDOVER_CREATE, `生成交接包：${pkg.name}（${anomalies.length}条）`, {
          packageId: pkg.packageId,
          name: pkg.name,
          sourceMode,
          anomalyCount: anomalies.length,
          ruleVersion: pkg.ruleVersion,
        })
        return pkg
      },

      exportHandoverPackage: (packageId, format) => {
        const pkg = get().handoverPackages.find(p => p.packageId === packageId)
        if (!pkg) return
        const timestamp = todayStr().replace(/-/g, '')
        const safeName = pkg.name.replace(/[\\/:*?"<>|]/g, '_')
        if (format === 'json') {
          const json = serializeHandoverForExport(pkg)
          downloadFile(json, `交接包_${safeName}_${timestamp}.json`, 'application/json')
        } else {
          const csv = handoverToCSV(pkg)
          downloadFile(csv, `交接包_${safeName}_${timestamp}.csv`, 'text/csv')
        }
        get().addLog(LogActionType.HANDOVER_EXPORT, `导出交接包：${pkg.name}（${format.toUpperCase()}）`, {
          packageId,
          name: pkg.name,
          format,
          anomalyCount: pkg.anomalies.length,
        })
      },

      importHandoverPackage: (jsonText) => {
        const s = get()
        const result = validateHandoverImport(jsonText, s.anomalies)
        if (result.valid && result.parsedPackage) {
          const imported: HandoverPackage = {
            ...result.parsedPackage,
            packageId: generateId('HANDOVER'),
            createdAt: new Date().toISOString(),
            createdBy: s.currentOperator,
          }
          set(state => ({ handoverPackages: [imported, ...state.handoverPackages].slice(0, 50) }))
          get().addLog(LogActionType.HANDOVER_IMPORT, `导入交接包：${imported.name}`, {
            packageId: imported.packageId,
            name: imported.name,
            sourceAnomalyCount: imported.anomalies.length,
            applicableCount: result.applicableCount,
            protectedCount: result.protectedCount,
            notFoundCount: result.notFoundCount,
            olderStatusCount: result.olderStatusCount,
          })
        }
        return result
      },

      applyHandoverPackage: (packageId): HandoverApplyResult => {
        const s = get()
        const pkg = s.handoverPackages.find(p => p.packageId === packageId)
        if (!pkg) {
          return { success: false, message: '交接包不存在', updatedCount: 0, protectedCount: 0, skippedCount: 0 }
        }

        const PROTECTED = [ReviewStatus.CONFIRMED, ReviewStatus.IGNORED]
        const UPDATEABLE = [ReviewStatus.PENDING, ReviewStatus.NEED_HOME_VISIT]
        const snapshot: HandoverApplyHistory['snapshot'] = {
          anomalies: s.anomalies.map(a => ({ ...a })),
        }

        let updatedCount = 0
        let protectedCount = 0
        let skippedCount = 0
        const newAnomalies: Anomaly[] = []

        s.anomalies.forEach(local => {
          const handoverItem = pkg.anomalies.find(h => h.anomalyId === local.anomalyId)
          if (!handoverItem) {
            newAnomalies.push(local)
            return
          }
          if (PROTECTED.includes(local.status)) {
            protectedCount++
            newAnomalies.push(local)
            return
          }
          if (!UPDATEABLE.includes(local.status)) {
            skippedCount++
            newAnomalies.push(local)
            return
          }
          if (handoverItem.updatedAt && local.updatedAt && new Date(handoverItem.updatedAt) < new Date(local.updatedAt)) {
            skippedCount++
            newAnomalies.push(local)
            return
          }
          updatedCount++
          newAnomalies.push({
            ...local,
            status: handoverItem.status,
            remark: handoverItem.remark,
            handler: handoverItem.handler,
            updatedAt: new Date().toISOString(),
          })
        })

        set({ anomalies: newAnomalies })

        const history: HandoverApplyHistory = {
          historyId: generateId('HHIST'),
          packageId: pkg.packageId,
          packageName: pkg.name,
          appliedAt: new Date().toISOString(),
          appliedBy: s.currentOperator,
          updatedCount,
          protectedCount,
          skippedCount,
          snapshot,
          undone: false,
          undoneAt: null,
          undoneBy: null,
        }
        set(state => ({ handoverApplyHistory: [history, ...state.handoverApplyHistory].slice(0, 50) }))

        get().addLog(LogActionType.HANDOVER_APPLY, `应用交接包：${pkg.name}`, {
          packageId,
          name: pkg.name,
          updatedCount,
          protectedCount,
          skippedCount,
          historyId: history.historyId,
        })

        return {
          success: true,
          message: `已应用交接包「${pkg.name}」。更新${updatedCount}条待处理/需上门记录，保护${protectedCount}条已人工复核记录，跳过${skippedCount}条冲突记录。`,
          updatedCount,
          protectedCount,
          skippedCount,
          historyId: history.historyId,
        }
      },

      undoLastHandoverApply: (): HandoverUndoResult => {
        const s = get()
        const nonUndone = s.handoverApplyHistory.filter(h => !h.undone)
        if (nonUndone.length === 0) {
          return { success: false, message: '没有可撤销的交接包应用记录', blockedReason: 'NO_HISTORY', restoredCount: 0, protectedCount: 0 }
        }
        const last = nonUndone[0]
        const PROTECTED = [ReviewStatus.CONFIRMED, ReviewStatus.IGNORED]
        const currentAnomalyMap = new Map(s.anomalies.map(a => [a.anomalyId, a]))
        const snapshotMap = new Map(last.snapshot.anomalies.map(a => [a.anomalyId, a]))

        const mergedAnomalies: Anomaly[] = []
        const processedKeys = new Set<string>()

        last.snapshot.anomalies.forEach(sa => {
          processedKeys.add(sa.anomalyId)
          const current = currentAnomalyMap.get(sa.anomalyId)
          if (current && PROTECTED.includes(current.status)) {
            mergedAnomalies.push(current)
          } else {
            mergedAnomalies.push(sa)
          }
        })

        s.anomalies.forEach(ca => {
          if (!processedKeys.has(ca.anomalyId) && PROTECTED.includes(ca.status)) {
            mergedAnomalies.push(ca)
          }
        })

        const protectedAnomalyIds = new Set(
          s.anomalies.filter(a => PROTECTED.includes(a.status)).map(a => a.anomalyId)
        )
        const protectedCount = Array.from(protectedAnomalyIds).length
        const restoredCount = mergedAnomalies.filter(a => snapshotMap.has(a.anomalyId) && !PROTECTED.includes(a.status)).length

        set(prev => ({
          anomalies: mergedAnomalies,
          handoverApplyHistory: prev.handoverApplyHistory.map(h =>
            h.historyId === last.historyId
              ? { ...h, undone: true, undoneAt: new Date().toISOString(), undoneBy: prev.currentOperator }
              : h
          ),
        }))

        get().addLog(LogActionType.HANDOVER_UNDO, `撤销交接包应用：${last.packageName}`, {
          historyId: last.historyId,
          packageId: last.packageId,
          packageName: last.packageName,
          restoredCount,
          protectedCount,
        })

        return {
          success: true,
          message: `已撤销交接包「${last.packageName}」的应用，恢复${restoredCount}条记录，保护${protectedCount}条人工复核结果。`,
          restoredCount,
          protectedCount,
        }
      },

      deleteHandoverPackage: (packageId) => {
        const pkg = get().handoverPackages.find(p => p.packageId === packageId)
        set(s => ({ handoverPackages: s.handoverPackages.filter(p => p.packageId !== packageId) }))
        if (pkg) {
          get().addLog(LogActionType.HANDOVER_EXPORT, `删除交接包：${pkg.name}`, {
            packageId,
            name: pkg.name,
          })
        }
      },

      setCurrentRole: (role) => {
        set({ currentRole: role })
      },

      createShiftTodoList: (name, description) => {
        if (get().currentRole !== UserRole.HEAD_NURSE) return null
        if (!name.trim()) return null
        const operator = get().currentOperator
        const list = buildShiftTodoList({ name: name.trim(), description: description.trim(), operator })
        set(s => ({ shiftTodoLists: [list, ...s.shiftTodoLists].slice(0, 100) }))
        get().addLog(LogActionType.SHIFT_TODO_LIST_CREATE, `新建班次待办清单：${list.name}`, {
          listId: list.listId,
          name: list.name,
          itemCount: 0,
        })
        return list
      },

      deleteShiftTodoList: (listId) => {
        if (get().currentRole !== UserRole.HEAD_NURSE) return false
        const list = get().shiftTodoLists.find(l => l.listId === listId)
        if (!list) return false
        set(s => ({ shiftTodoLists: s.shiftTodoLists.filter(l => l.listId !== listId) }))
        get().addLog(LogActionType.SHIFT_TODO_LIST_DELETE, `删除班次待办清单：${list.name}`, {
          listId,
          name: list.name,
          itemCount: list.items.length,
        })
        return true
      },

      batchAddAnomaliesToShiftTodo: ({ listId, sourceMode, responsibleNurse, deadline, handlingNote }) => {
        if (get().currentRole !== UserRole.HEAD_NURSE) {
          return { success: false, message: '仅护士长可批量加入待办', addedCount: 0 }
        }
        const s = get()
        const list = s.shiftTodoLists.find(l => l.listId === listId)
        if (!list) return { success: false, message: '清单不存在', addedCount: 0 }

        const anomalies = sourceMode === 'selected'
          ? s.anomalies.filter(a => s.selectedAnomalyIds.includes(a.anomalyId))
          : s.getFilteredAnomalies()

        if (anomalies.length === 0) {
          return { success: false, message: sourceMode === 'filter' ? '当前筛选结果为空' : '请先勾选至少一条记录', addedCount: 0 }
        }

        const existingAnomalyIds = new Set(list.items.map(i => i.anomalyId))
        const newAnomalies = anomalies.filter(a => !existingAnomalyIds.has(a.anomalyId))
        if (newAnomalies.length === 0) {
          return { success: false, message: '这些异常记录已全部在清单中', addedCount: 0 }
        }

        const operator = s.currentOperator
        const snapshot: ShiftTodoUndoSnapshot = {
          lists: s.shiftTodoLists.map(l => ({
            ...l,
            items: l.items.map(i => ({ ...i })),
          })),
        }

        const newItems = newAnomalies.map(a => anomalyToShiftTodoItem(a, {
          responsibleNurse,
          deadline,
          handlingNote,
          operator,
        }))

        set(prev => ({
          shiftTodoLists: prev.shiftTodoLists.map(l =>
            l.listId === listId
              ? { ...l, items: [...l.items, ...newItems], updatedAt: new Date().toISOString() }
              : l
          ),
        }))

        const history: ShiftTodoUndoHistory = {
          historyId: generateId('STHIST'),
          actionType: 'BATCH_ADD',
          listId,
          listName: list.name,
          actionAt: new Date().toISOString(),
          actionBy: operator,
          snapshot,
          addedItemCount: newItems.length,
          undone: false,
          undoneAt: null,
          undoneBy: null,
        }
        set(prev => ({ shiftTodoUndoHistory: [history, ...prev.shiftTodoUndoHistory].slice(0, 50) }))

        get().addLog(LogActionType.SHIFT_TODO_ITEM_BATCH_ADD, `批量加入待办：${list.name}（${newItems.length}条）`, {
          listId,
          listName: list.name,
          sourceMode,
          addedCount: newItems.length,
          historyId: history.historyId,
        })

        return { success: true, message: `已加入 ${newItems.length} 条待办到「${list.name}」`, addedCount: newItems.length }
      },

      removeShiftTodoItem: (listId, itemId) => {
        const s = get()
        const list = s.shiftTodoLists.find(l => l.listId === listId)
        if (!list) return false
        const item = list.items.find(i => i.itemId === itemId)
        if (!item) return false

        set(prev => ({
          shiftTodoLists: prev.shiftTodoLists.map(l =>
            l.listId === listId
              ? { ...l, items: l.items.filter(i => i.itemId !== itemId), updatedAt: new Date().toISOString() }
              : l
          ),
        }))
        get().addLog(LogActionType.SHIFT_TODO_ITEM_REMOVE, `移出待办：${list.name} - ${item.anomalyId}`, {
          listId,
          listName: list.name,
          itemId,
          anomalyId: item.anomalyId,
          residentId: item.residentId,
        })
        return true
      },

      toggleShiftTodoItemComplete: (listId, itemId) => {
        const s = get()
        const operator = s.currentOperator
        const list = s.shiftTodoLists.find(l => l.listId === listId)
        if (!list) return false
        const item = list.items.find(i => i.itemId === itemId)
        if (!item) return false

        const now = new Date().toISOString()
        set(prev => ({
          shiftTodoLists: prev.shiftTodoLists.map(l =>
            l.listId === listId
              ? {
                ...l,
                items: l.items.map(i =>
                  i.itemId === itemId
                    ? {
                        ...i,
                        completed: !i.completed,
                        completedAt: !i.completed ? now : null,
                        completedBy: !i.completed ? operator : null,
                      }
                    : i
                ),
                updatedAt: now,
              }
              : l
          ),
        }))
        get().addLog(LogActionType.SHIFT_TODO_ITEM_COMPLETE, `${item.completed ? '取消完成' : '标记完成'}: ${list.name} - ${item.anomalyId}`, {
          listId,
          listName: list.name,
          itemId,
          anomalyId: item.anomalyId,
          completed: !item.completed,
          operator,
        })
        return true
      },

      exportShiftTodoList: (listId, format) => {
        const list = get().shiftTodoLists.find(l => l.listId === listId)
        if (!list) return
        const timestamp = todayStr().replace(/-/g, '')
        const safeName = list.name.replace(/[\\/:*?"<>|]/g, '_')
        if (format === 'json') {
          const json = serializeShiftTodoForExport(list)
          downloadFile(json, `班次待办_${safeName}_${timestamp}.json`, 'application/json')
        } else {
          const csv = shiftTodoToCSV(list)
          downloadFile(csv, `班次待办_${safeName}_${timestamp}.csv`, 'text/csv')
        }
        get().addLog(LogActionType.SHIFT_TODO_EXPORT, `导出班次待办：${list.name}（${format.toUpperCase()}）`, {
          listId,
          name: list.name,
          format,
          itemCount: list.items.length,
        })
      },

      importShiftTodoList: (jsonText) => {
        if (get().currentRole !== UserRole.HEAD_NURSE) {
          return {
            valid: false,
            canImport: false,
            issues: [{ code: 'PERMISSION_DENIED', severity: 'error', message: '仅护士长可导入清单', suggestion: '请切换到护士长模式后再导入' }],
            errorCount: 1,
            warningCount: 0,
            notFoundCount: 0,
            updatedCount: 0,
          }
        }
        const s = get()
        const result = validateShiftTodoImport(jsonText, s.shiftTodoLists, s.anomalies)
        if (result.valid && result.canImport && result.parsedList) {
          const snapshot: ShiftTodoUndoSnapshot = {
            lists: s.shiftTodoLists.map(l => ({
              ...l,
              items: l.items.map(i => ({ ...i })),
            })),
          }
          const imported: ShiftTodoList = {
            ...result.parsedList,
            listId: generateId('SHLIST'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: s.currentOperator,
            items: result.parsedList.items.map(i => ({ ...i, itemId: generateId('TODO') })),
          }
          set(prev => ({ shiftTodoLists: [imported, ...prev.shiftTodoLists].slice(0, 100) }))

          const history: ShiftTodoUndoHistory = {
            historyId: generateId('STHIST'),
            actionType: 'IMPORT',
            listId: imported.listId,
            listName: imported.name,
            actionAt: new Date().toISOString(),
            actionBy: s.currentOperator,
            snapshot,
            addedItemCount: imported.items.length,
            undone: false,
            undoneAt: null,
            undoneBy: null,
          }
          set(prev => ({ shiftTodoUndoHistory: [history, ...prev.shiftTodoUndoHistory].slice(0, 50) }))

          get().addLog(LogActionType.SHIFT_TODO_IMPORT, `导入班次待办清单：${imported.name}`, {
            listId: imported.listId,
            name: imported.name,
            sourceItemCount: imported.items.length,
            notFoundCount: result.notFoundCount,
            updatedCount: result.updatedCount,
            historyId: history.historyId,
          })
        }
        return result
      },

      undoLastShiftTodoBatchAction: () => {
        const s = get()
        const nonUndone = s.shiftTodoUndoHistory.filter(h => !h.undone)
        if (nonUndone.length === 0) {
          return { success: false, message: '没有可撤销的班次待办批量操作', blockedReason: 'NO_HISTORY' as const, restoredListCount: 0, removedItemCount: 0 }
        }
        const last = nonUndone[0]
        set(prev => ({
          shiftTodoLists: last.snapshot.lists,
          shiftTodoUndoHistory: prev.shiftTodoUndoHistory.map(h =>
            h.historyId === last.historyId
              ? { ...h, undone: true, undoneAt: new Date().toISOString(), undoneBy: prev.currentOperator }
              : h
          ),
        }))
        get().addLog(LogActionType.SHIFT_TODO_UNDO, `撤销班次待办操作：${last.listName}`, {
          historyId: last.historyId,
          listId: last.listId,
          listName: last.listName,
          actionType: last.actionType,
          removedItemCount: last.addedItemCount,
          restoredListCount: last.snapshot.lists.length,
        })
        return {
          success: true,
          message: `已撤销${last.actionType === 'BATCH_ADD' ? '批量加入' : '导入'}操作「${last.listName}」，恢复${last.snapshot.lists.length}个清单，移除${last.addedItemCount}条待办`,
          restoredListCount: last.snapshot.lists.length,
          removedItemCount: last.addedItemCount,
        }
      },

      saveSchemeDraft: (name, description, qcRules, preCheckConfig) => {
        const operator = get().currentOperator
        const draft: SchemeDraft = {
          draftId: generateId('DRAFT'),
          name: name || `草稿 ${new Date().toLocaleString('zh-CN')}`,
          description,
          qcRules: { ...qcRules, homeVisitStatusMappings: [...qcRules.homeVisitStatusMappings] },
          preCheckConfig: { ...preCheckConfig },
          schemaVersion: SCHEME_DRAFT_SCHEMA_VERSION,
          createdAt: new Date().toISOString(),
          createdBy: operator,
          updatedAt: new Date().toISOString(),
        }
        set(s => ({ schemeDrafts: [draft, ...s.schemeDrafts].slice(0, 100) }))
        get().addLog(LogActionType.SANDBOX_DRAFT_SAVE, `保存方案草稿：${draft.name}`, {
          draftId: draft.draftId,
          name: draft.name,
          qcRules: draft.qcRules,
          preCheckConfig: draft.preCheckConfig,
        })
        return draft
      },

      updateSchemeDraft: (draftId, updates) => {
        set(s => ({
          schemeDrafts: s.schemeDrafts.map(d =>
            d.draftId === draftId
              ? { ...d, ...updates, updatedAt: new Date().toISOString() }
              : d
          ),
        }))
      },

      deleteSchemeDraft: (draftId) => {
        const draft = get().schemeDrafts.find(d => d.draftId === draftId)
        set(s => ({ schemeDrafts: s.schemeDrafts.filter(d => d.draftId !== draftId) }))
        if (draft) {
          get().addLog(LogActionType.SANDBOX_DRAFT_DELETE, `删除方案草稿：${draft.name}`, {
            draftId,
            name: draft.name,
          })
        }
      },

      loadSchemeDraft: (draftId) => {
        const draft = get().schemeDrafts.find(d => d.draftId === draftId)
        if (!draft) return null
        get().addLog(LogActionType.SANDBOX_DRAFT_LOAD, `加载方案草稿：${draft.name}`, {
          draftId,
          name: draft.name,
        })
        return {
          qcRules: { ...draft.qcRules, homeVisitStatusMappings: [...draft.qcRules.homeVisitStatusMappings] },
          preCheckConfig: { ...draft.preCheckConfig },
        }
      },

      exportSchemeDraft: (draftId) => {
        const draft = get().schemeDrafts.find(d => d.draftId === draftId)
        if (!draft) return
        const json = serializeDraftForExport(draft)
        const safeName = draft.name.replace(/[\\/:*?"<>|]/g, '_')
        downloadFile(json, `方案草稿_${safeName}_${todayStr().replace(/-/g, '')}.json`, 'application/json')
        get().addLog(LogActionType.SANDBOX_DRAFT_EXPORT, `导出方案草稿：${draft.name}`, {
          draftId,
          name: draft.name,
        })
      },

      importSchemeDraft: (jsonText) => {
        const result = validateDraftImport(jsonText, get().schemeDrafts, get().qcRules)
        if (result.valid && result.canImport && result.parsedDraft) {
          const imported: SchemeDraft = {
            ...result.parsedDraft,
            draftId: generateId('DRAFT'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: get().currentOperator,
          }
          set(s => ({ schemeDrafts: [imported, ...s.schemeDrafts].slice(0, 100) }))
          get().addLog(LogActionType.SANDBOX_DRAFT_IMPORT, `导入方案草稿：${imported.name}`, {
            draftId: imported.draftId,
            name: imported.name,
            issuesCount: result.issues.length,
          })
        }
        return result
      },

      previewSchemeDraft: (draftId) => {
        const draft = get().schemeDrafts.find(d => d.draftId === draftId)
        if (!draft) return null
        const preview = get().previewRuleChange(draft.qcRules)
        get().addLog(LogActionType.SANDBOX_PREVIEW, `预跑方案草稿：${draft.name}`, {
          draftId,
          name: draft.name,
          addedCount: preview.added.length,
          removedCount: preview.removed.length,
          changedCount: preview.changed.length,
          protectedCount: preview.protectedCount,
        })
        return preview
      },

      applySchemeDraft: (draftId): SandboxApplyResult => {
        const draft = get().schemeDrafts.find(d => d.draftId === draftId)
        if (!draft) {
          return { success: false, message: '草稿不存在', protectedAnomalyCount: 0, diffSummary: { addedCount: 0, removedCount: 0, changedCount: 0, protectedCount: 0 } }
        }

        const { residents, appointments, followups, anomalies, qcRules: oldRules, currentRuleVersion: oldVersion, currentOperator } = get()
        const preview = calculateRuleDiffPreview(residents, appointments, followups, anomalies, oldRules, draft.qcRules)

        const versionNum = get().ruleVersions.length + 1
        const newVersion: RuleVersion = {
          version: `v1.${versionNum}.0-sandbox-${Date.now().toString(36)}`,
          name: draft.name || `沙盒方案 ${versionNum}`,
          rules: { ...draft.qcRules, homeVisitStatusMappings: [...draft.qcRules.homeVisitStatusMappings] },
          createdAt: new Date().toISOString(),
          createdBy: currentOperator,
          description: draft.description ? `${draft.description}（来自沙盒方案）` : '由沙盒方案应用生成',
        }

        const detection = detectAnomalies(residents, appointments, followups, anomalies, draft.qcRules, true)

        set(s => ({
          qcRules: { ...draft.qcRules, homeVisitStatusMappings: [...draft.qcRules.homeVisitStatusMappings] },
          preCheckConfig: { ...draft.preCheckConfig },
          ruleVersions: [...s.ruleVersions, newVersion],
          currentRuleVersion: newVersion.version,
          anomalies: detection.anomalies,
          unregisteredRecords: detection.unregisteredRecords,
        }))

        const history: SandboxApplyHistory = {
          historyId: generateId('SHIST'),
          draftId: draft.draftId,
          draftName: draft.name,
          appliedAt: new Date().toISOString(),
          appliedBy: currentOperator,
          previousRules: { ...oldRules, homeVisitStatusMappings: [...oldRules.homeVisitStatusMappings] },
          previousVersion: oldVersion,
          newVersion: newVersion.version,
          diffSummary: {
            addedCount: preview.added.length,
            removedCount: preview.removed.length,
            changedCount: preview.changed.length,
            protectedCount: preview.protectedCount,
          },
          undone: false,
          undoneAt: null,
          undoneBy: null,
        }
        set(s => ({ sandboxApplyHistory: [history, ...s.sandboxApplyHistory].slice(0, 50) }))

        get().addLog(LogActionType.SANDBOX_APPLY, `应用沙盒方案：${draft.name} → 新版本 ${newVersion.name}`, {
          draftId: draft.draftId,
          draftName: draft.name,
          newVersion: newVersion.version,
          newVersionName: newVersion.name,
          previousVersion: oldVersion,
          diffSummary: history.diffSummary,
          source: 'sandbox',
        })

        return {
          success: true,
          message: `已应用方案「${draft.name}」，生成规则版本「${newVersion.name}」。新增${preview.added.length}条、移除${preview.removed.length}条、变更${preview.changed.length}条异常，保护${preview.protectedCount}条人工复核记录。`,
          newVersion,
          protectedAnomalyCount: preview.protectedCount,
          diffSummary: {
            addedCount: preview.added.length,
            removedCount: preview.removed.length,
            changedCount: preview.changed.length,
            protectedCount: preview.protectedCount,
          },
        }
      },

      undoLastSandboxApply: (): SandboxUndoResult => {
        const s = get()
        const nonUndone = s.sandboxApplyHistory.filter(h => !h.undone)
        if (nonUndone.length === 0) {
          return { success: false, message: '没有可撤销的沙盒应用记录', blockedReason: 'NO_HISTORY', protectedAnomalyCount: 0 }
        }

        const last = nonUndone[0]

        const PROTECTED = [ReviewStatus.CONFIRMED, ReviewStatus.IGNORED]
        const protectedAnomalyIds = new Set(
          s.anomalies.filter(a => PROTECTED.includes(a.status)).map(a => a.anomalyId)
        )
        const currentAnomalyMap = new Map(s.anomalies.map(a => [a.anomalyId, a]))

        const { anomalies: restoredBaseAnomalies } = detectAnomalies(
          s.residents,
          s.appointments,
          s.followups,
          s.anomalies,
          last.previousRules,
          false
        )

        const mergedAnomalies: Anomaly[] = []
        const processedKeys = new Set<string>()

        restoredBaseAnomalies.forEach(ra => {
          processedKeys.add(ra.anomalyId)
          const current = currentAnomalyMap.get(ra.anomalyId)
          if (current && PROTECTED.includes(current.status)) {
            mergedAnomalies.push(current)
          } else {
            mergedAnomalies.push(ra)
          }
        })

        s.anomalies.forEach(ca => {
          if (!processedKeys.has(ca.anomalyId) && PROTECTED.includes(ca.status)) {
            mergedAnomalies.push(ca)
            protectedAnomalyIds.add(ca.anomalyId)
          }
        })

        const protectedCount = Array.from(protectedAnomalyIds).filter(id => {
          const a = currentAnomalyMap.get(id)
          return a && PROTECTED.includes(a.status)
        }).length

        set(prev => ({
          qcRules: { ...last.previousRules, homeVisitStatusMappings: [...last.previousRules.homeVisitStatusMappings] },
          currentRuleVersion: last.previousVersion,
          anomalies: mergedAnomalies,
          sandboxApplyHistory: prev.sandboxApplyHistory.map(h =>
            h.historyId === last.historyId
              ? { ...h, undone: true, undoneAt: new Date().toISOString(), undoneBy: prev.currentOperator }
              : h
          ),
        }))

        const detection = detectAnomalies(s.residents, s.appointments, s.followups, mergedAnomalies, last.previousRules, true)
        set({ anomalies: detection.anomalies, unregisteredRecords: detection.unregisteredRecords })

        get().addLog(LogActionType.SANDBOX_UNDO, `撤销沙盒应用：${last.draftName}，恢复到版本 ${last.previousVersion}`, {
          historyId: last.historyId,
          draftId: last.draftId,
          draftName: last.draftName,
          restoredVersion: last.previousVersion,
          newVersion: last.newVersion,
          protectedAnomalyCount: protectedCount,
        })

        return {
          success: true,
          message: `已撤销方案「${last.draftName}」的应用，恢复到版本 ${last.previousVersion}，保留${protectedCount}条已人工确认/忽略的复核结果。`,
          restoredVersion: last.previousVersion,
          protectedAnomalyCount: protectedCount,
        }
      },

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

      _createImportBatch: (
        type: DataType,
        fileName: string,
        fileHash: string,
        importedCount: number,
        skippedCount: number,
        mode: 'all' | 'validOnly' | 'direct',
        preCheckResult: PreCheckResult | null,
        snapshot: ImportBatchSnapshot
      ) => {
        let preCheckSummary: ImportBatchPreCheckSummary | null = null
        if (preCheckResult) {
          const typeResult = preCheckResult.dataTypes[type]
          if (typeResult) {
            const uniqueCodes = Array.from(new Set(typeResult.issues.map(i => i.code)))
            preCheckSummary = {
              totalRows: typeResult.totalRows,
              validRows: typeResult.validRows,
              invalidRows: typeResult.invalidRowIndices.length,
              warningCount: typeResult.warningCount,
              errorCount: typeResult.errorCount,
              issueCodes: uniqueCodes,
            }
          }
        }
        const batch: ImportBatch = {
          batchId: generateId('BATCH'),
          dataType: type,
          fileName,
          fileHash,
          importedCount,
          skippedCount,
          preCheckSummary,
          operator: get().currentOperator,
          createdAt: new Date().toISOString(),
          reverted: false,
          revertedAt: null,
          revertedBy: null,
          snapshot,
          mode,
        }
        set(s => ({ importBatches: [batch, ...s.importBatches].slice(0, 500) }))
        get().addLog(LogActionType.IMPORT_BATCH_CREATE, `生成导入批次：${DataTypeLabels[type]} ${fileName}（${importedCount}条）`, {
          batchId: batch.batchId,
          type,
          fileName,
          importedCount,
          skippedCount,
          mode,
        })
        return batch
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
        let skippedCount = 0
        if (mode === 'validOnly') {
          const errorRowIndices = new Set(typeResult.invalidRowIndices)
          const warningRowIndices = new Set<number>()
          typeResult.issues.forEach(issue => {
            if (issue.severity === 'warning' && issue.row >= 2) {
              warningRowIndices.add(issue.row - 2)
            }
          })
          const allInvalidIndices = new Set([...errorRowIndices, ...warningRowIndices])
          skippedCount = allInvalidIndices.size
          rows = rows.filter((_, idx) => !allInvalidIndices.has(idx))
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

        const preSnapshot = (() => {
          const s = get()
          return {
            residents: [...s.residents],
            appointments: [...s.appointments],
            followups: [...s.followups],
            anomalies: s.anomalies.map(a => ({ ...a })),
            unregisteredRecords: s.unregisteredRecords.map(u => ({ ...u })),
            importedFileHashes: { ...s.importedFileHashes },
          }
        })()

        set(s => {
          const newState: Partial<AppState> = {
            importedFileHashes: { ...s.importedFileHashes, [type]: hash },
            lastImportResult: {
              ...s.lastImportResult,
              [type]: {
                success: true,
                isDuplicate: false,
                message: `成功导入 ${data.length} 条记录${mode === 'validOnly' ? `（跳过${skippedCount}行无效/警告数据）` : ''}`,
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

        get()._createImportBatch(
          type,
          fileName,
          hash,
          data.length,
          skippedCount,
          mode,
          preCheckResult,
          preSnapshot
        )

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

        const preSnapshot = (() => {
          const s = get()
          return {
            residents: [...s.residents],
            appointments: [...s.appointments],
            followups: [...s.followups],
            anomalies: s.anomalies.map(a => ({ ...a })),
            unregisteredRecords: s.unregisteredRecords.map(u => ({ ...u })),
            importedFileHashes: { ...s.importedFileHashes },
          }
        })()

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

        get()._createImportBatch(
          type,
          fileName,
          hash,
          validation.data.length,
          0,
          'direct',
          null,
          preSnapshot
        )

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
          importBatches: [],
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

      revertLastBatch: () => {
        const batches = get().importBatches.filter(b => !b.reverted)
        if (batches.length === 0) {
          return {
            success: false,
            message: '没有可撤销的成功导入批次',
          }
        }
        return get().revertBatch(batches[0].batchId)
      },

      revertBatch: (batchId: string): RevertBatchResult => {
        const s = get()
        const batch = s.importBatches.find(b => b.batchId === batchId)

        if (!batch) {
          return { success: false, message: `未找到批次 ${batchId}` }
        }

        if (batch.reverted) {
          return {
            success: false,
            message: '该批次已被撤销，不能重复撤销',
            blockedReason: 'ALREADY_REVERTED' as const,
          }
        }

        const nonRevertedBatches = s.importBatches.filter(b => !b.reverted)
        const batchOrderInNonReverted = nonRevertedBatches.findIndex(b => b.batchId === batchId)
        if (batchOrderInNonReverted !== 0) {
          const newerBatch = nonRevertedBatches[batchOrderInNonReverted - 1]
          return {
            success: false,
            message: `批次 ${batch.batchId} 不是最近一次成功导入，请先撤销较新的批次「${newerBatch.fileName}」（${DataTypeLabels[newerBatch.dataType]}，${newerBatch.importedCount}条）`,
            blockedReason: 'NOT_LATEST' as const,
          }
        }

        const currentHash = s.importedFileHashes[batch.dataType]
        if (currentHash !== batch.fileHash) {
          return {
            success: false,
            message: `当前${DataTypeLabels[batch.dataType]}数据文件哈希与批次记录不匹配，可能已被其他操作修改，无法安全撤销`,
            blockedReason: 'HASH_CONFLICT' as const,
          }
        }

        if (batch.dataType === 'residents') {
          const dependents = nonRevertedBatches.filter(
            b => b.batchId !== batchId && (b.dataType === 'appointments' || b.dataType === 'followups')
          )
          if (dependents.length > 0) {
            const depNames = dependents.map(d => `「${d.fileName}（${DataTypeLabels[d.dataType]}）」`).join('、')
            return {
              success: false,
              message: `居民名册批次存在依赖：后续已导入 ${depNames}，请先撤销这些依赖批次`,
              blockedReason: 'DEPENDENCY_EXISTS' as const,
            }
          }
        }

        const snapshot = batch.snapshot
        const PROTECTED = [ReviewStatus.CONFIRMED, ReviewStatus.IGNORED]
        const protectedAnomalyIds = new Set(
          s.anomalies
            .filter(a => PROTECTED.includes(a.status))
            .map(a => a.anomalyId)
        )
        const currentAnomalyMap = new Map(s.anomalies.map(a => [a.anomalyId, a]))

        const mergedAnomalies: Anomaly[] = []
        const processedKeys = new Set<string>()

        snapshot.anomalies.forEach(sa => {
          processedKeys.add(sa.anomalyId)
          const current = currentAnomalyMap.get(sa.anomalyId)
          if (current && PROTECTED.includes(current.status)) {
            mergedAnomalies.push(current)
          } else {
            mergedAnomalies.push(sa)
          }
        })

        s.anomalies.forEach(ca => {
          if (!processedKeys.has(ca.anomalyId) && PROTECTED.includes(ca.status)) {
            mergedAnomalies.push(ca)
            protectedAnomalyIds.add(ca.anomalyId)
          }
        })

        const protectedCount = Array.from(protectedAnomalyIds).filter(id => {
          const a = currentAnomalyMap.get(id)
          return a && PROTECTED.includes(a.status)
        }).length

        set(prev => ({
          residents: snapshot.residents,
          appointments: snapshot.appointments,
          followups: snapshot.followups,
          importedFileHashes: snapshot.importedFileHashes,
          anomalies: mergedAnomalies,
          unregisteredRecords: snapshot.unregisteredRecords,
          importBatches: prev.importBatches.map(b =>
            b.batchId === batchId
              ? {
                  ...b,
                  reverted: true,
                  revertedAt: new Date().toISOString(),
                  revertedBy: prev.currentOperator,
                }
              : b
          ),
        }))

        get().addLog(LogActionType.IMPORT_BATCH_REVERT, `撤销导入批次：${DataTypeLabels[batch.dataType]} ${batch.fileName}`, {
          batchId,
          dataType: batch.dataType,
          fileName: batch.fileName,
          importedCount: batch.importedCount,
          protectedAnomalyCount: protectedCount,
        })

        return {
          success: true,
          message: `已撤销批次 ${batch.fileName}，恢复${DataTypeLabels[batch.dataType]}共${
            batch.dataType === 'residents'
              ? snapshot.residents.length
              : batch.dataType === 'appointments'
                ? snapshot.appointments.length
                : snapshot.followups.length
          }条记录，保留${protectedCount}条已人工复核的异常记录`,
          protectedAnomalyCount: protectedCount,
          restoredDataCount: {
            residents: snapshot.residents.length,
            appointments: snapshot.appointments.length,
            followups: snapshot.followups.length,
          },
        }
      },

      exportBatches: (format: 'json' | 'csv') => {
        const batches = get().importBatches
        const timestamp = todayStr().replace(/-/g, '')

        const issueCodeLabels = (codes: string[]) =>
          codes.map(c => (PreCheckIssueCodeLabels as Record<string, string>)[c] || c).join('、')

        if (format === 'json') {
          const exportObj = {
            exportTime: new Date().toISOString(),
            totalCount: batches.length,
            batches: batches.map(b => ({
              batchId: b.batchId,
              dataType: b.dataType,
              dataTypeLabel: DataTypeLabels[b.dataType],
              fileName: b.fileName,
              fileHash: b.fileHash,
              importedCount: b.importedCount,
              skippedCount: b.skippedCount,
              mode: b.mode,
              operator: b.operator,
              createdAt: b.createdAt,
              reverted: b.reverted,
              revertedAt: b.revertedAt,
              revertedBy: b.revertedBy,
              preCheckSummary: b.preCheckSummary
                ? {
                    ...b.preCheckSummary,
                    issueCodeLabels: issueCodeLabels(b.preCheckSummary.issueCodes),
                  }
                : null,
            })),
          }
          downloadFile(JSON.stringify(exportObj, null, 2), `导入批次_${timestamp}.json`, 'application/json')
        } else {
          const data = batches.map(b => ({
            批次ID: b.batchId,
            数据类型: DataTypeLabels[b.dataType],
            文件名: b.fileName,
            文件哈希: b.fileHash,
            导入条数: b.importedCount,
            跳过条数: b.skippedCount,
            导入模式: b.mode === 'direct' ? '直接导入' : b.mode === 'validOnly' ? '仅有效数据' : '全部数据',
            预检总行数: b.preCheckSummary?.totalRows ?? '',
            预检有效行数: b.preCheckSummary?.validRows ?? '',
            预检错误数: b.preCheckSummary?.errorCount ?? '',
            预检警告数: b.preCheckSummary?.warningCount ?? '',
            预检问题类型: b.preCheckSummary ? issueCodeLabels(b.preCheckSummary.issueCodes) : '',
            操作者: b.operator,
            导入时间: b.createdAt,
            是否已撤销: b.reverted ? '是' : '否',
            撤销时间: b.revertedAt || '',
            撤销人: b.revertedBy || '',
          }))
          const csv = generateCSV(data)
          downloadFile(csv, `导入批次_${timestamp}.csv`, 'text/csv')
        }

        get().addLog(LogActionType.IMPORT_BATCH_EXPORT, `导出导入批次（${format.toUpperCase()}，${batches.length}条）`, {
          format,
          count: batches.length,
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
        importBatches: state.importBatches,
        schemeDrafts: state.schemeDrafts,
        sandboxApplyHistory: state.sandboxApplyHistory,
        handoverPackages: state.handoverPackages,
        handoverApplyHistory: state.handoverApplyHistory,
        currentRole: state.currentRole,
        shiftTodoLists: state.shiftTodoLists,
        shiftTodoUndoHistory: state.shiftTodoUndoHistory,
      }),
    }
  )
)
