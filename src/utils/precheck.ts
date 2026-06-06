import {
  DataType,
  PreCheckIssue,
  PreCheckIssueCode,
  PreCheckIssueSeverity,
  PreCheckResult,
  PreCheckDataTypeResult,
} from '@/types'
import { isValidDate, isNumeric, generateId } from './helpers'

const REQUIRED_RESIDENT_HEADERS = ['居民编号', '姓名']
const REQUIRED_APPOINTMENT_HEADERS = ['居民编号', '预约日期']
const REQUIRED_FOLLOWUP_HEADERS = ['居民编号', '随访日期']

function mkIssue(
  code: PreCheckIssueCode,
  severity: PreCheckIssueSeverity,
  dataType: DataType,
  row: number,
  field: string,
  message: string,
  suggestion: string,
  value?: string
): PreCheckIssue {
  return {
    issueId: generateId('PCI'),
    code,
    severity,
    dataType,
    row,
    field,
    value,
    message,
    suggestion,
  }
}

function checkRequiredHeaders(
  headers: string[],
  required: string[],
  dataType: DataType
): PreCheckIssue[] {
  const issues: PreCheckIssue[] = []
  required.forEach(field => {
    if (!headers.includes(field)) {
      issues.push(
        mkIssue(
          PreCheckIssueCode.MISSING_REQUIRED_COLUMN,
          'error',
          dataType,
          1,
          field,
          `CSV 缺少必填列: ${field}`,
          `请在 CSV 第一行添加表头列 "${field}"`
        )
      )
    }
  })
  return issues
}

export function preCheckResidents(
  fileText: string,
  fileName: string
): PreCheckDataTypeResult {
  const dataType: DataType = 'residents'
  const issues: PreCheckIssue[] = []
  const invalidRowIndices = new Set<number>()

  const lines = fileText.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) {
    return {
      dataType,
      fileName,
      totalRows: 0,
      validRows: 0,
      invalidRowIndices: [],
      issues: [
        mkIssue(
          PreCheckIssueCode.MISSING_HEADER,
          'error',
          dataType,
          1,
          '(文件)',
          '文件为空或无法解析',
          '请检查文件是否为有效的 CSV 格式'
        ),
      ],
      errorCount: 1,
      warningCount: 0,
      parsedData: [],
    }
  }

  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine)
  issues.push(...checkRequiredHeaders(headers, REQUIRED_RESIDENT_HEADERS, dataType))

  const hasHeaderErrors = issues.some(i => i.code === PreCheckIssueCode.MISSING_REQUIRED_COLUMN)
  if (hasHeaderErrors) {
    return {
      dataType,
      fileName,
      totalRows: Math.max(0, lines.length - 1),
      validRows: 0,
      invalidRowIndices: [],
      issues,
      errorCount: issues.filter(i => i.severity === 'error').length,
      warningCount: issues.filter(i => i.severity === 'warning').length,
      parsedData: [],
    }
  }

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim()
    })
    if (!Object.values(row).some(v => v.trim() !== '')) continue
    rows.push(row)

    const rowNum = i + 1
    REQUIRED_RESIDENT_HEADERS.forEach(field => {
      if (!row[field] || !row[field].trim()) {
        issues.push(
          mkIssue(
            PreCheckIssueCode.MISSING_REQUIRED_VALUE,
            'error',
            dataType,
            rowNum,
            field,
            `缺少必填字段: ${field}`,
            `请在第 ${rowNum} 行填写 "${field}"`
          )
        )
        invalidRowIndices.add(i - 1)
      }
    })
  }

  return {
    dataType,
    fileName,
    totalRows: rows.length,
    validRows: rows.length - invalidRowIndices.size,
    invalidRowIndices: Array.from(invalidRowIndices),
    issues,
    errorCount: issues.filter(i => i.severity === 'error').length,
    warningCount: issues.filter(i => i.severity === 'warning').length,
    parsedData: rows,
  }
}

