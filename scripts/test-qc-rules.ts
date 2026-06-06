import { detectAnomalies, calculateRuleDiffPreview } from '../src/utils/anomaly'
import {
  AnomalyType,
  DEFAULT_QC_RULES,
  DEFAULT_PRE_CHECK_CONFIG,
  QualityControlRules,
  Resident,
  Appointment,
  Followup,
  ReviewStatus,
  Anomaly,
  PreCheckIssueCode,
} from '../src/types'
import {
  preCheckResidents,
  preCheckAppointments,
  preCheckFollowups,
  buildPreCheckResult,
} from '../src/utils/precheck'

const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
const TWO_WEEKS_AGO = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)

const residents: Resident[] = [
  { residentId: 'R001', name: '张三', gender: '男', site: '中心站', nurse: '李护士', diseaseType: '高血压' },
  { residentId: 'R002', name: '李四', gender: '女', site: '中心站', nurse: '李护士', diseaseType: '糖尿病' },
  { residentId: 'R003', name: '王五', gender: '男', site: '东站', nurse: '王护士', diseaseType: '高血压' },
]

const appointments: Appointment[] = [
  { appointmentId: 'A001', residentId: 'R001', date: TWO_WEEKS_AGO, nurse: '李护士', site: '中心站', status: '已预约' },
  { appointmentId: 'A002', residentId: 'R002', date: YESTERDAY, nurse: '李护士', site: '中心站', status: '已预约' },
]

const followups: Followup[] = [
  { followupId: 'F001', residentId: 'R002', date: YESTERDAY, nurse: '李护士', site: '中心站', bloodPressureSystolic: 180, bloodPressureDiastolic: 110, bloodGlucose: 12.0, visitType: '门诊' },
  { followupId: 'F002', residentId: 'R003', date: YESTERDAY, nurse: '王护士', site: '东站', bloodPressureSystolic: 130, bloodPressureDiastolic: 80, bloodGlucose: 5.5, visitType: '门诊' },
  { followupId: 'F003', residentId: 'R003', date: YESTERDAY, nurse: '王护士', site: '东站', bloodPressureSystolic: 128, bloodPressureDiastolic: 82, bloodGlucose: 5.3, visitType: '门诊' },
]

let passed = 0
let failed = 0

function assert(cond: unknown, msg: string) {
  if (cond) {
    passed++
    console.log(`  ✅ ${msg}`)
  } else {
    failed++
    console.error(`  ❌ ${msg}`)
  }
}

console.log('\n=== 测试1：映射命中 - OVERDUE_VISIT 和 ABNORMAL_METRIC 自动标记为需上门 ===')
{
  const rules: QualityControlRules = {
    ...DEFAULT_QC_RULES,
    homeVisitStatusMappings: [AnomalyType.OVERDUE_VISIT, AnomalyType.ABNORMAL_METRIC],
  }
  const { anomalies } = detectAnomalies(residents, appointments, followups, [], rules, false)
  const overdue = anomalies.filter(a => a.type === AnomalyType.OVERDUE_VISIT)
  const abnormal = anomalies.filter(a => a.type === AnomalyType.ABNORMAL_METRIC)
  const unplanned = anomalies.filter(a => a.type === AnomalyType.UNPLANNED_VISIT)
  const duplicate = anomalies.filter(a => a.type === AnomalyType.DUPLICATE_FOLLOWUP)

  console.log(`  识别到：逾期=${overdue.length}, 指标越界=${abnormal.length}, 未预约=${unplanned.length}, 重复随访=${duplicate.length}`)
  assert(overdue.length >= 1, '至少识别到 1 条逾期未访')
  assert(abnormal.length >= 1, '至少识别到 1 条指标越界')
  assert(overdue.every(a => a.status === ReviewStatus.NEED_HOME_VISIT), '所有逾期未访状态为 NEED_HOME_VISIT')
  assert(abnormal.every(a => a.status === ReviewStatus.NEED_HOME_VISIT), '所有指标越界状态为 NEED_HOME_VISIT')
  assert(unplanned.every(a => a.status === ReviewStatus.PENDING), '未预约到访不在映射中，状态应为 PENDING')
  assert(duplicate.every(a => a.status === ReviewStatus.PENDING), '重复随访不在映射中，状态应为 PENDING')
}

