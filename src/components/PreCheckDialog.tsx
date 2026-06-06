import { useMemo, useState } from 'react'
import {
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Download,
  Search,
  Filter,
  Settings,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { Button } from './common/Button'
import { Badge } from './common/Badge'
import {
  DataType,
  DataTypeLabels,
  PreCheckIssue,
  PreCheckIssueSeverity,
} from '@/types'
import { cn } from '@/lib/utils'

interface PreCheckDialogProps {
  open: boolean
  onClose: () => void
}

function SeverityBadge({ severity }: { severity: PreCheckIssueSeverity }) {
  if (severity === 'error') {
    return (
      <Badge variant="danger" className="inline-flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        错误
      </Badge>
    )
  }
  return (
    <Badge variant="warning" className="inline-flex items-center gap-1">
      <AlertTriangle className="w-3 h-3" />
      警告
    </Badge>
  )
}

function IssueRow({ issue }: { issue: PreCheckIssue }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
      <td className="px-3 py-2.5 w-16">
        <span className="font-mono text-xs text-gray-500">L{issue.row}</span>
      </td>
      <td className="px-3 py-2.5 w-20">
        <SeverityBadge severity={issue.severity} />
      </td>
      <td className="px-3 py-2.5 w-28">
        <span className="text-xs text-gray-500">{DataTypeLabels[issue.dataType]}</span>
      </td>
      <td className="px-3 py-2.5 w-32">
        <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-700">
          {issue.field}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <p className="text-sm text-gray-700">{issue.message}</p>
        {issue.value && (
          <p className="text-xs text-gray-400 mt-0.5">
            原值: <code className="bg-gray-100 px-1 rounded">{issue.value}</code>
          </p>
        )}
      </td>
      <td className="px-3 py-2.5 w-56">
        <p className="text-xs text-emerald-600 flex items-start gap-1">
          <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {issue.suggestion}
        </p>
      </td>
    </tr>
  )
}