export function preCheckAppointments(
  fileText: string,
  fileName: string,
  residentIds: Set<string>
): PreCheckDataTypeResult {
  const dataType: DataType = 'appointments'
  const issues: PreCheckIssue[] = []
  const invalidRowIndices = new Set<number>()

  const lines = fileText.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) {
    return {
      dataType,
      fileName,
      totalRows: 0,
      validRows: 0,
      invalidRowIndices: [],
      issues: [
        mkIssue(
          PreCheckIssueCode.MISSING_HEADER,
          'error',
          dataType,
          1,
          '(文件)',
          '文件为空或无法解析',
          '请检查文件是否为有效的 CSV 格式'
        ),
      ],
      errorCount: 1,
      warningCount: 0,
      parsedData: [],
    }
  }

  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine)
  issues.push(...checkRequiredHeaders(headers, REQUIRED_APPOINTMENT_HEADERS, dataType))

  const hasHeaderErrors = issues.some(i => i.code === PreCheckIssueCode.MISSING_REQUIRED_COLUMN)
  if (hasHeaderErrors) {
    return {
      dataType,
      fileName,
      totalRows: Math.max(0, lines.length - 1),
      validRows: 0,
      invalidRowIndices: [],
      issues,
      errorCount: issues.filter(i => i.severity === 'error').length,
      warningCount: issues.filter(i => i.severity === 'warning').length,
      parsedData: [],
    }
  }

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim()
    })
    if (!Object.values(row).some(v => v.trim() !== '')) continue
    rows.push(row)

    const rowNum = i + 1
    let rowHasError = false

    REQUIRED_APPOINTMENT_HEADERS.forEach(field => {
      if (!row[field] || !row[field].trim()) {
        issues.push(
          mkIssue(
            PreCheckIssueCode.MISSING_REQUIRED_VALUE,
            'error',
            dataType,
            rowNum,
            field,
            `缺少必填字段: ${field}`,
            `请在第 ${rowNum} 行填写 "${field}"`
          )
        )
        rowHasError = true
      }
    })

    const dateField = row['预约日期']
    if (dateField && !isValidDate(dateField)) {
      issues.push(
        mkIssue(
          PreCheckIssueCode.INVALID_DATE_FORMAT,
          'error',
          dataType,
          rowNum,
          '预约日期',
          `日期格式无效: ${dateField}`,
          '请使用 YYYY-MM-DD、YYYY/MM/DD 或 YYYY年MM月DD日 格式',
          dateField
        )
      )
      rowHasError = true
    }

    const rid = row['居民编号']
    if (rid && residentIds.size > 0 && !residentIds.has(rid)) {
      issues.push(
        mkIssue(
          PreCheckIssueCode.RESIDENT_NOT_FOUND,
          'warning',
          dataType,
          rowNum,
          '居民编号',
          `居民编号 ${rid} 不在居民名册中`,
          '请先导入包含该居民的居民名册 CSV，或修正居民编号',
          rid
        )
      )
    }

    if (rowHasError) invalidRowIndices.add(i - 1)
  }

  return {
    dataType,
    fileName,
    totalRows: rows.length,
    validRows: rows.length - invalidRowIndices.size,
    invalidRowIndices: Array.from(invalidRowIndices),
    issues,
    errorCount: issues.filter(i => i.severity === 'error').length,
    warningCount: issues.filter(i => i.severity === 'warning').length,
    parsedData: rows,
  }
}