console.log('\n=== 测试2：映射关闭 - 所有异常初始状态均为 PENDING ===')
{
  const rules: QualityControlRules = {
    ...DEFAULT_QC_RULES,
    homeVisitStatusMappings: [],
  }
  const { anomalies } = detectAnomalies(residents, appointments, followups, [], rules, false)
  assert(anomalies.length > 0, '至少识别到一些异常')
  assert(anomalies.every(a => a.status === ReviewStatus.PENDING), '所有异常状态均为 PENDING')
}

console.log('\n=== 测试3：默认值恢复 - DEFAULT_QC_RULES 映射生效 ===')
{
  const { anomalies } = detectAnomalies(residents, appointments, followups, [], DEFAULT_QC_RULES, false)
  const overdue = anomalies.filter(a => a.type === AnomalyType.OVERDUE_VISIT)
  const abnormal = anomalies.filter(a => a.type === AnomalyType.ABNORMAL_METRIC)
  const defaultMapped = DEFAULT_QC_RULES.homeVisitStatusMappings
  console.log(`  DEFAULT_QC_RULES.homeVisitStatusMappings = ${defaultMapped.join(', ')}`)
  assert(defaultMapped.includes(AnomalyType.OVERDUE_VISIT), '默认规则包含 OVERDUE_VISIT')
  assert(defaultMapped.includes(AnomalyType.ABNORMAL_METRIC), '默认规则包含 ABNORMAL_METRIC')
  assert(overdue.every(a => a.status === ReviewStatus.NEED_HOME_VISIT), '默认规则下逾期未访为需上门')
  assert(abnormal.every(a => a.status === ReviewStatus.NEED_HOME_VISIT), '默认规则下指标越界为需上门')
}

console.log('\n=== 测试4：人工复核保护 - 已确认/忽略不被新映射静默覆盖 ===')
{
  const rulesNoMapping: QualityControlRules = { ...DEFAULT_QC_RULES, homeVisitStatusMappings: [] }
  const { anomalies: before } = detectAnomalies(residents, appointments, followups, [], rulesNoMapping, false)
  const manuallyReviewed: Anomaly[] = before.map((a, idx) => ({
    ...a,
    status: idx % 3 === 0 ? ReviewStatus.CONFIRMED : idx % 3 === 1 ? ReviewStatus.IGNORED : ReviewStatus.PENDING,
    updatedAt: new Date().toISOString(),
    handler: '手工处理人',
    remark: '人工标记',
  }))

  const rulesWithMapping: QualityControlRules = {
    ...DEFAULT_QC_RULES,
    homeVisitStatusMappings: [AnomalyType.OVERDUE_VISIT, AnomalyType.ABNORMAL_METRIC],
  }
  const { anomalies: after } = detectAnomalies(
    residents,
    appointments,
    followups,
    manuallyReviewed,
    rulesWithMapping,
    true
  )

  const originallyConfirmed = manuallyReviewed.filter(a => a.status === ReviewStatus.CONFIRMED)
  const originallyIgnored = manuallyReviewed.filter(a => a.status === ReviewStatus.IGNORED)

  console.log(`  原始：已确认=${originallyConfirmed.length}, 忽略=${originallyIgnored.length}, 总数=${manuallyReviewed.length}`)
  assert(
    originallyConfirmed.every(orig => {
      const found = after.find(a => a.type === orig.type && a.relatedId === orig.relatedId)
      return found && found.status === ReviewStatus.CONFIRMED && found.remark === '人工标记'
    }),
    '所有已确认异常保留状态和备注'
  )
  assert(
    originallyIgnored.every(orig => {
      const found = after.find(a => a.type === orig.type && a.relatedId === orig.relatedId)
      return found && found.status === ReviewStatus.IGNORED && found.handler === '手工处理人'
    }),
    '所有忽略异常保留状态和处理人'
  )
}

