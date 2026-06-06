export enum AnomalyType {
  OVERDUE_VISIT = 'OVERDUE_VISIT',
  UNPLANNED_VISIT = 'UNPLANNED_VISIT',
  DUPLICATE_FOLLOWUP = 'DUPLICATE_FOLLOWUP',
  ABNORMAL_METRIC = 'ABNORMAL_METRIC',
  UNREGISTERED_RESIDENT = 'UNREGISTERED_RESIDENT',
}

export const AnomalyTypeLabels: Record<AnomalyType, string> = {
  [AnomalyType.OVERDUE_VISIT]: '逾期未访',
  [AnomalyType.UNPLANNED_VISIT]: '未预约到访',
  [AnomalyType.DUPLICATE_FOLLOWUP]: '重复随访',
  [AnomalyType.ABNORMAL_METRIC]: '指标越界',
  [AnomalyType.UNREGISTERED_RESIDENT]: '居民不在名册',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IGNORED = 'IGNORED',
  NEED_HOME_VISIT = 'NEED_HOME_VISIT',
}

export const ReviewStatusLabels: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING]: '待处理',
  [ReviewStatus.CONFIRMED]: '已确认',
  [ReviewStatus.IGNORED]: '忽略',
  [ReviewStatus.NEED_HOME_VISIT]: '需上门',
}

export interface Resident {
  residentId: string
  name: string
  gender: string
  site: string
  nurse: string
  diseaseType: string
}

export interface Appointment {
  appointmentId: string
  residentId: string
  date: string
  nurse: string
  site: string
  status: string
}

export interface Followup {
  followupId: string
  residentId: string
  date: string
  nurse: string
  site: string
  bloodPressureSystolic: number | null
  bloodPressureDiastolic: number | null
  bloodGlucose: number | null
  visitType: string
}

export interface Anomaly {
  anomalyId: string
  type: AnomalyType
  severity: 'high' | 'medium' | 'low'
  residentId: string
  residentName?: string
  relatedId: string
  relatedRecord?: Appointment | Followup
  description: string
  status: ReviewStatus
  remark: string
  handler: string
  updatedAt: string
  site?: string
  nurse?: string
}

export interface UnregisteredRecord {
  id: string
  residentId: string
  source: 'appointment' | 'followup'
  record: Appointment | Followup
  recordDate: string
  site: string
  nurse: string
}

export interface ImportError {
  row: number
  field: string
  message: string
  value?: string
}

export interface ImportResult {
  success: boolean
  isDuplicate: boolean
  message: string
  errors: ImportError[]
  importedCount: number
}

export interface Filters {
  sites: string[]
  nurses: string[]
  anomalyTypes: AnomalyType[]
  statuses: ReviewStatus[]
  searchText: string
}

export const DEFAULT_FILTERS: Filters = {
  sites: [],
  nurses: [],
  anomalyTypes: [],
  statuses: [],
  searchText: '',
}

export type DataType = 'residents' | 'appointments' | 'followups'

export const DataTypeLabels: Record<DataType, string> = {
  residents: '居民名册',
  appointments: '预约计划',
  followups: '随访记录',
}

export interface QualityControlRules {
  overdueVisitDaysThreshold: number
  unplannedVisitWindowDays: number
  bloodPressureSystolicMax: number
  bloodPressureDiastolicMax: number
  bloodGlucoseMax: number
  bloodPressureSystolicMin: number
  bloodPressureDiastolicMin: number
  bloodGlucoseMin: number
  homeVisitStatusMappings: AnomalyType[]
  enabled: boolean
}

export const DEFAULT_QC_RULES: QualityControlRules = {
  overdueVisitDaysThreshold: 0,
  unplannedVisitWindowDays: 3,
  bloodPressureSystolicMax: 140,
  bloodPressureDiastolicMax: 90,
  bloodGlucoseMax: 7.0,
  bloodPressureSystolicMin: 90,
  bloodPressureDiastolicMin: 60,
  bloodGlucoseMin: 3.9,
  homeVisitStatusMappings: [AnomalyType.OVERDUE_VISIT, AnomalyType.ABNORMAL_METRIC],
  enabled: true,
}

