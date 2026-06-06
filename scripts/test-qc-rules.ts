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

console.log(`\n====== 测试结果：通过 ${passed} / ${passed + failed} ======`)
if (failed > 0) {
  process.exit(1)
}