export function preCheckFollowups(
  fileText: string,
  fileName: string,
  residentIds: Set<string>
): PreCheckDataTypeResult {
  const dataType: DataType = 'followups'
  const issues: PreCheckIssue[] = []
  const invalidRowIndices = new Set<number>()

  const lines = fileText.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) {
    return {
      dataType,
      fileName,
      totalRows: 0,
      validRows: 0,
      invalidRowIndices: [],
      issues: [
        mkIssue(
          PreCheckIssueCode.MISSING_HEADER,
          'error',
          dataType,
          1,
          '(文件)',
          '文件为空或无法解析',
          '请检查文件是否为有效的 CSV 格式'
        ),
      ],
      errorCount: 1,
      warningCount: 0,
      parsedData: [],
    }
  }

  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine)
  issues.push(...checkRequiredHeaders(headers, REQUIRED_FOLLOWUP_HEADERS, dataType))

  const hasHeaderErrors = issues.some(i => i.code === PreCheckIssueCode.MISSING_REQUIRED_COLUMN)
  if (hasHeaderErrors) {
    return {
      dataType,
      fileName,
      totalRows: Math.max(0, lines.length - 1),
      validRows: 0,
      invalidRowIndices: [],
      issues,
      errorCount: issues.filter(i => i.severity === 'error').length,
      warningCount: issues.filter(i => i.severity === 'warning').length,
      parsedData: [],
    }
  }

  const rows: Record<string, string>[] = []
  const residentDayMap = new Map<string, number[]>()

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim()
    })
    if (!Object.values(row).some(v => v.trim() !== '')) continue
    rows.push(row)

    const rowNum = i + 1
    let rowHasError = false

    REQUIRED_FOLLOWUP_HEADERS.forEach(field => {
      if (!row[field] || !row[field].trim()) {
        issues.push(
          mkIssue(
            PreCheckIssueCode.MISSING_REQUIRED_VALUE,
            'error',
            dataType,
            rowNum,
            field,
            `缺少必填字段: ${field}`,
            `请在第 ${rowNum} 行填写 "${field}"`
          )
        )
        rowHasError = true
      }
    })

    const dateField = row['随访日期']
    if (dateField && !isValidDate(dateField)) {
      issues.push(
        mkIssue(
          PreCheckIssueCode.INVALID_DATE_FORMAT,
          'error',
          dataType,
          rowNum,
          '随访日期',
          `日期格式无效: ${dateField}`,
          '请使用 YYYY-MM-DD、YYYY/MM/DD 或 YYYY年MM月DD日 格式',
          dateField
        )
      )
      rowHasError = true
    }

    const sys = row['收缩压']
    const dia = row['舒张压']
    const glu = row['血糖']

    if (sys && !isNumeric(sys)) {
      issues.push(
        mkIssue(
          PreCheckIssueCode.INVALID_NUMERIC,
          'error',
          dataType,
          rowNum,
          '收缩压',
          `收缩压必须为数字，实际值: ${sys}`,
          '请填写有效的数字（单位 mmHg），例如 138',
          sys
        )
      )
      rowHasError = true
    }
    if (dia && !isNumeric(dia)) {
      issues.push(
        mkIssue(
          PreCheckIssueCode.INVALID_NUMERIC,
          'error',
          dataType,
          rowNum,
          '舒张压',
          `舒张压必须为数字，实际值: ${dia}`,
          '请填写有效的数字（单位 mmHg），例如 85',
          dia
        )
      )
      rowHasError = true
    }
    if (glu && !isNumeric(glu)) {
      issues.push(
        mkIssue(
          PreCheckIssueCode.INVALID_NUMERIC,
          'error',
          dataType,
          rowNum,
          '血糖',
          `血糖必须为数字，实际值: ${glu}`,
          '请填写有效的数字（单位 mmol/L），例如 6.2',
          glu
        )
      )
      rowHasError = true
    }

    const rid = row['居民编号']
    if (rid && residentIds.size > 0 && !residentIds.has(rid)) {
      issues.push(
        mkIssue(
          PreCheckIssueCode.RESIDENT_NOT_FOUND,
          'warning',
          dataType,
          rowNum,
          '居民编号',
          `居民编号 ${rid} 不在居民名册中`,
          '请先导入包含该居民的居民名册 CSV，或修正居民编号',
          rid
        )
      )
    }

    if (rid && dateField) {
      const key = `${rid}_${dateField}`
      if (!residentDayMap.has(key)) residentDayMap.set(key, [])
      residentDayMap.get(key)!.push(rowNum)
    }

    if (rowHasError) invalidRowIndices.add(i - 1)
  }

  residentDayMap.forEach((rowNums) => {
    if (rowNums.length > 1) {
      rowNums.forEach(rn => {
        issues.push(
          mkIssue(
            PreCheckIssueCode.DUPLICATE_FOLLOWUP_SAME_DAY,
            'warning',
            dataType,
            rn,
            '居民编号/随访日期',
            `同一居民同一天存在 ${rowNums.length} 条随访记录`,
            '请核实该居民当天是否真的有多次随访，如为误录请删除重复记录'
          )
        )
      })
    }
  })

  return {
    dataType,
    fileName,
    totalRows: rows.length,
    validRows: rows.length - invalidRowIndices.size,
    invalidRowIndices: Array.from(invalidRowIndices),
    issues,
    errorCount: issues.filter(i => i.severity === 'error').length,
    warningCount: issues.filter(i => i.severity === 'warning').length,
    parsedData: rows,
  }
}

export function buildPreCheckResult(
  residents: PreCheckDataTypeResult | null,
  appointments: PreCheckDataTypeResult | null,
  followups: PreCheckDataTypeResult | null
): PreCheckResult {
  const allIssues: PreCheckIssue[] = []
  if (residents) allIssues.push(...residents.issues)
  if (appointments) allIssues.push(...appointments.issues)
  if (followups) allIssues.push(...followups.issues)

  const totalErrors = allIssues.filter(i => i.severity === 'error').length
  const totalWarnings = allIssues.filter(i => i.severity === 'warning').length

  return {
    preCheckId: generateId('PCR'),
    timestamp: new Date().toISOString(),
    dataTypes: {
      residents,
      appointments,
      followups,
    },
    overall: {
      totalIssues: allIssues.length,
      totalErrors,
      totalWarnings,
      canImport: totalErrors === 0,
      canImportWithWarning: totalErrors === 0 && totalWarnings >= 0,
    },
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
  }
  result.push(current)
  return result
}
