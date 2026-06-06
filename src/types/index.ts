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
