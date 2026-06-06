import {
  Anomaly,
  AnomalyType,
  Appointment,
  Followup,
  Resident,
  ReviewStatus,
  UnregisteredRecord,
} from '@/types'
import { daysBetween, generateId, todayStr } from './helpers'

interface DetectionResult {
  anomalies: Anomaly[]
  unregisteredRecords: UnregisteredRecord[]
}

export function detectAnomalies(
  residents: Resident[],
  appointments: Appointment[],
  followups: Followup[],
  existingAnomalies: Anomaly[] = []
): DetectionResult {
  const anomalies: Anomaly[] = []
  const unregisteredRecords: UnregisteredRecord[] = []
  const residentMap = new Map(residents.map(r => [r.residentId, r]))
  const today = todayStr()

  const getResidentName = (id: string): string => residentMap.get(id)?.name || ''
  const getResidentSite = (id: string): string => residentMap.get(id)?.site || ''
  const getResidentNurse = (id: string): string => residentMap.get(id)?.nurse || ''
  const existingStatusMap = new Map(
    existingAnomalies.map(a => [`${a.type}_${a.relatedId}`, { status: a.status, remark: a.remark, handler: a.handler, updatedAt: a.updatedAt }])
  )

  const getExistingStatus = (type: AnomalyType, relatedId: string) => {
    return existingStatusMap.get(`${type}_${relatedId}`) || {
      status: ReviewStatus.PENDING,
      remark: '',
      handler: '',
      updatedAt: '',
    }
  }

  // 1. 居民不在名册
  const unregisteredIds = new Set<string>()

  appointments.forEach(apt => {
    if (!residentMap.has(apt.residentId) && apt.residentId) {
      unregisteredIds.add(apt.residentId)
      unregisteredRecords.push({
        id: generateId('UNREG'),
        residentId: apt.residentId,
        source: 'appointment',
        record: apt,
        recordDate: apt.date,
        site: apt.site,
        nurse: apt.nurse,
      })
      const existing = getExistingStatus(AnomalyType.UNREGISTERED_RESIDENT, `APT_${apt.residentId}_${apt.date}`)
      anomalies.push({
        anomalyId: generateId('ANM'),
        type: AnomalyType.UNREGISTERED_RESIDENT,
        severity: 'high',
        residentId: apt.residentId,
        residentName: '',
        relatedId: `APT_${apt.residentId}_${apt.date}`,
        relatedRecord: apt,
        description: `预约记录中的居民编号 ${apt.residentId} 不在居民名册中`,
        status: existing.status,
        remark: existing.remark,
        handler: existing.handler,
        updatedAt: existing.updatedAt,
        site: apt.site,
        nurse: apt.nurse,
      })
    }
  })

  followups.forEach(fol => {
    if (!residentMap.has(fol.residentId) && fol.residentId) {
      const alreadyAdded = unregisteredRecords.some(
        u => u.residentId === fol.residentId && u.source === 'followup' && u.recordDate === fol.date
      )
      if (!alreadyAdded) {
        unregisteredRecords.push({
          id: generateId('UNREG'),
          residentId: fol.residentId,
          source: 'followup',
          record: fol,
          recordDate: fol.date,
          site: fol.site,
          nurse: fol.nurse,
        })
      }
      if (!unregisteredIds.has(fol.residentId)) {
        unregisteredIds.add(fol.residentId)
        const existing = getExistingStatus(AnomalyType.UNREGISTERED_RESIDENT, `FOL_${fol.residentId}_${fol.date}`)
        anomalies.push({
          anomalyId: generateId('ANM'),
          type: AnomalyType.UNREGISTERED_RESIDENT,
          severity: 'high',
          residentId: fol.residentId,
          residentName: '',
          relatedId: `FOL_${fol.residentId}_${fol.date}`,
          relatedRecord: fol,
          description: `随访记录中的居民编号 ${fol.residentId} 不在居民名册中`,
          status: existing.status,
          remark: existing.remark,
          handler: existing.handler,
          updatedAt: existing.updatedAt,
          site: fol.site,
          nurse: fol.nurse,
        })
      }
    }
  })

  // 2. 重复随访
  const followupMap = new Map<string, Followup[]>()
  followups.forEach(fol => {
    const key = `${fol.residentId}_${fol.date}`
    if (!followupMap.has(key)) followupMap.set(key, [])
    followupMap.get(key)!.push(fol)
  })

  followupMap.forEach((group, key) => {
    if (group.length > 1) {
      group.forEach((fol, idx) => {
        const existing = getExistingStatus(AnomalyType.DUPLICATE_FOLLOWUP, fol.followupId)
        anomalies.push({
          anomalyId: generateId('ANM'),
          type: AnomalyType.DUPLICATE_FOLLOWUP,
          severity: 'medium',
          residentId: fol.residentId,
          residentName: getResidentName(fol.residentId),
          relatedId: fol.followupId,
          relatedRecord: fol,
          description: `居民 ${getResidentName(fol.residentId) || fol.residentId} 在 ${fol.date} 有 ${group.length} 条随访记录（第${idx + 1}条）`,
          status: existing.status,
          remark: existing.remark,
          handler: existing.handler,
          updatedAt: existing.updatedAt,
          site: fol.site || getResidentSite(fol.residentId),
          nurse: fol.nurse || getResidentNurse(fol.residentId),
        })
      })
    }
  })

  // 3. 指标越界
  followups.forEach(fol => {
    if (!residentMap.has(fol.residentId)) return
    const abnormalMetrics: string[] = []
    if (fol.bloodPressureSystolic !== null && fol.bloodPressureSystolic > 140) {
      abnormalMetrics.push(`收缩压${fol.bloodPressureSystolic}mmHg(>140)`)
    }
    if (fol.bloodPressureDiastolic !== null && fol.bloodPressureDiastolic > 90) {
      abnormalMetrics.push(`舒张压${fol.bloodPressureDiastolic}mmHg(>90)`)
    }
    if (fol.bloodGlucose !== null && fol.bloodGlucose > 7.0) {
      abnormalMetrics.push(`血糖${fol.bloodGlucose}mmol/L(>7.0)`)
    }
    if (abnormalMetrics.length > 0) {
      const existing = getExistingStatus(AnomalyType.ABNORMAL_METRIC, fol.followupId)
      anomalies.push({
        anomalyId: generateId('ANM'),
        type: AnomalyType.ABNORMAL_METRIC,
        severity: 'medium',
        residentId: fol.residentId,
        residentName: getResidentName(fol.residentId),
        relatedId: fol.followupId,
        relatedRecord: fol,
        description: `居民 ${getResidentName(fol.residentId) || fol.residentId} 在 ${fol.date} 指标异常: ${abnormalMetrics.join(', ')}`,
        status: existing.status,
        remark: existing.remark,
        handler: existing.handler,
        updatedAt: existing.updatedAt,
        site: fol.site || getResidentSite(fol.residentId),
        nurse: fol.nurse || getResidentNurse(fol.residentId),
      })
    }
  })

  // 4. 逾期未访
  const followupsByResident = new Map<string, Followup[]>()
  followups.forEach(fol => {
    if (!followupsByResident.has(fol.residentId)) followupsByResident.set(fol.residentId, [])
    followupsByResident.get(fol.residentId)!.push(fol)
  })

  appointments.forEach(apt => {
    if (!residentMap.has(apt.residentId)) return
    if (apt.status !== '已取消' && apt.status !== '已完成' && apt.date && daysBetween(apt.date, today) > 0) {
      const residentFollowups = followupsByResident.get(apt.residentId) || []
      const hasFollowup = residentFollowups.some(fol => {
        const diff = daysBetween(apt.date, fol.date)
        return diff >= 0 && diff <= 7
      })
      if (!hasFollowup) {
        const existing = getExistingStatus(AnomalyType.OVERDUE_VISIT, apt.appointmentId)
        anomalies.push({
          anomalyId: generateId('ANM'),
          type: AnomalyType.OVERDUE_VISIT,
          severity: 'high',
          residentId: apt.residentId,
          residentName: getResidentName(apt.residentId),
          relatedId: apt.appointmentId,
          relatedRecord: apt,
          description: `居民 ${getResidentName(apt.residentId) || apt.residentId} 预约日期 ${apt.date} 已逾期 ${daysBetween(apt.date, today)} 天未随访`,
          status: existing.status,
          remark: existing.remark,
          handler: existing.handler,
          updatedAt: existing.updatedAt,
          site: apt.site || getResidentSite(apt.residentId),
          nurse: apt.nurse || getResidentNurse(apt.residentId),
        })
      }
    }
  })

  // 5. 未预约到访
  const appointmentsByResident = new Map<string, Appointment[]>()
  appointments.forEach(apt => {
    if (!appointmentsByResident.has(apt.residentId)) appointmentsByResident.set(apt.residentId, [])
    appointmentsByResident.get(apt.residentId)!.push(apt)
  })

  followups.forEach(fol => {
    if (!residentMap.has(fol.residentId)) return
    const residentAppointments = appointmentsByResident.get(fol.residentId) || []
    const hasAppointment = residentAppointments.some(apt => {
      const diff = daysBetween(apt.date, fol.date)
      return diff >= 0 && diff <= 3
    })
    if (!hasAppointment && fol.date) {
      const existing = getExistingStatus(AnomalyType.UNPLANNED_VISIT, fol.followupId)
      anomalies.push({
        anomalyId: generateId('ANM'),
        type: AnomalyType.UNPLANNED_VISIT,
        severity: 'low',
        residentId: fol.residentId,
        residentName: getResidentName(fol.residentId),
        relatedId: fol.followupId,
        relatedRecord: fol,
        description: `居民 ${getResidentName(fol.residentId) || fol.residentId} 在 ${fol.date} 的随访无对应预约记录`,
        status: existing.status,
        remark: existing.remark,
        handler: existing.handler,
        updatedAt: existing.updatedAt,
        site: fol.site || getResidentSite(fol.residentId),
        nurse: fol.nurse || getResidentNurse(fol.residentId),
      })
    }
  })

  return { anomalies, unregisteredRecords }
}