export interface RuleVersion {
  version: string
  name: string
  rules: QualityControlRules
  createdAt: string
  createdBy: string
  description: string
}

export enum LogActionType {
  IMPORT = 'IMPORT',
  RULE_CHANGE = 'RULE_CHANGE',
  BATCH_RECALCULATE = 'BATCH_RECALCULATE',
  EXPORT = 'EXPORT',
  REVIEW_STATUS_CHANGE = 'REVIEW_STATUS_CHANGE',
  RESET = 'RESET',
  PRE_CHECK = 'PRE_CHECK',
  PRE_CHECK_IMPORT_PASS = 'PRE_CHECK_IMPORT_PASS',
  PRE_CHECK_IMPORT_WARN = 'PRE_CHECK_IMPORT_WARN',
  PRE_CHECK_CANCEL = 'PRE_CHECK_CANCEL',
  PRE_CHECK_EXPORT = 'PRE_CHECK_EXPORT',
  IMPORT_BATCH_CREATE = 'IMPORT_BATCH_CREATE',
  IMPORT_BATCH_REVERT = 'IMPORT_BATCH_REVERT',
  IMPORT_BATCH_EXPORT = 'IMPORT_BATCH_EXPORT',
  SANDBOX_DRAFT_SAVE = 'SANDBOX_DRAFT_SAVE',
  SANDBOX_DRAFT_DELETE = 'SANDBOX_DRAFT_DELETE',
  SANDBOX_DRAFT_LOAD = 'SANDBOX_DRAFT_LOAD',
  SANDBOX_DRAFT_EXPORT = 'SANDBOX_DRAFT_EXPORT',
  SANDBOX_DRAFT_IMPORT = 'SANDBOX_DRAFT_IMPORT',
  SANDBOX_PREVIEW = 'SANDBOX_PREVIEW',
  SANDBOX_APPLY = 'SANDBOX_APPLY',
  SANDBOX_UNDO = 'SANDBOX_UNDO',
  HANDOVER_CREATE = 'HANDOVER_CREATE',
  HANDOVER_EXPORT = 'HANDOVER_EXPORT',
  HANDOVER_IMPORT = 'HANDOVER_IMPORT',
  HANDOVER_APPLY = 'HANDOVER_APPLY',
  HANDOVER_UNDO = 'HANDOVER_UNDO',
}

export const LogActionTypeLabels: Record<LogActionType, string> = {
  [LogActionType.IMPORT]: '数据导入',
  [LogActionType.RULE_CHANGE]: '规则变更',
  [LogActionType.BATCH_RECALCULATE]: '批量重算',
  [LogActionType.EXPORT]: '数据导出',
  [LogActionType.REVIEW_STATUS_CHANGE]: '复核状态修改',
  [LogActionType.RESET]: '数据重置',
  [LogActionType.PRE_CHECK]: '数据预检',
  [LogActionType.PRE_CHECK_IMPORT_PASS]: '预检通过导入',
  [LogActionType.PRE_CHECK_IMPORT_WARN]: '警告继续导入',
  [LogActionType.PRE_CHECK_CANCEL]: '预检取消导入',
  [LogActionType.PRE_CHECK_EXPORT]: '预检报告导出',
  [LogActionType.IMPORT_BATCH_CREATE]: '生成导入批次',
  [LogActionType.IMPORT_BATCH_REVERT]: '撤销导入批次',
  [LogActionType.IMPORT_BATCH_EXPORT]: '导出导入批次',
  [LogActionType.SANDBOX_DRAFT_SAVE]: '沙盒保存草稿',
  [LogActionType.SANDBOX_DRAFT_DELETE]: '沙盒删除草稿',
  [LogActionType.SANDBOX_DRAFT_LOAD]: '沙盒加载草稿',
  [LogActionType.SANDBOX_DRAFT_EXPORT]: '沙盒导出草稿',
  [LogActionType.SANDBOX_DRAFT_IMPORT]: '沙盒导入草稿',
  [LogActionType.SANDBOX_PREVIEW]: '沙盒预跑预览',
  [LogActionType.SANDBOX_APPLY]: '沙盒应用方案',
  [LogActionType.SANDBOX_UNDO]: '沙盒撤销应用',
  [LogActionType.HANDOVER_CREATE]: '生成交接包',
  [LogActionType.HANDOVER_EXPORT]: '导出交接包',
  [LogActionType.HANDOVER_IMPORT]: '导入交接包',
  [LogActionType.HANDOVER_APPLY]: '应用交接包',
  [LogActionType.HANDOVER_UNDO]: '撤销交接包应用',
}

