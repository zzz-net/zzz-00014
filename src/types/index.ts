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
  homeVisitStatusMappings: string[]
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
  homeVisitStatusMappings: ['NEED_HOME_VISIT'],
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
}

export const LogActionTypeLabels: Record<LogActionType, string> = {
  [LogActionType.IMPORT]: '数据导入',
  [LogActionType.RULE_CHANGE]: '规则变更',
  [LogActionType.BATCH_RECALCULATE]: '批量重算',
  [LogActionType.EXPORT]: '数据导出',
  [LogActionType.REVIEW_STATUS_CHANGE]: '复核状态修改',
  [LogActionType.RESET]: '数据重置',
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
