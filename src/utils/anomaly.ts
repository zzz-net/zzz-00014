import {
  Anomaly,
  AnomalyType,
  Appointment,
  Followup,
  Resident,
  ReviewStatus,
  UnregisteredRecord,
  QualityControlRules,
  DEFAULT_QC_RULES,
  DetectionResult,
  RuleDiffPreview,
} from '@/types'
import { daysBetween, generateId, todayStr } from './helpers'

const PROTECTED_STATUSES = [ReviewStatus.CONFIRMED, ReviewStatus.IGNORED]

function initialStatusFor(
  type: AnomalyType,
  rules: QualityControlRules,
  existingStatus?: ReviewStatus
): ReviewStatus {
  if (existingStatus && PROTECTED_STATUSES.includes(existingStatus)) {
    return existingStatus
  }
  if (rules.homeVisitStatusMappings.includes(type)) {
    return ReviewStatus.NEED_HOME_VISIT
  }
  return ReviewStatus.PENDING
}

export function detectAnomalies(
  residents: Resident[],
  appointments: Appointment[],
  followups: Followup[],
  existingAnomalies: Anomaly[] = [],
  rules: QualityControlRules = DEFAULT_QC_RULES,
  respectProtection: boolean = true
): DetectionResult {
  const anomalies: Anomaly[] = []
  const unregisteredRecords: UnregisteredRecord[] = []
  const residentMap = new Map(residents.map(r => [r.residentId, r]))
  const today = todayStr()

  const getResidentName = (id: string): string => residentMap.get(id)?.name || ''
  const getResidentSite = (id: string): string => residentMap.get(id)?.site || ''
  const getResidentNurse = (id: string): string => residentMap.get(id)?.nurse || ''

  const protectedMap = new Map(
    existingAnomalies
      .filter(a => !respectProtection || PROTECTED_STATUSES.includes(a.status))
      .map(a => [`${a.type}_${a.relatedId}`, a])
  )

  const allStatusMap = new Map(
    existingAnomalies.map(a => [
      `${a.type}_${a.relatedId}`,
      { status: a.status, remark: a.remark, handler: a.handler, updatedAt: a.updatedAt, anomalyId: a.anomalyId }
    ])
  )

  const getExistingFull = (type: AnomalyType, relatedId: string) => {
    return allStatusMap.get(`${type}_${relatedId}`) || null
  }

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
      const existing = getExistingFull(AnomalyType.UNREGISTERED_RESIDENT, `APT_${apt.residentId}_${apt.date}`)
      anomalies.push({
        anomalyId: existing?.anomalyId || generateId('ANM'),
        type: AnomalyType.UNREGISTERED_RESIDENT,
        severity: 'high',
        residentId: apt.residentId,
        residentName: '',
        relatedId: `APT_${apt.residentId}_${apt.date}`,
        relatedRecord: apt,
        description: `预约记录中的居民编号 ${apt.residentId} 不在居民名册中`,
        status: initialStatusFor(AnomalyType.UNREGISTERED_RESIDENT, rules, existing?.status),
        remark: existing?.remark || '',
        handler: existing?.handler || '',
        updatedAt: existing?.updatedAt || '',
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
        const existing = getExistingFull(AnomalyType.UNREGISTERED_RESIDENT, `FOL_${fol.residentId}_${fol.date}`)
        anomalies.push({
          anomalyId: existing?.anomalyId || generateId('ANM'),
          type: AnomalyType.UNREGISTERED_RESIDENT,
          severity: 'high',
          residentId: fol.residentId,
          residentName: '',
          relatedId: `FOL_${fol.residentId}_${fol.date}`,
          relatedRecord: fol,
          description: `随访记录中的居民编号 ${fol.residentId} 不在居民名册中`,
          status: initialStatusFor(AnomalyType.UNREGISTERED_RESIDENT, rules, existing?.status),
          remark: existing?.remark || '',
          handler: existing?.handler || '',
          updatedAt: existing?.updatedAt || '',
          site: fol.site,
          nurse: fol.nurse,
        })
      }
    }
  })

  const followupMap = new Map<string, Followup[]>()
  followups.forEach(fol => {
    const key = `${fol.residentId}_${fol.date}`
    if (!followupMap.has(key)) followupMap.set(key, [])
    followupMap.get(key)!.push(fol)
  })

  followupMap.forEach((group) => {
    if (group.length > 1) {
      group.forEach((fol, idx) => {
        const existing = getExistingFull(AnomalyType.DUPLICATE_FOLLOWUP, fol.followupId)
        anomalies.push({
          anomalyId: existing?.anomalyId || generateId('ANM'),
          type: AnomalyType.DUPLICATE_FOLLOWUP,
          severity: 'medium',
          residentId: fol.residentId,
          residentName: getResidentName(fol.residentId),
          relatedId: fol.followupId,
          relatedRecord: fol,
          description: `居民 ${getResidentName(fol.residentId) || fol.residentId} 在 ${fol.date} 有 ${group.length} 条随访记录（第${idx + 1}条）`,
          status: initialStatusFor(AnomalyType.DUPLICATE_FOLLOWUP, rules, existing?.status),
          remark: existing?.remark || '',
          handler: existing?.handler || '',
          updatedAt: existing?.updatedAt || '',
          site: fol.site || getResidentSite(fol.residentId),
          nurse: fol.nurse || getResidentNurse(fol.residentId),
        })
      })
    }
  })

  if (rules.enabled) {
    followups.forEach(fol => {
      if (!residentMap.has(fol.residentId)) return
      const abnormalMetrics: string[] = []

      if (fol.bloodPressureSystolic !== null) {
        if (fol.bloodPressureSystolic > rules.bloodPressureSystolicMax) {
          abnormalMetrics.push(`收缩压${fol.bloodPressureSystolic}mmHg(>${rules.bloodPressureSystolicMax})`)
        } else if (fol.bloodPressureSystolic < rules.bloodPressureSystolicMin) {
          abnormalMetrics.push(`收缩压${fol.bloodPressureSystolic}mmHg(<${rules.bloodPressureSystolicMin})`)
        }
      }
      if (fol.bloodPressureDiastolic !== null) {
        if (fol.bloodPressureDiastolic > rules.bloodPressureDiastolicMax) {
          abnormalMetrics.push(`舒张压${fol.bloodPressureDiastolic}mmHg(>${rules.bloodPressureDiastolicMax})`)
        } else if (fol.bloodPressureDiastolic < rules.bloodPressureDiastolicMin) {
          abnormalMetrics.push(`舒张压${fol.bloodPressureDiastolic}mmHg(<${rules.bloodPressureDiastolicMin})`)
        }
      }
      if (fol.bloodGlucose !== null) {
        if (fol.bloodGlucose > rules.bloodGlucoseMax) {
          abnormalMetrics.push(`血糖${fol.bloodGlucose}mmol/L(>${rules.bloodGlucoseMax})`)
        } else if (fol.bloodGlucose < rules.bloodGlucoseMin) {
          abnormalMetrics.push(`血糖${fol.bloodGlucose}mmol/L(<${rules.bloodGlucoseMin})`)
        }
      }

      if (abnormalMetrics.length > 0) {
        const existing = getExistingFull(AnomalyType.ABNORMAL_METRIC, fol.followupId)
        anomalies.push({
          anomalyId: existing?.anomalyId || generateId('ANM'),
          type: AnomalyType.ABNORMAL_METRIC,
          severity: 'medium',
          residentId: fol.residentId,
          residentName: getResidentName(fol.residentId),
          relatedId: fol.followupId,
          relatedRecord: fol,
          description: `居民 ${getResidentName(fol.residentId) || fol.residentId} 在 ${fol.date} 指标异常: ${abnormalMetrics.join(', ')}`,
          status: initialStatusFor(AnomalyType.ABNORMAL_METRIC, rules, existing?.status),
          remark: existing?.remark || '',
          handler: existing?.handler || '',
          updatedAt: existing?.updatedAt || '',
          site: fol.site || getResidentSite(fol.residentId),
          nurse: fol.nurse || getResidentNurse(fol.residentId),
        })
      }
    })
  }

  const followupsByResident = new Map<string, Followup[]>()
  followups.forEach(fol => {
    if (!followupsByResident.has(fol.residentId)) followupsByResident.set(fol.residentId, [])
    followupsByResident.get(fol.residentId)!.push(fol)
  })

  appointments.forEach(apt => {
    if (!residentMap.has(apt.residentId)) return
    if (
      rules.enabled &&
      apt.status !== '已取消' &&
      apt.status !== '已完成' &&
      apt.date &&
      daysBetween(apt.date, today) > rules.overdueVisitDaysThreshold
    ) {
      const residentFollowups = followupsByResident.get(apt.residentId) || []
      const hasFollowup = residentFollowups.some(fol => {
        const diff = daysBetween(apt.date, fol.date)
        return diff >= 0 && diff <= 7
      })
      if (!hasFollowup) {
        const existing = getExistingFull(AnomalyType.OVERDUE_VISIT, apt.appointmentId)
        anomalies.push({
          anomalyId: existing?.anomalyId || generateId('ANM'),
          type: AnomalyType.OVERDUE_VISIT,
          severity: 'high',
          residentId: apt.residentId,
          residentName: getResidentName(apt.residentId),
          relatedId: apt.appointmentId,
          relatedRecord: apt,
          description: `居民 ${getResidentName(apt.residentId) || apt.residentId} 预约日期 ${apt.date} 已逾期 ${daysBetween(apt.date, today)} 天未随访`,
          status: initialStatusFor(AnomalyType.OVERDUE_VISIT, rules, existing?.status),
          remark: existing?.remark || '',
          handler: existing?.handler || '',
          updatedAt: existing?.updatedAt || '',
          site: apt.site || getResidentSite(apt.residentId),
          nurse: apt.nurse || getResidentNurse(apt.residentId),
        })
      }
    }
  })

  const appointmentsByResident = new Map<string, Appointment[]>()
  appointments.forEach(apt => {
    if (!appointmentsByResident.has(apt.residentId)) appointmentsByResident.set(apt.residentId, [])
    appointmentsByResident.get(apt.residentId)!.push(apt)
  })

  if (rules.enabled) {
    followups.forEach(fol => {
      if (!residentMap.has(fol.residentId)) return
      const residentAppointments = appointmentsByResident.get(fol.residentId) || []
      const hasAppointment = residentAppointments.some(apt => {
        const diff = daysBetween(apt.date, fol.date)
        return diff >= 0 && diff <= rules.unplannedVisitWindowDays
      })
      if (!hasAppointment && fol.date) {
        const existing = getExistingFull(AnomalyType.UNPLANNED_VISIT, fol.followupId)
        anomalies.push({
          anomalyId: existing?.anomalyId || generateId('ANM'),
          type: AnomalyType.UNPLANNED_VISIT,
          severity: 'low',
          residentId: fol.residentId,
          residentName: getResidentName(fol.residentId),
          relatedId: fol.followupId,
          relatedRecord: fol,
          description: `居民 ${getResidentName(fol.residentId) || fol.residentId} 在 ${fol.date} 的随访无对应预约记录`,
          status: initialStatusFor(AnomalyType.UNPLANNED_VISIT, rules, existing?.status),
          remark: existing?.remark || '',
          handler: existing?.handler || '',
          updatedAt: existing?.updatedAt || '',
          site: fol.site || getResidentSite(fol.residentId),
          nurse: fol.nurse || getResidentNurse(fol.residentId),
        })
      }
    })
  }

  const finalAnomalies: Anomaly[] = []
  const processedKeys = new Set<string>()

  anomalies.forEach(a => {
    const key = `${a.type}_${a.relatedId}`
    processedKeys.add(key)
    finalAnomalies.push(a)
  })

  if (respectProtection) {
    protectedMap.forEach((a, key) => {
      if (!processedKeys.has(key)) {
        finalAnomalies.push(a)
      }
    })
  }

  return { anomalies: finalAnomalies, unregisteredRecords }
}