export interface OperationLog {
  logId: string
  actionType: LogActionType
  operator: string
  timestamp: string
  description: string
  details: Record<string, unknown>
}

export interface LogFilters {
  actionTypes: LogActionType[]
  operators: string[]
  startTime: string
  endTime: string
  searchText: string
}

export const DEFAULT_LOG_FILTERS: LogFilters = {
  actionTypes: [],
  operators: [],
  startTime: '',
  endTime: '',
  searchText: '',
}

export interface RuleDiff {
  field: string
  oldValue: unknown
  newValue: unknown
  affectedCount: number
}

export interface RecalculatePreview {
  totalAnomalies: number
  newAnomalies: number
  removedAnomalies: number
  changedAnomalies: number
  protectedAnomalies: number
  diffs: RuleDiff[]
}

export interface DetectionResult {
  anomalies: Anomaly[]
  unregisteredRecords: UnregisteredRecord[]
}

export interface RuleDiffPreview {
  newResult: DetectionResult
  oldResult: DetectionResult
  added: Anomaly[]
  removed: Anomaly[]
  changed: Anomaly[]
  protectedCount: number
}

export type PreCheckIssueSeverity = 'error' | 'warning'

export enum PreCheckIssueCode {
  MISSING_REQUIRED_COLUMN = 'MISSING_REQUIRED_COLUMN',
  MISSING_REQUIRED_VALUE = 'MISSING_REQUIRED_VALUE',
  INVALID_DATE_FORMAT = 'INVALID_DATE_FORMAT',
  INVALID_NUMERIC = 'INVALID_NUMERIC',
  RESIDENT_NOT_FOUND = 'RESIDENT_NOT_FOUND',
  DUPLICATE_FOLLOWUP_SAME_DAY = 'DUPLICATE_FOLLOWUP_SAME_DAY',
  MISSING_HEADER = 'MISSING_HEADER',
}

export const PreCheckIssueCodeLabels: Record<PreCheckIssueCode, string> = {
  [PreCheckIssueCode.MISSING_REQUIRED_COLUMN]: '缺失必填列',
  [PreCheckIssueCode.MISSING_REQUIRED_VALUE]: '缺失必填值',
  [PreCheckIssueCode.INVALID_DATE_FORMAT]: '日期格式异常',
  [PreCheckIssueCode.INVALID_NUMERIC]: '数值字段非法',
  [PreCheckIssueCode.RESIDENT_NOT_FOUND]: '居民编号不存在',
  [PreCheckIssueCode.DUPLICATE_FOLLOWUP_SAME_DAY]: '同一居民同日重复随访',
  [PreCheckIssueCode.MISSING_HEADER]: '表头缺失',
}

export interface PreCheckIssue {
  issueId: string
  code: PreCheckIssueCode
  severity: PreCheckIssueSeverity
  dataType: DataType
  row: number
  field: string
  value?: string
  message: string
  suggestion: string
}