console.log('\n=== 测试5：规则切换差异预览 - changed 包含状态因映射而变化的异常 ===')
{
  const rulesEmpty: QualityControlRules = { ...DEFAULT_QC_RULES, homeVisitStatusMappings: [] }
  const rulesFull: QualityControlRules = {
    ...DEFAULT_QC_RULES,
    homeVisitStatusMappings: [AnomalyType.OVERDUE_VISIT, AnomalyType.ABNORMAL_METRIC],
  }
  const preview = calculateRuleDiffPreview(
    residents,
    appointments,
    followups,
    [],
    rulesEmpty,
    rulesFull
  )
  console.log(`  预览：新增=${preview.added.length}, 移除=${preview.removed.length}, 变更=${preview.changed.length}, 受保护=${preview.protectedCount}`)
  assert(preview.changed.length >= 2, '至少 2 条异常因映射变更导致状态变化（OVERDUE + ABNORMAL）')
  assert(
    preview.changed.some(a => a.type === AnomalyType.OVERDUE_VISIT && a.status === ReviewStatus.NEED_HOME_VISIT),
    'changed 中包含状态变为 NEED_HOME_VISIT 的 OVERDUE_VISIT'
  )
  assert(
    preview.changed.some(a => a.type === AnomalyType.ABNORMAL_METRIC && a.status === ReviewStatus.NEED_HOME_VISIT),
    'changed 中包含状态变为 NEED_HOME_VISIT 的 ABNORMAL_METRIC'
  )
}

console.log('\n=== 测试6：持久化一致性 - rules 深拷贝独立、字段完整 ===')
{
  const r1: QualityControlRules = { ...DEFAULT_QC_RULES, homeVisitStatusMappings: [AnomalyType.DUPLICATE_FOLLOWUP] }
  const r2: QualityControlRules = JSON.parse(JSON.stringify(r1))
  assert(r2.homeVisitStatusMappings.length === 1, '序列化后映射字段存在')
  assert(r2.homeVisitStatusMappings[0] === AnomalyType.DUPLICATE_FOLLOWUP, '序列化后映射值正确')
  assert(typeof r2.overdueVisitDaysThreshold === 'number', '其他数值字段完好')
  assert(typeof r2.enabled === 'boolean', 'enabled 字段完好')
}

console.log('\n=== 测试7 [回归]：已有自动"需上门"异常 + 清空映射 + 重算 → 自动状态回退为待处理 ===')
{
  // 第 1 步：按默认映射（含 OVERDUE、ABNORMAL）生成首次异常结果
  const rulesMapped: QualityControlRules = {
    ...DEFAULT_QC_RULES,
    homeVisitStatusMappings: [AnomalyType.OVERDUE_VISIT, AnomalyType.ABNORMAL_METRIC],
  }
  const { anomalies: firstPass } = detectAnomalies(residents, appointments, followups, [], rulesMapped, true)
  const autoHomeVisit = firstPass.filter(a => a.status === ReviewStatus.NEED_HOME_VISIT)
  console.log(`  第1步（映射命中）自动生成需上门：${autoHomeVisit.length} 条`)
  assert(autoHomeVisit.length >= 2, '首次识别至少生成 2 条需上门（OVERDUE + ABNORMAL）')
  assert(autoHomeVisit.every(a => a.type === AnomalyType.OVERDUE_VISIT || a.type === AnomalyType.ABNORMAL_METRIC),
    '自动需上门的异常类型与映射一致')

  // 第 2 步：把映射清空，用第 1 步结果作为 existingAnomalies 重算
  const rulesEmpty: QualityControlRules = { ...DEFAULT_QC_RULES, homeVisitStatusMappings: [] }
  const { anomalies: secondPass } = detectAnomalies(residents, appointments, followups, firstPass, rulesEmpty, true)
  const stillHome = secondPass.filter(a => a.status === ReviewStatus.NEED_HOME_VISIT)
  const pendingNow = secondPass.filter(a => a.status === ReviewStatus.PENDING)
  console.log(`  第2步（清空映射）需上门=${stillHome.length}, 待处理=${pendingNow.length}`)
  assert(stillHome.length === 0, '清空映射后，自动需上门异常全部回退为待处理（0 条需上门保留）')
  assert(pendingNow.length === secondPass.length, '清空映射后，所有未做人工复核的异常状态都应为待处理')
}