export function calculateRuleDiffPreview(
  residents: Resident[],
  appointments: Appointment[],
  followups: Followup[],
  existingAnomalies: Anomaly[],
  oldRules: QualityControlRules,
  newRules: QualityControlRules
): RuleDiffPreview {
  const oldResult = detectAnomalies(residents, appointments, followups, existingAnomalies, oldRules, false)
  const newResult = detectAnomalies(residents, appointments, followups, existingAnomalies, newRules, false)

  const oldMap = new Map(oldResult.anomalies.map(a => [`${a.type}_${a.relatedId}`, a]))
  const newMap = new Map(newResult.anomalies.map(a => [`${a.type}_${a.relatedId}`, a]))

  const added: Anomaly[] = []
  const removed: Anomaly[] = []
  const changed: Anomaly[] = []

  newMap.forEach((a, key) => {
    if (!oldMap.has(key)) {
      added.push(a)
    } else {
      const old = oldMap.get(key)!
      if (old.description !== a.description || old.severity !== a.severity || old.status !== a.status) {
        changed.push(a)
      }
    }
  })

  oldMap.forEach((a, key) => {
    if (!newMap.has(key)) {
      removed.push(a)
    }
  })

  const protectedCount = existingAnomalies.filter(
    a => PROTECTED_STATUSES.includes(a.status)
  ).length

  return { newResult, oldResult, added, removed, changed, protectedCount }
}