export function PreCheckDialog({ open, onClose }: PreCheckDialogProps) {
  const preCheckResult = useAppStore(s => s.preCheckResult)
  const pendingFile = useAppStore(s => s.preCheckPendingFile)
  const preCheckConfig = useAppStore(s => s.preCheckConfig)
  const setPreCheckConfig = useAppStore(s => s.setPreCheckConfig)
  const preCheckFilterSeverity = useAppStore(s => s.preCheckFilterSeverity)
  const preCheckFilterDataType = useAppStore(s => s.preCheckFilterDataType)
  const preCheckFilterSearch = useAppStore(s => s.preCheckFilterSearch)
  const setPreCheckFilter = useAppStore(s => s.setPreCheckFilter)
  const getFilteredPreCheckIssues = useAppStore(s => s.getFilteredPreCheckIssues)
  const confirmImportFromPreCheck = useAppStore(s => s.confirmImportFromPreCheck)
  const cancelPreCheck = useAppStore(s => s.cancelPreCheck)
  const exportPreCheckReport = useAppStore(s => s.exportPreCheckReport)

  const [showConfig, setShowConfig] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const issues = useMemo(() => getFilteredPreCheckIssues(), [getFilteredPreCheckIssues])

  const groupedIssues = useMemo(() => {
    const errors = issues.filter(i => i.severity === 'error')
    const warnings = issues.filter(i => i.severity === 'warning')
    return { errors, warnings }
  }, [issues])

  if (!open || !preCheckResult || !pendingFile) return null

  const { overall, dataTypes } = preCheckResult
  const currentTypeResult = dataTypes[pendingFile.type]
  const canImport = overall.canImport
  const hasWarningsOnly = !canImport ? false : overall.totalWarnings > 0
  const allowContinueWithWarning = preCheckConfig.allowWarningContinue

  const handleConfirm = async (mode: 'all' | 'validOnly') => {
    setConfirming(true)
    try {
      await confirmImportFromPreCheck(mode)
      onClose()
    } finally {
      setConfirming(false)
    }
  }

  const handleCancel = () => {
    cancelPreCheck()
    onClose()
  }

  const dataTypeOptions: { key: 'all' | DataType; label: string }[] = [
    { key: 'all', label: '全部类型' },
    { key: 'residents', label: DataTypeLabels.residents },
    { key: 'appointments', label: DataTypeLabels.appointments },
    { key: 'followups', label: DataTypeLabels.followups },
  ]

  const severityOptions: { key: 'all' | PreCheckIssueSeverity; label: string }[] = [
    { key: 'all', label: '全部级别' },
    { key: 'error', label: '仅错误' },
    { key: 'warning', label: '仅警告' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              canImport
                ? hasWarningsOnly
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-emerald-100 text-emerald-600'
                : 'bg-red-100 text-red-600'
            )}>
              {canImport
                ? hasWarningsOnly
                  ? <AlertTriangle className="w-5 h-5" />
                  : <CheckCircle className="w-5 h-5" />
                : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                数据质量预检结果
                <Badge variant="neutral">
                  <FileText className="w-3 h-3 mr-1" />
                  {pendingFile.fileName}
                </Badge>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                请检查以下问题后决定是否导入
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showConfig ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-500'
              )}
              title="预检配置"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {showConfig && (
          <div className="px-6 py-4 bg-slate-50 border-b border-gray-100 flex-shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">最多展示错误数</label>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  step={10}
                  value={preCheckConfig.maxDisplayIssues}
                  onChange={e => setPreCheckConfig({ maxDisplayIssues: Math.max(10, Math.min(1000, Number(e.target.value) || 100)) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">超出部分被截断，可通过缩小筛选范围查看更多</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">是否允许警告继续导入</label>
                <div className="flex items-center gap-3 pt-1">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preCheckConfig.allowWarningContinue}
                      onChange={e => setPreCheckConfig({ allowWarningContinue: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                  </label>
                  <span className="text-sm text-gray-700">
                    {preCheckConfig.allowWarningContinue ? '开启：存在警告也可继续导入' : '关闭：有警告时拦截'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50/60 border-b border-gray-100 flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-700">{overall.totalIssues}</p>
              <p className="text-xs text-gray-500 mt-0.5">问题总数</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{overall.totalErrors}</p>
              <p className="text-xs text-red-600 mt-0.5">错误</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{overall.totalWarnings}</p>
              <p className="text-xs text-amber-600 mt-0.5">警告</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-700">{currentTypeResult?.totalRows ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">数据行数</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{currentTypeResult?.validRows ?? 0}</p>
              <p className="text-xs text-emerald-600 mt-0.5">有效行数</p>
            </div>
          </div>

          {!canImport ? (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">预检未通过，存在 {overall.totalErrors} 个错误</p>
                <p className="mt-0.5">错误级别的问题必须修复后才能导入，旧数据已保留不会被覆盖。</p>
              </div>
            </div>
          ) : hasWarningsOnly ? (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700">
                <p className="font-medium">
                  存在 {overall.totalWarnings} 个警告
                  {allowContinueWithWarning ? '，仍可继续导入' : '，系统配置已拦截，请调整后再试'}
                </p>
                <p className="mt-0.5">警告不会阻止导入（按配置），但建议优先修复以保证数据质量。</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-emerald-700">
                <p className="font-medium">预检通过，无错误和警告</p>
                <p className="mt-0.5">可以安全导入数据。</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {severityOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setPreCheckFilter({ severity: opt.key })}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-md font-medium transition-colors',
                  preCheckFilterSeverity === opt.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {opt.label}
                {opt.key === 'error' && overall.totalErrors > 0 && (
                  <span className="ml-1 text-red-500">({overall.totalErrors})</span>
                )}
                {opt.key === 'warning' && overall.totalWarnings > 0 && (
                  <span className="ml-1 text-amber-600">({overall.totalWarnings})</span>
                )}
              </button>
            ))}
          </div>

          <select
            value={preCheckFilterDataType}
            onChange={e => setPreCheckFilter({ dataType: e.target.value as typeof preCheckFilterDataType })}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {dataTypeOptions.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={preCheckFilterSearch}
              onChange={e => setPreCheckFilter({ search: e.target.value })}
              placeholder="搜索描述、字段、建议..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex-1" />

          <Badge variant="neutral">
            <Filter className="w-3 h-3 mr-1" />
            显示 {issues.length} / {overall.totalIssues} 条
          </Badge>

          <div className="relative group">
            <Button variant="outline" size="sm" disabled={issues.length === 0}>
              <Download className="w-4 h-4" />
              导出报告
            </Button>
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => exportPreCheckReport('csv')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                导出 CSV
              </button>
              <button
                onClick={() => exportPreCheckReport('json')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t border-gray-100"
              >
                导出 JSON
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {groupedIssues.errors.length > 0 && (
            <div>
              <div className="sticky top-0 bg-red-50 px-6 py-2 border-b border-red-100 flex items-center gap-2 z-10">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-semibold text-red-700">错误（必须修复）</span>
                <span className="text-xs text-red-500">× {groupedIssues.errors.length}</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80">
                  <tr className="text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-3 py-2 text-left w-16">行号</th>
                    <th className="px-3 py-2 text-left w-20">级别</th>
                    <th className="px-3 py-2 text-left w-28">数据类型</th>
                    <th className="px-3 py-2 text-left w-32">字段</th>
                    <th className="px-3 py-2 text-left">问题描述</th>
                    <th className="px-3 py-2 text-left w-56">修复建议</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedIssues.errors.map(issue => (
                    <IssueRow key={issue.issueId} issue={issue} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {groupedIssues.warnings.length > 0 && (
            <div>
              <div className="sticky top-0 bg-amber-50 px-6 py-2 border-b border-amber-100 flex items-center gap-2 z-10">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">警告（建议修复）</span>
                <span className="text-xs text-amber-500">× {groupedIssues.warnings.length}</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80">
                  <tr className="text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-3 py-2 text-left w-16">行号</th>
                    <th className="px-3 py-2 text-left w-20">级别</th>
                    <th className="px-3 py-2 text-left w-28">数据类型</th>
                    <th className="px-3 py-2 text-left w-32">字段</th>
                    <th className="px-3 py-2 text-left">问题描述</th>
                    <th className="px-3 py-2 text-left w-56">修复建议</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedIssues.warnings.map(issue => (
                    <IssueRow key={issue.issueId} issue={issue} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {issues.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-gray-600 font-medium">
                {preCheckFilterSeverity !== 'all' || preCheckFilterDataType !== 'all' || preCheckFilterSearch
                  ? '没有符合筛选条件的问题'
                  : '没有发现任何问题，数据质量良好！'}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            预检未通过或取消导入时，已有数据不会被覆盖
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={handleCancel} disabled={confirming}>
              取消
            </Button>
            {(canImport && hasWarningsOnly && allowContinueWithWarning) && (
              <Button
                variant="outline"
                onClick={() => handleConfirm('validOnly')}
                disabled={confirming || (currentTypeResult?.validRows ?? 0) === 0}
              >
                <Upload className="w-4 h-4" />
                仅导入有效数据
              </Button>
            )}
            <Button
              variant={canImport ? 'primary' : 'danger'}
              onClick={() => handleConfirm('all')}
              disabled={confirming || !canImport || (hasWarningsOnly && !allowContinueWithWarning)}
            >
              <Upload className="w-4 h-4" />
              {canImport
                ? hasWarningsOnly
                  ? '警告继续导入'
                  : '确认导入'
                : '无法导入（有错误）'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
