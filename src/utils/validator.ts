import { ImportError, DataType, Resident, Appointment, Followup } from '@/types'
import { isValidDate, isNumeric, normalizeDate, parseNumeric, generateId } from './helpers'

interface ValidationResult<T> {
  valid: boolean
  errors: ImportError[]
  data: T[]
}

const REQUIRED_RESIDENT_FIELDS = ['居民编号', '姓名']
const REQUIRED_APPOINTMENT_FIELDS = ['居民编号', '预约日期']
const REQUIRED_FOLLOWUP_FIELDS = ['居民编号', '随访日期']

export function validateResidents(rows: Record<string, string>[]): ValidationResult<Resident> {
  const errors: ImportError[] = []
  const data: Resident[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2

    REQUIRED_RESIDENT_FIELDS.forEach(field => {
      if (!row[field] || !row[field].trim()) {
        errors.push({ row: rowNum, field, message: `缺少必填字段: ${field}` })
      }
    })

    if (row['居民编号']) {
      data.push({
        residentId: row['居民编号'].trim(),
        name: row['姓名']?.trim() || '',
        gender: row['性别']?.trim() || '',
        site: row['所属站点']?.trim() || row['站点']?.trim() || '',
        nurse: row['责任护士']?.trim() || row['护士']?.trim() || '',
        diseaseType: row['慢病类型']?.trim() || '',
      })
    }
  })

  return { valid: errors.length === 0, errors, data }
}

export function validateAppointments(rows: Record<string, string>[]): ValidationResult<Appointment> {
  const errors: ImportError[] = []
  const data: Appointment[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2
    let hasCriticalError = false

    REQUIRED_APPOINTMENT_FIELDS.forEach(field => {
      if (!row[field] || !row[field].trim()) {
        errors.push({ row: rowNum, field, message: `缺少必填字段: ${field}` })
        if (field === '居民编号') hasCriticalError = true
      }
    })

    const dateField = row['预约日期']?.trim()
    if (dateField && !isValidDate(dateField)) {
      errors.push({ row: rowNum, field: '预约日期', message: '日期格式无效', value: dateField })
    }

    if (!hasCriticalError && row['居民编号']) {
      data.push({
        appointmentId: row['预约ID']?.trim() || generateId('APT'),
        residentId: row['居民编号'].trim(),
        date: dateField ? normalizeDate(dateField) : '',
        nurse: row['执行护士']?.trim() || row['护士']?.trim() || '',
        site: row['站点']?.trim() || row['所属站点']?.trim() || '',
        status: row['状态']?.trim() || row['预约状态']?.trim() || '已预约',
      })
    }
  })

  return { valid: errors.length === 0, errors, data }
}

export function validateFollowups(rows: Record<string, string>[]): ValidationResult<Followup> {
  const errors: ImportError[] = []
  const data: Followup[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2
    let hasCriticalError = false

    REQUIRED_FOLLOWUP_FIELDS.forEach(field => {
      if (!row[field] || !row[field].trim()) {
        errors.push({ row: rowNum, field, message: `缺少必填字段: ${field}` })
        if (field === '居民编号') hasCriticalError = true
      }
    })

    const dateField = row['随访日期']?.trim()
    if (dateField && !isValidDate(dateField)) {
      errors.push({ row: rowNum, field: '随访日期', message: '日期格式无效', value: dateField })
    }

    const sys = row['收缩压']?.trim()
    const dia = row['舒张压']?.trim()
    const glu = row['血糖']?.trim()

    if (sys && !isNumeric(sys)) {
      errors.push({ row: rowNum, field: '收缩压', message: '收缩压必须为数字', value: sys })
    }
    if (dia && !isNumeric(dia)) {
      errors.push({ row: rowNum, field: '舒张压', message: '舒张压必须为数字', value: dia })
    }
    if (glu && !isNumeric(glu)) {
      errors.push({ row: rowNum, field: '血糖', message: '血糖必须为数字', value: glu })
    }

    if (!hasCriticalError && row['居民编号']) {
      data.push({
        followupId: row['随访ID']?.trim() || generateId('FOL'),
        residentId: row['居民编号'].trim(),
        date: dateField ? normalizeDate(dateField) : '',
        nurse: row['随访护士']?.trim() || row['护士']?.trim() || '',
        site: row['站点']?.trim() || row['所属站点']?.trim() || '',
        bloodPressureSystolic: parseNumeric(sys),
        bloodPressureDiastolic: parseNumeric(dia),
        bloodGlucose: parseNumeric(glu),
        visitType: row['到访方式']?.trim() || '',
      })
    }
  })

  return { valid: errors.length === 0, errors, data }
}

export function validateData(
  type: DataType,
  rows: Record<string, string>[]
): ValidationResult<Resident | Appointment | Followup> {
  switch (type) {
    case 'residents':
      return validateResidents(rows)
    case 'appointments':
      return validateAppointments(rows)
    case 'followups':
      return validateFollowups(rows)
  }
}
