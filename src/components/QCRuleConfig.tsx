import { useState, useMemo } from 'react'
import {
  Settings,
  Save,
  RotateCcw,
  History,
  Eye,
  X,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Play,
  ShieldCheck,
  Home,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { Button } from './common/Button'
import { Card } from './common/Card'
import { Badge } from './common/Badge'
import {
  AnomalyType,
  AnomalyTypeLabels,
  QualityControlRules,
  DEFAULT_QC_RULES,
  RuleVersion,
} from '@/types'
import { cn } from '@/lib/utils'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

function NumberField({ label, value, onChange, min, max, step = 1, unit }: NumberFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {unit && <span className="text-xs text-gray-500">{unit}</span>}
      </div>
    </div>
  )
}

export function QCRuleConfig() {
  const qcRules = useAppStore(s => s.qcRules)
  const currentRuleVersion = useAppStore(s => s.currentRuleVersion)
  const ruleVersions = useAppStore(s => s.ruleVersions)
  const setQCRules = useAppStore(s => s.setQCRules)
  const restoreDefaultRules = useAppStore(s => s.restoreDefaultRules)
  const applyRuleVersion = useAppStore(s => s.applyRuleVersion)
  const deleteRuleVersion = useAppStore(s => s.deleteRuleVersion)
  const previewRuleChange = useAppStore(s => s.previewRuleChange)

  const [draftRules, setDraftRules] = useState<QualityControlRules>({ ...qcRules })
  const [versionName, setVersionName] = useState('')
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewResult, setPreviewResult] = useState<ReturnType<typeof previewRuleChange> | null>(null)
  const [showApplyConfirm, setShowApplyConfirm] = useState<string | null>(null)

  const isDirty = useMemo(() => {
    return JSON.stringify(draftRules) !== JSON.stringify(qcRules)
  }, [draftRules, qcRules])

  const handlePreview = () => {
    const result = previewRuleChange(draftRules)
    setPreviewResult(result)
    setShowPreview(true)
  }

  const handleSave = () => {
    setQCRules(draftRules, versionName || '自定义规则更新', true)
    setVersionName('')
    setShowPreview(false)
    setPreviewResult(null)
  }

  const handleRestore = () => {
    setDraftRules({ ...DEFAULT_QC_RULES })
    restoreDefaultRules()
  }

  const handleApplyVersion = (version: RuleVersion) => {
    const preview = previewRuleChange(version.rules)
    setPreviewResult(preview)
    setShowApplyConfirm(version.version)
  }

  const confirmApplyVersion = () => {
    if (showApplyConfirm) {
      applyRuleVersion(showApplyConfirm)
      setShowApplyConfirm(null)
      setShowPreview(false)
      setPreviewResult(null)
    }
  }

  const currentVersion = ruleVersions.find(v => v.version === currentRuleVersion)

  return (
    <>
      <Card
        title={
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>质控规则配置</span>
            {currentVersion && (
              <Badge variant="info" className="ml-2">
                {currentVersion.name}
              </Badge>
            )}
          </div>
        }
        subtitle="配置异常识别规则，启用后立即生效"
        headerRight={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowVersionHistory(true)}>
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">版本历史</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleRestore}>
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">恢复默认</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={draftRules.enabled}
                onChange={e => setDraftRules({ ...draftRules, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">启用质控规则</span>
            {!draftRules.enabled && (
              <Badge variant="warning">
                <AlertTriangle className="w-3 h-3 mr-1" />
                规则停用后，仅识别"重复随访"和"居民不在名册"
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  时间窗口规则
                </h4>
                <NumberField
                  label="逾期未访阈值（超过多少天算逾期）"
                  value={draftRules.overdueVisitDaysThreshold}
                  onChange={v => setDraftRules({ ...draftRules, overdueVisitDaysThreshold: v })}
                  min={0}
                  unit="天"
                />
                <NumberField
                  label="未预约匹配窗口（前后多少天内有预约算匹配）"
                  value={draftRules.unplannedVisitWindowDays}
                  onChange={v => setDraftRules({ ...draftRules, unplannedVisitWindowDays: v })}
                  min={0}
                  unit="天"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-rose-50 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-600" />
                  血压阈值
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="收缩压上限"
                    value={draftRules.bloodPressureSystolicMax}
                    onChange={v => setDraftRules({ ...draftRules, bloodPressureSystolicMax: v })}
                    min={0}
                    unit="mmHg"
                  />
                  <NumberField
                    label="收缩压下限"
                    value={draftRules.bloodPressureSystolicMin}
                    onChange={v => setDraftRules({ ...draftRules, bloodPressureSystolicMin: v })}
                    min={0}
                    unit="mmHg"
                  />
                  <NumberField
                    label="舒张压上限"
                    value={draftRules.bloodPressureDiastolicMax}
                    onChange={v => setDraftRules({ ...draftRules, bloodPressureDiastolicMax: v })}
                    min={0}
                    unit="mmHg"
                  />
                  <NumberField
                    label="舒张压下限"
                    value={draftRules.bloodPressureDiastolicMin}
                    onChange={v => setDraftRules({ ...draftRules, bloodPressureDiastolicMin: v })}
                    min={0}
                    unit="mmHg"
                  />
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-600" />
                  血糖阈值
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="血糖上限"
                    value={draftRules.bloodGlucoseMax}
                    onChange={v => setDraftRules({ ...draftRules, bloodGlucoseMax: v })}
                    min={0}
                    step={0.1}
                    unit="mmol/L"
                  />
                  <NumberField
                    label="血糖下限"
                    value={draftRules.bloodGlucoseMin}
                    onChange={v => setDraftRules({ ...draftRules, bloodGlucoseMin: v })}
                    min={0}
                    step={0.1}
                    unit="mmol/L"
                  />
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Home className="w-4 h-4 text-blue-600" />
                  需要上门的状态映射
                </h4>
                <p className="text-xs text-gray-500">
                  选中的异常类型在首次识别时，复核状态将自动标记为"需上门"，而非默认的"待处理"。
                </p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(AnomalyTypeLabels) as AnomalyType[]).map(type => {
                    const selected = draftRules.homeVisitStatusMappings.includes(type)
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          const has = draftRules.homeVisitStatusMappings.includes(type)
                          setDraftRules({
                            ...draftRules,
                            homeVisitStatusMappings: has
                              ? draftRules.homeVisitStatusMappings.filter(t => t !== type)
                              : [...draftRules.homeVisitStatusMappings, type],
                          })
                        }}
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                          selected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                        )}
                      >
                        <span className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center',
                          selected ? 'bg-white/20 border-white/40' : 'border-gray-300')}>
                          {selected && <CheckCircle className="w-3 h-3" />}
                        </span>
                        {AnomalyTypeLabels[type]}
                      </button>
                    )
                  })}
                </div>
                {draftRules.homeVisitStatusMappings.length === 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    未选择任何类型，所有新识别异常的初始状态都将是"待处理"
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-3 border-t border-gray-100">
            <div className="flex-1 max-w-sm">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">版本名称（可选）</label>
              <input
                type="text"
                value={versionName}
                onChange={e => setVersionName(e.target.value)}
                placeholder="如：2026年Q2质控标准"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={!isDirty}
              >
                <Eye className="w-4 h-4" />
                预览差异
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={!isDirty}
              >
                <Save className="w-4 h-4" />
                保存并应用
              </Button>
            </div>
          </div>

          {isDirty && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-700">
                <p className="font-medium">规则已修改但未保存</p>
                <p className="mt-0.5">点击"预览差异"查看影响，或"保存并应用"立即生效。已确认/忽略的异常不会被自动覆盖。</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {showVersionHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowVersionHistory(false)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5" />
                规则版本历史
              </h3>
              <button onClick={() => setShowVersionHistory(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {ruleVersions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无历史版本</p>
              ) : (
                <div className="space-y-3">
                  {[...ruleVersions].reverse().map(version => (
                    <div
                      key={version.version}
                      className={cn(
                        'border rounded-xl p-4 transition-colors',
                        version.version === currentRuleVersion
                          ? 'border-blue-300 bg-blue-50/50'
                          : 'border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{version.name}</span>
                            {version.version === currentRuleVersion && (
                              <Badge variant="success">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                当前版本
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">{version.version}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            创建人: {version.createdBy} · {new Date(version.createdAt).toLocaleString('zh-CN')}
                          </p>
                          {version.description && (
                            <p className="text-sm text-gray-600 mt-2">{version.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              逾期阈值: {version.rules.overdueVisitDaysThreshold}天
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              血压: {version.rules.bloodPressureSystolicMin}-{version.rules.bloodPressureSystolicMax}/{version.rules.bloodPressureDiastolicMin}-{version.rules.bloodPressureDiastolicMax}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              血糖: {version.rules.bloodGlucoseMin}-{version.rules.bloodGlucoseMax}
                            </span>
                            {version.rules.homeVisitStatusMappings.length > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                上门映射: {version.rules.homeVisitStatusMappings.map(t => AnomalyTypeLabels[t]).join('/')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {version.version !== currentRuleVersion && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleApplyVersion(version)}
                              >
                                <Play className="w-3.5 h-3.5" />
                                应用
                              </Button>
                              {version.version !== 'v1.0.0-default' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteRuleVersion(version.version)}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                已确认/忽略的异常记录受保护，不会被规则变更自动覆盖
              </div>
              <Button variant="outline" onClick={() => setShowVersionHistory(false)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPreview && previewResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowPreview(false); setShowApplyConfirm(null) }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                规则变更影响预览
              </h3>
              <button onClick={() => { setShowPreview(false); setShowApplyConfirm(null) }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[55vh] space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-700">{previewResult.newResult.anomalies.length}</p>
                  <p className="text-xs text-slate-500 mt-1">应用后异常总数</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">+{previewResult.added.length}</p>
                  <p className="text-xs text-green-600 mt-1">新增异常</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">-{previewResult.removed.length}</p>
                  <p className="text-xs text-red-600 mt-1">移除异常</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{previewResult.protectedCount}</p>
                  <p className="text-xs text-blue-600 mt-1">受保护记录</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-700">
                  <p className="font-medium">变更将影响 <strong>{previewResult.added.length + previewResult.removed.length + previewResult.changed.length}</strong> 条待处理记录</p>
                  <p className="mt-0.5"><ShieldCheck className="w-3 h-3 inline text-green-600" /> 已确认/忽略的 {previewResult.protectedCount} 条记录受保护，不会被静默覆盖</p>
                </div>
              </div>

              {previewResult.added.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-800 mb-2">新增异常（{previewResult.added.length}条）</h4>
                  <div className="bg-gray-50 rounded-lg max-h-32 overflow-y-auto divide-y divide-gray-200">
                    {previewResult.added.slice(0, 5).map(a => (
                      <div key={a.anomalyId} className="px-3 py-2 text-xs text-gray-600">
                        <Badge variant="success" className="mr-2">{AnomalyTypeLabels[a.type]}</Badge>
                        {a.residentName || a.residentId} · {a.description}
                      </div>
                    ))}
                    {previewResult.added.length > 5 && (
                      <div className="px-3 py-2 text-xs text-gray-400">...还有 {previewResult.added.length - 5} 条</div>
                    )}
                  </div>
                </div>
              )}

              {previewResult.removed.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-800 mb-2">移除异常（{previewResult.removed.length}条）</h4>
                  <div className="bg-gray-50 rounded-lg max-h-32 overflow-y-auto divide-y divide-gray-200">
                    {previewResult.removed.slice(0, 5).map(a => (
                      <div key={a.anomalyId} className="px-3 py-2 text-xs text-gray-600">
                        <Badge variant="danger" className="mr-2">{AnomalyTypeLabels[a.type]}</Badge>
                        {a.residentName || a.residentId} · {a.description}
                      </div>
                    ))}
                    {previewResult.removed.length > 5 && (
                      <div className="px-3 py-2 text-xs text-gray-400">...还有 {previewResult.removed.length - 5} 条</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowPreview(false); setShowApplyConfirm(null) }}>
                取消
              </Button>
              <Button variant="primary" onClick={showApplyConfirm ? confirmApplyVersion : handleSave}>
                <CheckCircle className="w-4 h-4" />
                确认应用
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Clock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function Heart({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}

function Activity({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </svg>
  )
}