export interface PreCheckDataTypeResult {
  dataType: DataType
  fileName: string
  totalRows: number
  validRows: number
  invalidRowIndices: number[]
  issues: PreCheckIssue[]
  errorCount: number
  warningCount: number
  parsedData: Record<string, string>[]
}

export interface PreCheckResult {
  preCheckId: string
  timestamp: string
  dataTypes: Record<DataType, PreCheckDataTypeResult | null>
  overall: {
    totalIssues: number
    totalErrors: number
    totalWarnings: number
    canImport: boolean
    canImportWithWarning: boolean
  }
}

export interface PreCheckConfig {
  maxDisplayIssues: number
  allowWarningContinue: boolean
}

export const DEFAULT_PRE_CHECK_CONFIG: PreCheckConfig = {
  maxDisplayIssues: 100,
  allowWarningContinue: true,
}

export type PreCheckFilterSeverity = 'all' | PreCheckIssueSeverity
export type PreCheckFilterDataType = 'all' | DataType

export interface ImportBatchSnapshot {
  residents: Resident[]
  appointments: Appointment[]
  followups: Followup[]
  anomalies: Anomaly[]
  unregisteredRecords: UnregisteredRecord[]
  importedFileHashes: Record<DataType, string>
}

export interface ImportBatchPreCheckSummary {
  totalRows: number
  validRows: number
  invalidRows: number
  warningCount: number
  errorCount: number
  issueCodes: PreCheckIssueCode[]
}

export interface ImportBatch {
  batchId: string
  dataType: DataType
  fileName: string
  fileHash: string
  importedCount: number
  skippedCount: number
  preCheckSummary: ImportBatchPreCheckSummary | null
  operator: string
  createdAt: string
  reverted: boolean
  revertedAt: string | null
  revertedBy: string | null
  snapshot: ImportBatchSnapshot
  mode: 'all' | 'validOnly' | 'direct'
}

export interface RevertBatchResult {
  success: boolean
  message: string
  blockedReason?: 'NOT_LATEST' | 'DEPENDENCY_EXISTS' | 'HASH_CONFLICT' | 'ALREADY_REVERTED'
  protectedAnomalyCount?: number
  restoredDataCount?: Record<DataType, number>
}

export const SCHEME_DRAFT_SCHEMA_VERSION = '1.0.0'

export interface SchemeDraft {
  draftId: string
  name: string
  description: string
  qcRules: QualityControlRules
  preCheckConfig: PreCheckConfig
  schemaVersion: string
  createdAt: string
  createdBy: string
  updatedAt: string
}

export type RuleConflictSeverity = 'looser' | 'stricter' | 'different'

export const ImportValidationIssueCode = {
  INVALID_JSON: 'INVALID_JSON',
  INVALID_TYPE: 'INVALID_TYPE',
  MISSING_FIELD: 'MISSING_FIELD',
  VERSION_MISMATCH: 'VERSION_MISMATCH',
  DUPLICATE_NAME: 'DUPLICATE_NAME',
  RULE_CONFLICT: 'RULE_CONFLICT',
} as const
export type ImportValidationIssueCode = typeof ImportValidationIssueCode[keyof typeof ImportValidationIssueCode]

export interface RuleConflict {
  field: string
  label: string
  oldValue: unknown
  newValue: unknown
  severity: RuleConflictSeverity
  suggestion: string
}

export interface ImportValidationIssue {
  code: ImportValidationIssueCode
  severity: 'error' | 'warning'
  field?: string
  message: string
  suggestion: string
  conflict?: RuleConflict
}

export interface ImportValidationResult {
  valid: boolean
  canImport: boolean
  issues: ImportValidationIssue[]
  errorCount: number
  warningCount: number
  parsedDraft?: SchemeDraft
}

export interface SandboxApplyResult {
  success: boolean
  message: string
  newVersion?: RuleVersion
  protectedAnomalyCount: number
  diffSummary: {
    addedCount: number
    removedCount: number
    changedCount: number
    protectedCount: number
  }
}

