import { useState, useRef } from 'react'
import {
  X,
  Package,
  Download,
  Upload,
  Play,
  Undo2,
  Trash2,
  FileJson,
  FileSpreadsheet,
  Filter,
  CheckSquare,
  Calendar,
  User,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Layers,
  Check,
  Info,
  Clock,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import {
  HandoverPackage,
  HandoverImportValidationResult,
  HandoverApplyResult,
  HandoverUndoResult,
  ReviewStatusLabels,
  ReviewStatus,
} from '@/types'
import { cn } from '@/lib/utils'

interface HandoverPanelProps {
  open: boolean
  onClose: () => void
}

const StatusLabelColor: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING]: 'bg-amber-100 text-amber-700',
  [ReviewStatus.CONFIRMED]: 'bg-emerald-100 text-emerald-700',
  [ReviewStatus.IGNORED]: 'bg-gray-100 text-gray-600',
  [ReviewStatus.NEED_HOME_VISIT]: 'bg-blue-100 text-blue-700',
}

function FormatDate({ iso }: { iso: string }) {
  try {
    return new Date(iso).toLocaleString('zh-CN')
  } catch {
    return iso
  }
}

function PackageCard({
  pkg,
  expanded,
  onToggle,
  onApply,
  onDelete,
}: {
  pkg: HandoverPackage
  expanded: boolean
  onToggle: () => void
  onApply: (id: string) => void
  onDelete: (id: string) => void
  onExport: (id: string, format: 'json' | 'csv') => void
}) {
  const exportHandoverPackage = useAppStore(s => s.exportHandoverPackage)

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900 truncate">{pkg.name}</h4>
            <Badge variant={pkg.sourceMode === 'filter' ? 'info' : 'warning'}>
              {pkg.sourceMode === 'filter' ? <Filter className="w-3 h-3 mr-1" /> : <CheckSquare className="w-3 h-3 mr-1" />}
              {pkg.sourceMode === 'filter' ? '筛选结果' : '勾选记录'}
            </Badge>
            <Badge variant="neutral" className="text-xs">
              <Layers className="w-3 h-3 mr-1" />
              {pkg.anomalies.length} 条异常
            </Badge>
          </div>
          {pkg.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{pkg.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {pkg.createdBy}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <FormatDate iso={pkg.createdAt} />
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              规则 {pkg.ruleVersion}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="relative group">
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4" />
            </Button>
            <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => exportHandoverPackage(pkg.packageId, 'json')}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1.5"
              >
                <FileJson className="w-3.5 h-3.5" />
                导出 JSON
              </button>
              <button
                onClick={() => exportHandoverPackage(pkg.packageId, 'csv')}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 border-t border-gray-100"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                导出 CSV
              </button>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => onApply(pkg.packageId)}>
            <Play className="w-4 h-4" />
            应用
          </Button>
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDelete(pkg.packageId)}
            className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          {pkg.importBatchSummaries.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">关联导入批次</p>
              <div className="space-y-1">
                {pkg.importBatchSummaries.map(b => (
                  <div key={b.batchId} className="text-xs text-gray-600 flex items-center gap-2">
                    <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">{b.batchId}</span>
                    <span>{b.dataType}</span>
                    <span className="text-gray-400">·</span>
                    <span>{b.importedCount} 条</span>
                    <span className="text-gray-400">·</span>
                    <span>{b.operator}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {pkg.filters && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">筛选条件</p>
              <div className="flex flex-wrap gap-1.5">
                {pkg.filters.statuses.length > 0 && (
                  <Badge variant="neutral">状态: {pkg.filters.statuses.join('、')}</Badge>
                )}
                {pkg.filters.anomalyTypes.length > 0 && (
                  <Badge variant="neutral">类型: {pkg.filters.anomalyTypes.join('、')}</Badge>
                )}
                {pkg.filters.sites.length > 0 && (
                  <Badge variant="neutral">站点: {pkg.filters.sites.join('、')}</Badge>
                )}
                {pkg.filters.searchText && (
                  <Badge variant="neutral">搜索: {pkg.filters.searchText}</Badge>
                )}
                {pkg.filters.statuses.length === 0 && pkg.filters.anomalyTypes.length === 0 && pkg.filters.sites.length === 0 && !pkg.filters.searchText && (
                  <span className="text-xs text-gray-400">无筛选条件</span>
                )}
              </div>
            </div>
          )}
          <div className="max-h-56 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-100">
                <tr className="text-gray-500">
                  <th className="px-3 py-2 text-left font-medium">居民</th>
                  <th className="px-3 py-2 text-left font-medium">状态</th>
                  <th className="px-3 py-2 text-left font-medium">责任护士</th>
                  <th className="px-3 py-2 text-left font-medium">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pkg.anomalies.map(item => (
                  <tr key={item.anomalyId} className="hover:bg-white">
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-800">{item.residentName || '-'}</span>
                      <span className="text-gray-400 ml-1">{item.residentId}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', StatusLabelColor[item.status])}>
                        {ReviewStatusLabels[item.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{item.handler || '-'}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{item.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export function HandoverPanel({ open, onClose }: HandoverPanelProps) {
  const handoverPackages = useAppStore(s => s.handoverPackages)
  const handoverApplyHistory = useAppStore(s => s.handoverApplyHistory)
  const selectedAnomalyIds = useAppStore(s => s.selectedAnomalyIds)
  const getFilteredAnomalies = useAppStore(s => s.getFilteredAnomalies)
  const createHandoverPackage = useAppStore(s => s.createHandoverPackage)
  const importHandoverPackage = useAppStore(s => s.importHandoverPackage)
  const applyHandoverPackage = useAppStore(s => s.applyHandoverPackage)
  const undoLastHandoverApply = useAppStore(s => s.undoLastHandoverApply)
  const deleteHandoverPackage = useAppStore(s => s.deleteHandoverPackage)

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'import'>('list')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [sourceMode, setSourceMode] = useState<'filter' | 'selected'>('filter')
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string; pkg?: HandoverPackage } | null>(null)

  const [importText, setImportText] = useState('')
  const [importResult, setImportResult] = useState<HandoverImportValidationResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [applyResult, setApplyResult] = useState<HandoverApplyResult | null>(null)
  const [undoResult, setUndoResult] = useState<HandoverUndoResult | null>(null)
  const [showApplyConfirm, setShowApplyConfirm] = useState<string | null>(null)

  const filteredCount = getFilteredAnomalies().length
  const selectedCount = selectedAnomalyIds.length
  const effectiveCount = sourceMode === 'filter' ? filteredCount : selectedCount

  if (!open) return null

  const handleCreate = () => {
    if (!createName.trim()) {
      setCreateResult({ success: false, message: '请输入交接包名称' })
      return
    }
    if (effectiveCount === 0) {
      setCreateResult({ success: false, message: sourceMode === 'filter' ? '当前筛选结果为空' : '请先勾选至少一条记录' })
      return
    }
    const pkg = createHandoverPackage({ name: createName.trim(), description: createDesc.trim(), sourceMode })
    setCreateResult({ success: true, message: `成功生成交接包「${pkg.name}」，含 ${pkg.anomalies.length} 条异常记录`, pkg })
    setCreateName('')
    setCreateDesc('')
  }

  const handleFilePick = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = String(e.target?.result || '')
      setImportText(text)
      const result = importHandoverPackage(text)
      setImportResult(result)
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImportPaste = () => {
    if (!importText.trim()) {
      setImportResult({ valid: false, canApply: false, issues: [], errorCount: 0, warningCount: 0, parsedPackage: undefined, applicableCount: 0, protectedCount: 0, notFoundCount: 0, olderStatusCount: 0 })
      return
    }
    const result = importHandoverPackage(importText)
    setImportResult(result)
  }

  const handleApply = (packageId: string) => {
    setShowApplyConfirm(null)
    const result = applyHandoverPackage(packageId)
    setApplyResult(result)
    setActiveTab('list')
  }

  const handleUndo = () => {
    const result = undoLastHandoverApply()
    setUndoResult(result)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">交接包管理</h3>
              <p className="text-xs text-gray-500">用于班与班之间异常复核工作的交接</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 py-2 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
          <button
            onClick={() => { setActiveTab('list'); setApplyResult(null); setUndoResult(null) }}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === 'list' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-white/60'
            )}
          >
            交接包列表 ({handoverPackages.length})
          </button>
          <button
            onClick={() => { setActiveTab('create'); setCreateResult(null) }}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === 'create' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-white/60'
            )}
          >
            生成交接包
          </button>
          <button
            onClick={() => { setActiveTab('import'); setImportResult(null); setImportText('') }}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === 'import' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-white/60'
            )}
          >
            导入交接包
          </button>
          <div className="flex-1" />
          <button
            onClick={handleUndo}
            disabled={handoverApplyHistory.filter(h => !h.undone).length === 0}
            className="px-3 py-1.5 text-sm font-medium rounded-md text-amber-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Undo2 className="w-4 h-4" />
            撤销最近应用
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {applyResult && (
            <div className={cn(
              'mb-4 rounded-lg p-3 flex items-start gap-2 text-sm',
              applyResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
            )}>
              {applyResult.success ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <span>{applyResult.message}</span>
            </div>
          )}
          {undoResult && (
            <div className={cn(
              'mb-4 rounded-lg p-3 flex items-start gap-2 text-sm',
              undoResult.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-amber-50 border border-amber-200 text-amber-800'
            )}>
              {undoResult.success ? <Undo2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <span>{undoResult.message}</span>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-4">
              {handoverApplyHistory.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">最近应用记录</h4>
                  <div className="space-y-1.5">
                    {handoverApplyHistory.slice(0, 3).map(h => (
                      <div key={h.historyId} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-xs">
                        <div className="flex items-center gap-3">
                          <Badge variant={h.undone ? 'neutral' : 'success'}>
                            {h.undone ? '已撤销' : '已应用'}
                          </Badge>
                          <span className="font-medium text-gray-800">{h.packageName}</span>
                          <span className="text-gray-500">更新 {h.updatedCount} · 保护 {h.protectedCount} · 跳过 {h.skippedCount}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {h.appliedBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <FormatDate iso={h.appliedAt} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">交接包列表</h4>
              {handoverPackages.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">暂无交接包</p>
                  <p className="text-xs text-gray-400 mt-1">去「生成交接包」创建第一个交接包</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {handoverPackages.map(pkg => (
                    <PackageCard
                      key={pkg.packageId}
                      pkg={pkg}
                      expanded={expandedId === pkg.packageId}
                      onToggle={() => setExpandedId(expandedId === pkg.packageId ? null : pkg.packageId)}
                      onApply={(id) => setShowApplyConfirm(id)}
                      onDelete={(id) => deleteHandoverPackage(id)}
                      onExport={(id, format) => useAppStore.getState().exportHandoverPackage(id, format)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="space-y-4 max-w-2xl">
              {createResult && (
                <div className={cn(
                  'rounded-lg p-3 flex items-start gap-2 text-sm',
                  createResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
                )}>
                  {createResult.success ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <span>{createResult.message}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">交接包名称 *</label>
                <input
                  type="text"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="例：2025-01-15 白班异常复核"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">交接说明</label>
                <textarea
                  value={createDesc}
                  onChange={e => setCreateDesc(e.target.value)}
                  placeholder="简要说明交接重点，例：重点关注李XX、张XX的上门随访安排"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">数据来源</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={cn(
                      'flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-colors',
                      sourceMode === 'filter' ? 'border-blue-500 bg-blue-50/60' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <input
                      type="radio"
                      className="mt-0.5"
                      checked={sourceMode === 'filter'}
                      onChange={() => setSourceMode('filter')}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                        <Filter className="w-4 h-4 text-sky-600" />
                        当前筛选结果
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">包含当前异常看板筛选条件下的 {filteredCount} 条记录</p>
                    </div>
                  </label>
                  <label
                    className={cn(
                      'flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-colors',
                      sourceMode === 'selected' ? 'border-blue-500 bg-blue-50/60' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <input
                      type="radio"
                      className="mt-0.5"
                      checked={sourceMode === 'selected'}
                      onChange={() => setSourceMode('selected')}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-amber-600" />
                        勾选记录
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">包含手动勾选的 {selectedCount} 条记录</p>
                    </div>
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2 text-xs text-amber-800">
                  <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>交接包将自动包含规则版本、关联导入批次、筛选条件摘要，数据保存在本地浏览器中。</span>
                </div>
                <Button variant="primary" onClick={handleCreate} disabled={effectiveCount === 0}>
                  <Package className="w-4 h-4" />
                  生成交接包 ({effectiveCount})
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">上传 JSON 文件</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleFilePick(e.target.files[0])}
                  />
                  <Button variant="outline" className="w-full justify-center" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-1.5" />
                    选择 JSON 文件
                  </Button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">或粘贴 JSON 内容</label>
                  <div className="flex gap-2">
                    <textarea
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder='{"schemaVersion":"1.0.0","packageId":"..."}'
                      rows={3}
                      className="flex-1 px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <Button variant="primary" onClick={handleImportPaste}>
                      导入
                    </Button>
                  </div>
                </div>
              </div>

              {importResult && (
                <div className="space-y-3">
                  <div className={cn(
                    'rounded-lg p-3 flex items-start gap-2 text-sm',
                    importResult.valid ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
                  )}>
                    {importResult.valid ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    <div>
                      <p className="font-medium">{importResult.valid ? '导入成功' : '导入失败，存在校验错误'}</p>
                      {importResult.valid && importResult.parsedPackage && (
                        <p className="text-xs mt-0.5">
                          已导入「{importResult.parsedPackage.name}」，包含 {importResult.parsedPackage.anomalies.length} 条异常。
                          其中可应用 {importResult.applicableCount} 条 · 受保护 {importResult.protectedCount} 条 ·
                          本地不存在 {importResult.notFoundCount} 条 · 状态较旧 {importResult.olderStatusCount} 条。
                        </p>
                      )}
                    </div>
                  </div>

                  {importResult.issues.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-gray-100 text-xs font-medium text-gray-700 border-b border-gray-200">
                        详细校验结果 ({importResult.issues.length})
                      </div>
                      <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                        {importResult.issues.map((issue, i) => (
                          <li key={i} className="px-3 py-2 text-xs flex items-start gap-2">
                            {issue.severity === 'error'
                              ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                              : issue.severity === 'warning'
                                ? <Info className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                : <Info className="w-3.5 h-3.5 text-sky-500 mt-0.5 flex-shrink-0" />}
                            <div className="flex-1">
                              <p className={cn(
                                'font-medium',
                                issue.severity === 'error' ? 'text-red-700' : issue.severity === 'warning' ? 'text-amber-700' : 'text-sky-700'
                              )}>
                                [{issue.code}] {issue.message}
                              </p>
                              {issue.suggestion && (
                                <p className="text-gray-500 mt-0.5">{issue.suggestion}</p>
                              )}
                              {issue.field && (
                                <p className="text-gray-400 mt-0.5">字段: {issue.field}</p>
                              )}
                              {issue.anomalyId && (
                                <p className="text-gray-400 mt-0.5">anomalyId: {issue.anomalyId}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {showApplyConfirm && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center" onClick={() => setShowApplyConfirm(null)}>
            <div className="bg-white rounded-xl max-w-md w-full mx-4 p-5" onClick={e => e.stopPropagation()}>
              <h4 className="font-semibold text-gray-900 mb-2">确认应用此交接包？</h4>
              <p className="text-sm text-gray-600 mb-4">
                将按照交接包中的复核状态、责任护士和备注更新本地记录。
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-xs text-green-700 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>保护已启用</strong><br />
                  仅更新「待处理」和「需上门」的记录；已确认/忽略的人工复核结果不会被覆盖；本地较新的状态不会被旧状态覆盖。
                </span>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowApplyConfirm(null)}>取消</Button>
                <Button variant="primary" onClick={() => handleApply(showApplyConfirm)}>确认应用</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