console.log('\n=== 测试8 [回归]：清空映射后恢复默认 → 自动状态再次变为需上门 ===')
{
  // 先用空映射生成一批 PENDING 异常
  const rulesEmpty: QualityControlRules = { ...DEFAULT_QC_RULES, homeVisitStatusMappings: [] }
  const { anomalies: pendingOnes } = detectAnomalies(residents, appointments, followups, [], rulesEmpty, true)
  assert(pendingOnes.every(a => a.status === ReviewStatus.PENDING), '空映射下所有异常初始化为待处理')

  // 恢复默认映射，应该重新把 OVERDUE、ABNORMAL 标为需上门
  const { anomalies: restored } = detectAnomalies(
    residents,
    appointments,
    followups,
    pendingOnes,
    DEFAULT_QC_RULES,
    true
  )
  const overdue = restored.filter(a => a.type === AnomalyType.OVERDUE_VISIT)
  const abnormal = restored.filter(a => a.type === AnomalyType.ABNORMAL_METRIC)
  assert(overdue.every(a => a.status === ReviewStatus.NEED_HOME_VISIT), '恢复默认映射后，逾期未访重新变需上门')
  assert(abnormal.every(a => a.status === ReviewStatus.NEED_HOME_VISIT), '恢复默认映射后，指标越界重新变需上门')
}

console.log('\n=== 测试9 [回归]：人工已确认/忽略 vs 自动需上门 —— 映射变化时只有自动状态受影响 ===')
{
  // 先生成默认映射下的异常
  const rulesFull: QualityControlRules = {
    ...DEFAULT_QC_RULES,
    homeVisitStatusMappings: [AnomalyType.OVERDUE_VISIT, AnomalyType.ABNORMAL_METRIC],
  }
  const { anomalies: baseline } = detectAnomalies(residents, appointments, followups, [], rulesFull, true)

  // 模拟人工复核：把第 1 条标记为 CONFIRMED，第 2 条标记为 IGNORED，其余保持自动 NEED_HOME_VISIT
  const manuallyReviewed: Anomaly[] = baseline.map((a, idx) => {
    if (idx === 0) return { ...a, status: ReviewStatus.CONFIRMED, handler: '复核员A', remark: '人工确认' }
    if (idx === 1) return { ...a, status: ReviewStatus.IGNORED, handler: '复核员B', remark: '误报忽略' }
    return a
  })

  // 清空映射重算
  const rulesEmpty: QualityControlRules = { ...DEFAULT_QC_RULES, homeVisitStatusMappings: [] }
  const { anomalies: afterEmpty } = detectAnomalies(
    residents,
    appointments,
    followups,
    manuallyReviewed,
    rulesEmpty,
    true
  )

  const confirmed = afterEmpty.filter(a => a.status === ReviewStatus.CONFIRMED)
  const ignored = afterEmpty.filter(a => a.status === ReviewStatus.IGNORED)
  const autoHome = afterEmpty.filter(a => a.status === ReviewStatus.NEED_HOME_VISIT)
  console.log(`  映射清空后：已确认=${confirmed.length}, 忽略=${ignored.length}, 需上门=${autoHome.length}`)
  assert(confirmed.length === 1 && confirmed[0].remark === '人工确认', '人工 CONFIRMED 状态和备注完整保留')
  assert(ignored.length === 1 && ignored[0].handler === '复核员B', '人工 IGNORED 状态和处理人完整保留')
  assert(autoHome.length === 0, '自动生成的需上门在映射清空后全部回退，无一保留')
}

