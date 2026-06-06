import { detectAnomalies, calculateRuleDiffPreview } from '../src/utils/anomaly'
import {
  AnomalyType,
  DEFAULT_QC_RULES,
  QualityControlRules,
  Resident,
  Appointment,
  Followup,
  ReviewStatus,
  Anomaly,
} from '../src/types'

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

console.log(`\n====== 测试结果：通过 ${passed} / ${passed + failed} ======`)
if (failed > 0) {
  process.exit(1)
}