export interface SandboxUndoResult {
  success: boolean
  message: string
  blockedReason?: 'NO_HISTORY' | 'PROTECTED_RESULTS_EXIST' | 'ALREADY_UNDONE'
  restoredVersion?: string
  protectedAnomalyCount: number
}

export interface SandboxApplyHistory {
  historyId: string
  draftId: string
  draftName: string
  appliedAt: string
  appliedBy: string
  previousRules: QualityControlRules
  previousVersion: string
  newVersion: string
  diffSummary: {
    addedCount: number
    removedCount: number
    changedCount: number
    protectedCount: number
  }
  undone: boolean
  undoneAt: string | null
  undoneBy: string | null
}

export const HANDOVER_PACKAGE_SCHEMA_VERSION = '1.0.0'

export interface HandoverAnomalyItem {
  anomalyId: string
  type: AnomalyType
  severity: 'high' | 'medium' | 'low'
  residentId: string
  residentName?: string
  description: string
  status: ReviewStatus
  remark: string
  handler: string
  updatedAt: string
  site?: string
  nurse?: string
}

export interface HandoverImportBatchSummary {
  batchId: string
  dataType: DataType
  fileName: string
  importedCount: number
  skippedCount: number
  operator: string
  createdAt: string
}

export interface HandoverFiltersSummary {
  sites: string[]
  nurses: string[]
  anomalyTypes: AnomalyType[]
  statuses: ReviewStatus[]
  searchText: string
}

export interface HandoverPackage {
  packageId: string
  name: string
  description: string
  schemaVersion: string
  createdAt: string
  createdBy: string
  sourceMode: 'filter' | 'selected'
  filters: HandoverFiltersSummary | null
  selectedCount: number
  ruleVersion: string
  ruleVersionName: string
  qcRules: QualityControlRules
  anomalies: HandoverAnomalyItem[]
  importBatchSummaries: HandoverImportBatchSummary[]
}

export const HandoverConflictCode = {
  INVALID_JSON: 'INVALID_JSON',
  INVALID_TYPE: 'INVALID_TYPE',
  MISSING_FIELD: 'MISSING_FIELD',
  VERSION_MISMATCH: 'VERSION_MISMATCH',
  ANOMALY_NOT_FOUND: 'ANOMALY_NOT_FOUND',
  STATUS_OLDER: 'STATUS_OLDER',
  PROTECTED_STATUS: 'PROTECTED_STATUS',
} as const
export type HandoverConflictCode = typeof HandoverConflictCode[keyof typeof HandoverConflictCode]

export interface HandoverImportIssue {
  code: HandoverConflictCode
  severity: 'error' | 'warning'
  field?: string
  anomalyId?: string
  message: string
  suggestion: string
}

export interface HandoverImportValidationResult {
  valid: boolean
  canApply: boolean
  issues: HandoverImportIssue[]
  errorCount: number
  warningCount: number
  parsedPackage?: HandoverPackage
  applicableCount: number
  protectedCount: number
  notFoundCount: number
  olderStatusCount: number
}

export interface HandoverApplyResult {
  success: boolean
  message: string
  updatedCount: number
  protectedCount: number
  skippedCount: number
  historyId?: string
}

export interface HandoverApplySnapshot {
  anomalies: Anomaly[]
}

export interface HandoverApplyHistory {
  historyId: string
  packageId: string
  packageName: string
  appliedAt: string
  appliedBy: string
  updatedCount: number
  protectedCount: number
  skippedCount: number
  snapshot: HandoverApplySnapshot
  undone: boolean
  undoneAt: string | null
  undoneBy: string | null
}

export interface HandoverUndoResult {
  success: boolean
  message: string
  blockedReason?: 'NO_HISTORY' | 'ALREADY_UNDONE'
  restoredCount: number
  protectedCount: number
}