console.log('\n=== 测试10 [回归]：规则版本切换时的差异预览能识别自动状态变化 ===')
{
  // 先按默认映射生成一批 existingAnomalies（含自动需上门）
  const rulesFull: QualityControlRules = {
    ...DEFAULT_QC_RULES,
    homeVisitStatusMappings: [AnomalyType.OVERDUE_VISIT, AnomalyType.ABNORMAL_METRIC],
  }
  const { anomalies: existingWithHome } = detectAnomalies(residents, appointments, followups, [], rulesFull, true)

  // 预览：从默认映射（命中2类）切换到仅映射重复随访 → OVERDUE 和 ABNORMAL 的状态会从 NEED_HOME_VISIT → PENDING
  const rulesOnlyDup: QualityControlRules = {
    ...DEFAULT_QC_RULES,
    homeVisitStatusMappings: [AnomalyType.DUPLICATE_FOLLOWUP],
  }
  const preview = calculateRuleDiffPreview(
    residents,
    appointments,
    followups,
    existingWithHome,
    rulesFull,
    rulesOnlyDup
  )
  console.log(`  预览：新增=${preview.added.length}, 移除=${preview.removed.length}, 变更=${preview.changed.length}`)
  assert(preview.changed.length >= 2, '至少 2 条异常因映射变更导致状态变化（OVERDUE + ABNORMAL 从需上门回退为待处理）')
  assert(
    preview.changed.some(a => a.type === AnomalyType.OVERDUE_VISIT && a.status === ReviewStatus.PENDING),
    '差异预览中 OVERDUE_VISIT 的新状态为 PENDING（从需上门回退）'
  )
  assert(
    preview.changed.some(a => a.type === AnomalyType.ABNORMAL_METRIC && a.status === ReviewStatus.PENDING),
    '差异预览中 ABNORMAL_METRIC 的新状态为 PENDING（从需上门回退）'
  )
}

console.log('\n=== 预检测试1：居民名册 - 缺失必填列识别 ===')
{
  const csvBad = '姓名,性别\n张三,男\n李四,女'
  const result = preCheckResidents(csvBad, 'residents_bad.csv')
  const missingCol = result.issues.find(i => i.code === PreCheckIssueCode.MISSING_REQUIRED_COLUMN && i.field === '居民编号')
  console.log(`  问题总数=${result.issues.length}, 错误=${result.errorCount}, 警告=${result.warningCount}`)
  assert(result.errorCount >= 1, '缺少"居民编号"列应产生至少1个错误')
  assert(!!missingCol, '应识别出缺失必填列"居民编号"')
  assert(missingCol?.severity === 'error', '缺失必填列严重程度应为 error')
  assert(missingCol?.row === 1, '缺失列问题行号应为1（表头行）')
  assert(!!missingCol?.suggestion, '每条问题都应该包含修复建议')
}

console.log('\n=== 预检测试2：居民名册 - 缺失必填值识别 ===')
{
  const csv = '居民编号,姓名,性别\n,张三,男\nR002,,女\nR003,王五,男'
  const result = preCheckResidents(csv, 'residents.csv')
  const missingVals = result.issues.filter(i => i.code === PreCheckIssueCode.MISSING_REQUIRED_VALUE)
  console.log(`  缺失必填值=${missingVals.length}, validRows=${result.validRows}/${result.totalRows}`)
  assert(missingVals.length >= 2, '应识别出2条缺失必填值（第2行缺编号，第3行缺姓名）')
  assert(result.validRows === result.totalRows - result.invalidRowIndices.length, 'validRows 应该等于总行数减无效行数')
  assert(missingVals.every(i => i.severity === 'error'), '缺失必填值严重程度应为 error')
  assert(missingVals.some(i => i.row === 2 && i.field === '居民编号'), '第2行缺居民编号')
  assert(missingVals.some(i => i.row === 3 && i.field === '姓名'), '第3行缺姓名')
}

console.log('\n=== 预检测试3：预约计划 - 日期格式异常识别 ===')
{
  const residentIds = new Set(['R001', 'R002'])
  const csv = '居民编号,预约日期\nR001,2026-13-45\nR002,not-a-date\nR001,2026-06-01'
  const result = preCheckAppointments(csv, 'appointments.csv', residentIds)
  const badDates = result.issues.filter(i => i.code === PreCheckIssueCode.INVALID_DATE_FORMAT)
  console.log(`  日期格式异常=${badDates.length}`)
  assert(badDates.length >= 2, '应识别2条无效日期')
  assert(badDates.every(i => i.severity === 'error'), '日期格式错误严重程度为 error')
  assert(badDates.some(i => i.value === '2026-13-45'), '记录原始值 2026-13-45')
  assert(badDates.some(i => i.value === 'not-a-date'), '记录原始值 not-a-date')
}

console.log('\n=== 预检测试4：随访记录 - 数值字段非法识别 ===')
{
  const residentIds = new Set(['R001'])
  const csv = '居民编号,随访日期,收缩压,舒张压,血糖\nR001,2026-06-01,abc,85,6.2\nR001,2026-06-02,130,xyz,5.5\nR001,2026-06-03,120,80,bad'
  const result = preCheckFollowups(csv, 'followups.csv', residentIds)
  const badNums = result.issues.filter(i => i.code === PreCheckIssueCode.INVALID_NUMERIC)
  console.log(`  数值非法=${badNums.length}, 字段=${badNums.map(i => i.field).join(',')}`)
  assert(badNums.length >= 3, '应识别3条数值非法')
  assert(badNums.some(i => i.field === '收缩压' && i.value === 'abc'), '收缩压 abc 应识别')
  assert(badNums.some(i => i.field === '舒张压' && i.value === 'xyz'), '舒张压 xyz 应识别')
  assert(badNums.some(i => i.field === '血糖' && i.value === 'bad'), '血糖 bad 应识别')
}

console.log('\n=== 预检测试5：居民编号跨表找不到（预约/随访引用不存在的居民） ===')
{
  const residentIds = new Set(['R001', 'R002'])
  const aptCsv = '居民编号,预约日期\nR001,2026-06-01\nR999,2026-06-02'
  const folCsv = '居民编号,随访日期\nR002,2026-06-01\nR888,2026-06-03'
  const aptResult = preCheckAppointments(aptCsv, 'apt.csv', residentIds)
  const folResult = preCheckFollowups(folCsv, 'fol.csv', residentIds)
  const aptMissing = aptResult.issues.filter(i => i.code === PreCheckIssueCode.RESIDENT_NOT_FOUND)
  const folMissing = folResult.issues.filter(i => i.code === PreCheckIssueCode.RESIDENT_NOT_FOUND)
  console.log(`  预约找不到居民=${aptMissing.length}, 随访找不到=${folMissing.length}`)
  assert(aptMissing.length >= 1 && aptMissing[0].value === 'R999', '预约 R999 应识别为警告')
  assert(folMissing.length >= 1 && folMissing[0].value === 'R888', '随访 R888 应识别为警告')
  assert(aptMissing[0].severity === 'warning', '居民编号找不到严重程度为 warning（不是阻断性错误）')
}

console.log('\n=== 预检测试6：同一居民同日重复随访识别 ===')
{
  const residentIds = new Set(['R001', 'R002'])
  const csv = '居民编号,随访日期\nR001,2026-06-01\nR001,2026-06-01\nR001,2026-06-01\nR002,2026-06-02'
  const result = preCheckFollowups(csv, 'fol.csv', residentIds)
  const dups = result.issues.filter(i => i.code === PreCheckIssueCode.DUPLICATE_FOLLOWUP_SAME_DAY)
  console.log(`  重复随访问题数=${dups.length}`)
  assert(dups.length === 3, 'R001在6月1日有3条记录，应各自产生1条重复随访警告')
  assert(dups.every(i => i.severity === 'warning'), '重复随访严重程度为 warning')
  assert(dups.every(i => i.dataType === 'followups'), '数据类型应为 followups')
}

console.log('\n=== 预检测试7：预检结果聚合 - 通过/警告/失败分类 ===')
{
  const residentIds = new Set(['R001'])
  const residentsOk = preCheckResidents('居民编号,姓名\nR001,张三', 'r.csv')
  const aptsWarn = preCheckAppointments('居民编号,预约日期\nR999,2026-06-01', 'a.csv', residentIds)
  const followupsErr = preCheckFollowups('居民编号,随访日期\nR001,invalid-date', 'f.csv', residentIds)
  const passResult = buildPreCheckResult(residentsOk, null, null)
  const warnResult = buildPreCheckResult(null, aptsWarn, null)
  const failResult = buildPreCheckResult(null, null, followupsErr)
  console.log(`  通过: canImport=${passResult.overall.canImport}, errors=${passResult.overall.totalErrors}`)
  console.log(`  警告: canImport=${warnResult.overall.canImport}, warnings=${warnResult.overall.totalWarnings}`)
  console.log(`  失败: canImport=${failResult.overall.canImport}, errors=${failResult.overall.totalErrors}`)
  assert(passResult.overall.canImport === true && passResult.overall.totalErrors === 0, '无错误无警告时 canImport=true')
  assert(warnResult.overall.canImport === true && warnResult.overall.totalWarnings > 0, '仅有警告时 canImport=true（警告可配置是否拦截）')
  assert(failResult.overall.canImport === false && failResult.overall.totalErrors > 0, '有错误时 canImport=false')
}

console.log('\n=== 预检测试8：预检配置持久化默认值 ===')
{
  assert(DEFAULT_PRE_CHECK_CONFIG.maxDisplayIssues === 100, '默认最多展示 100 条')
  assert(DEFAULT_PRE_CHECK_CONFIG.allowWarningContinue === true, '默认允许警告继续导入')
  const cfg = JSON.parse(JSON.stringify(DEFAULT_PRE_CHECK_CONFIG))
  assert(cfg.maxDisplayIssues === 100, 'JSON 序列化后 maxDisplayIssues 正确')
  assert(cfg.allowWarningContinue === true, 'JSON 序列化后 allowWarningContinue 正确')
}

console.log('\n=== 预检测试9：问题行号与字段信息完整 ===')
{
  const residentIds = new Set(['R001'])
  const csv = [
    '居民编号,随访日期,收缩压,舒张压,血糖',
    'R001,bad-date,abc,80,6.0',
    'R999,2026-06-01,130,85,5.5',
    'R001,2026-06-02,120,bad-glucose,5.5',
  ].join('\n')
  const result = preCheckFollowups(csv, 'f.csv', residentIds)
  console.log(`  总行数=${result.totalRows}, 问题=${result.issues.length}`)
  result.issues.forEach(i => {
    assert(typeof i.row === 'number' && i.row >= 1, `每条问题都有有效行号: ${i.field}=${i.row}`)
    assert(!!i.field, `每条问题都有字段名: row=${i.row}`)
    assert(!!i.message, `每条问题都有描述消息: row=${i.row}`)
    assert(!!i.suggestion, `每条问题都有修复建议: row=${i.row}`)
    assert(!!i.code, `每条问题都有错误码`)
  })
}

console.log(`\n====== 测试结果：通过 ${passed} / ${passed + failed} ======`)
if (failed > 0) {
  process.exit(1)
}
