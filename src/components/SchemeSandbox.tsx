import { useState, useRef } from 'react'
import {
  Beaker,
  Save,
  FolderOpen,
  Trash2,
  Download,
  Upload,
  Eye,
  Play,
  Undo2,
  X,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Plus,
  ChevronDown,
  ChevronUp,
  FileJson,
  Clock,
  User,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { Button } from './common/Button'
import { Card } from './common/Card'
import { Badge } from './common/Badge'
import {
  QualityControlRules,
  PreCheckConfig,
  SchemeDraft,
  ImportValidationIssue,
  AnomalyType,
  AnomalyTypeLabels,
  ReviewStatus,
  RuleDiffPreview,
} from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  draftRules: QualityControlRules
  draftPreCheck: PreCheckConfig
  onLoadDraft: (rules: QualityControlRules, preCheck: PreCheckConfig) => void
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN')
  } catch {
    return iso
  }
}

function DraftRow({
  draft,
  onLoad,
  onExport,
  onDelete,
  onPreview,
  onApply,
}: {
  draft: SchemeDraft
  onLoad: () => void
  onExport: () => void
  onDelete: () => void
  onPreview: () => void
  onApply: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-3 py-2.5">
          <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-white rounded">
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
        </td>
        <td className="px-3 py-2.5">
          <div className="font-medium text-sm text-gray-800">{draft.name || '（未命名草稿）'}</div>
          {draft.description && <div className="text-xs text-gray-500 mt-0.5">{draft.description}</div>}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <User className="w-3 h-3 text-gray-400" />
            {draft.createdBy}
          </div>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Clock className="w-3 h-3 text-gray-400" />
            {formatDate(draft.updatedAt)}
          </div>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            <Badge variant="info" className="text-[10px]">
              血压 {draft.qcRules.bloodPressureSystolicMin}-{draft.qcRules.bloodPressureSystolicMax}
            </Badge>
            <Badge variant="warning" className="text-[10px]">
              血糖 {draft.qcRules.bloodGlucoseMin}-{draft.qcRules.bloodGlucoseMax}
            </Badge>
            {draft.qcRules.homeVisitStatusMappings.length > 0 && (
              <Badge variant="default" className="text-[10px]">
                上门映射 {draft.qcRules.homeVisitStatusMappings.length}项
              </Badge>
            )}
          </div>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onLoad} title="加载到编辑器">
              <FolderOpen className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onPreview} title="预跑看差异">
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button variant="primary" size="sm" onClick={onApply} title="应用方案">
              <Play className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onExport} title="导出 JSON">
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} title="删除草稿" className="text-red-600 hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-6 py-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-gray-500">逾期未访阈值：</span>
                <span className="font-medium text-gray-700">{draft.qcRules.overdueVisitDaysThreshold} 天</span>
              </div>
              <div>
                <span className="text-gray-500">未预约匹配窗口：</span>
                <span className="font-medium text-gray-700">{draft.qcRules.unplannedVisitWindowDays} 天</span>
              </div>
              <div>
                <span className="text-gray-500">舒张压范围：</span>
                <span className="font-medium text-gray-700">{draft.qcRules.bloodPressureDiastolicMin}-{draft.qcRules.bloodPressureDiastolicMax} mmHg</span>
              </div>
              <div>
                <span className="text-gray-500">预检最多展示：</span>
                <span className="font-medium text-gray-700">{draft.preCheckConfig.maxDisplayIssues} 条</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">上门状态映射：</span>
                <span className="font-medium text-gray-700">
                  {draft.qcRules.homeVisitStatusMappings.length > 0
                    ? draft.qcRules.homeVisitStatusMappings.map(t => AnomalyTypeLabels[t as AnomalyType]).join('、')
                    : '无'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">规则启用：</span>
                <span className={cn('font-medium', draft.qcRules.enabled ? 'text-green-600' : 'text-red-600')}>
                  {draft.qcRules.enabled ? '已启用' : '已停用'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">警告继续导入：</span>
                <span className={cn('font-medium', draft.preCheckConfig.allowWarningContinue ? 'text-green-600' : 'text-red-600')}>
                  {draft.preCheckConfig.allowWarningContinue ? '允许' : '拦截'}
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function SchemeSandbox({ draftRules, draftPreCheck, onLoadDraft }: Props) {
  const schemeDrafts = useAppStore(s => s.schemeDrafts)
  const sandboxApplyHistory = useAppStore(s => s.sandboxApplyHistory)
  const saveSchemeDraft = useAppStore(s => s.saveSchemeDraft)
  const deleteSchemeDraft = useAppStore(s => s.deleteSchemeDraft)
  const loadSchemeDraft = useAppStore(s => s.loadSchemeDraft)
  const exportSchemeDraft = useAppStore(s => s.exportSchemeDraft)
  const importSchemeDraft = useAppStore(s => s.importSchemeDraft)
  const previewSchemeDraft = useAppStore(s => s.previewSchemeDraft)
  const applySchemeDraft = useAppStore(s => s.applySchemeDraft)
  const undoLastSandboxApply = useAppStore(s => s.undoLastSandboxApply)

  const [draftName, setDraftName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewResult, setPreviewResult] = useState<RuleDiffPreview | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importResult, setImportResult] = useState<ReturnType<typeof importSchemeDraft> | null>(null)
  const [showApplyConfirm, setShowApplyConfirm] = useState<string | null>(null)
  const [showUndoConfirm, setShowUndoConfirm] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSaveDraft = () => {
    if (!draftName.trim()) {
      showToast('warning', '请填写草稿名称')
      return
    }
    const draft = saveSchemeDraft(draftName.trim(), draftDescription.trim(), draftRules, draftPreCheck)
    showToast('success', `已保存方案草稿「${draft.name}」`)
    setDraftName('')
    setDraftDescription('')
    setShowSaveDialog(false)
  }

  const handleLoad = (draftId: string) => {
    const loaded = loadSchemeDraft(draftId)
    if (loaded) {
      onLoadDraft(loaded.qcRules, loaded.preCheckConfig)
      const draft = schemeDrafts.find(d => d.draftId === draftId)
      showToast('success', `已加载草稿「${draft?.name || draftId}」到编辑器`)
    }
  }

  const handleDelete = (draftId: string) => {
    const draft = schemeDrafts.find(d => d.draftId === draftId)
    if (!draft) return
    if (window.confirm(`确认删除草稿「${draft.name}」？此操作不可恢复。`)) {
      deleteSchemeDraft(draftId)
      showToast('success', `已删除草稿「${draft.name}」`)
    }
  }

  const handlePreview = (draftId: string) => {
    const result = previewSchemeDraft(draftId)
    if (result) {
      setPreviewResult(result)
      setShowPreview(true)
    }
  }

  const handleApply = (draftId: string) => {
    setShowApplyConfirm(draftId)
    const result = previewSchemeDraft(draftId)
    if (result) setPreviewResult(result)
  }

  const confirmApply = () => {
    if (!showApplyConfirm) return
    const result = applySchemeDraft(showApplyConfirm)
    if (result.success) {
      showToast('success', result.message)
    } else {
      showToast('error', result.message)
    }
    setShowApplyConfirm(null)
    setShowPreview(false)
    setPreviewResult(null)
  }

  const handleUndo = () => {
    setShowUndoConfirm(true)
  }

  const confirmUndo = () => {
    const result = undoLastSandboxApply()
    if (result.success) {
      showToast('success', result.message)
    } else {
      showToast('error', result.message)
    }
    setShowUndoConfirm(false)
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      const result = importSchemeDraft(text)
      setImportResult(result)
      if (result.valid && result.canImport) {
        showToast('success', `成功导入草稿，共 ${result.warningCount} 条提示`)
        setShowImportDialog(false)
        setImportResult(null)
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const lastApply = sandboxApplyHistory.find(h => !h.undone)

  const IssueBadge = ({ issue }: { issue: ImportValidationIssue }) => (
    <div className={cn(
      'rounded-lg border p-2.5 text-xs',
      issue.severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
    )}>
      <div className="flex items-start gap-2">
        {issue.severity === 'error'
          ? <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          : <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <div className={cn('font-medium', issue.severity === 'error' ? 'text-red-700' : 'text-amber-700')}>
            [{issue.code}] {issue.message}
          </div>
          {issue.field && <div className="text-gray-500 mt-0.5">字段: {issue.field}</div>}
          <div className={cn('mt-1', issue.severity === 'error' ? 'text-red-600' : 'text-amber-600')}>
            💡 {issue.suggestion}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {toast && (
        <div className={cn(
          'fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 max-w-md animate-in slide-in-from-right',
          toast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200'
            : toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200'
            : 'bg-amber-50 text-amber-800 border-amber-200'
        )}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <Card
        title={
          <div className="flex items-center gap-2">
            <Beaker className="w-5 h-5 text-cyan-600" />
            <span>方案沙盒</span>
            <Badge variant="info" className="ml-1">
              {schemeDrafts.length} 个草稿
            </Badge>
          </div>
        }
        subtitle="护士长可保存规则方案为草稿，预跑看效果再决定是否应用；草稿跨刷新保留，支持 JSON 导入导出"
        headerRight={
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            {lastApply && (
              <Button variant="outline" size="sm" onClick={handleUndo} className="text-orange-600 border-orange-300 hover:bg-orange-50">
                <Undo2 className="w-4 h-4" />
                撤销上次应用
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { setImportResult(null); setShowImportDialog(true) }}>
              <Upload className="w-4 h-4" />
              导入 JSON
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowSaveDialog(true)}>
              <Plus className="w-4 h-4" />
              另存为草稿
            </Button>
          </div>
        }
      >
        {schemeDrafts.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 mx-auto bg-cyan-50 rounded-full flex items-center justify-center mb-3">
              <Beaker className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-gray-600 font-medium">暂无方案草稿</p>
            <p className="text-sm text-gray-400 mt-1">
              调整上方质控规则后点击"另存为草稿"，即可保存方案、预跑效果、再决定是否应用
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left w-10"></th>
                  <th className="px-3 py-2 text-left">名称/描述</th>
                  <th className="px-3 py-2 text-left w-28">创建人</th>
                  <th className="px-3 py-2 text-left w-40">更新时间</th>
                  <th className="px-3 py-2 text-left w-72">规则摘要</th>
                  <th className="px-3 py-2 text-left w-56">操作</th>
                </tr>
              </thead>
              <tbody>
                {schemeDrafts.map(draft => (
                  <DraftRow
                    key={draft.draftId}
                    draft={draft}
                    onLoad={() => handleLoad(draft.draftId)}
                    onExport={() => { exportSchemeDraft(draft.draftId) }}
                    onDelete={() => handleDelete(draft.draftId)}
                    onPreview={() => handlePreview(draft.draftId)}
                    onApply={() => handleApply(draft.draftId)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {lastApply && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2.5">
            <ShieldCheck className="w-4.5 h-4.5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800 flex-1">
              <div className="font-medium">最近一次沙盒应用</div>
              <div className="mt-1">
                方案「{lastApply.draftName}」由 {lastApply.appliedBy} 于 {formatDate(lastApply.appliedAt)} 应用，
                新增 {lastApply.diffSummary.addedCount}、移除 {lastApply.diffSummary.removedCount}、
                变更 {lastApply.diffSummary.changedCount} 条异常，
                保护 {lastApply.diffSummary.protectedCount} 条人工复核记录。
                可点击右上角"撤销上次应用"恢复。
              </div>
            </div>
          </div>
        )}
      </Card>

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSaveDialog(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Save className="w-5 h-5 text-cyan-600" />
                另存为方案草稿
              </h3>
              <button onClick={() => setShowSaveDialog(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">草稿名称 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  placeholder="如：2026年Q3夏季质控方案"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">描述（可选）</label>
                <textarea
                  value={draftDescription}
                  onChange={e => setDraftDescription(e.target.value)}
                  placeholder="说明此方案的用途、调整原因等"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                />
              </div>
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-cyan-800">
                  <p className="font-medium">草稿不会影响线上规则</p>
                  <p className="mt-0.5">保存后可随时加载、预跑差异，确认无误再应用。草稿支持 JSON 导入导出，方便跨环境迁移。</p>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 rounded-b-2xl">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>取消</Button>
              <Button variant="primary" onClick={handleSaveDraft}>
                <Save className="w-4 h-4" />
                保存草稿
              </Button>
            </div>
          </div>
        </div>
      )}

      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowImportDialog(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileJson className="w-5 h-5 text-violet-600" />
                导入方案草稿（JSON）
              </h3>
              <button onClick={() => setShowImportDialog(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {!importResult && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 mx-auto bg-violet-50 rounded-full flex items-center justify-center mb-3">
                    <Upload className="w-8 h-8 text-violet-400" />
                  </div>
                  <p className="text-gray-700 font-medium mb-2">选择 JSON 文件导入</p>
                  <p className="text-xs text-gray-500 mb-4">
                    导入时将校验版本号、字段完整性、重复名称，并检测规则过宽/过严的冲突
                  </p>
                  <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4" />
                    选择 JSON 文件
                  </Button>
                </div>
              )}

              {importResult && !importResult.valid && (
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-red-800">
                      <span className="font-medium">导入失败：存在 {importResult.errorCount} 个错误</span>
                      <span className="block mt-0.5">请修复以下问题后重新导入，或使用系统导出的标准格式文件。</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {importResult.issues.filter(i => i.severity === 'error').map((issue, idx) => (
                      <IssueBadge key={idx} issue={issue} />
                    ))}
                  </div>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                    <Upload className="w-4 h-4" />
                    重新选择文件
                  </Button>
                </div>
              )}

              {importResult && importResult.valid && importResult.warningCount > 0 && (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-green-800">
                      <span className="font-medium">导入成功，但有 {importResult.warningCount} 条提示</span>
                      <span className="block mt-0.5">草稿已保存到列表，请核对以下提示是否需要调整。</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {importResult.issues.filter(i => i.severity === 'warning').map((issue, idx) => (
                      <IssueBadge key={idx} issue={issue} />
                    ))}
                  </div>
                </div>
              )}

              {importResult && importResult.valid && importResult.warningCount === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle className="w-4.5 h-4.5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-green-800">
                    <span className="font-medium">导入成功</span>
                    <span className="block mt-0.5">草稿已保存，无冲突、无警告。</span>
                  </div>
                </div>
              )}
            </div>
            {importResult && importResult.valid && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-2xl">
                <Button variant="primary" onClick={() => { setShowImportDialog(false); setImportResult(null) }}>
                  完成
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {(showPreview || showApplyConfirm) && previewResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowPreview(false); setShowApplyConfirm(null) }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-sky-600" />
                {showApplyConfirm ? '确认应用方案 — 差异预览' : '方案预跑差异预览'}
              </h3>
              <button onClick={() => { setShowPreview(false); setShowApplyConfirm(null) }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
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

              {previewResult.changed.length > 0 && (
                <div className="bg-violet-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-violet-600">{previewResult.changed.length}</p>
                  <p className="text-xs text-violet-600 mt-1">状态变化异常（如上门映射调整导致"需上门"↔"待处理"）</p>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-700">
                  <p className="font-medium">
                    变更将影响 <strong>{previewResult.added.length + previewResult.removed.length + previewResult.changed.length}</strong> 条待处理记录
                  </p>
                  <p className="mt-0.5 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 inline text-green-600" />
                    已确认/忽略的 {previewResult.protectedCount} 条记录受保护，不会被静默覆盖
                  </p>
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

              {previewResult.changed.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-800 mb-2">状态变化异常（{previewResult.changed.length}条）</h4>
                  <div className="bg-gray-50 rounded-lg max-h-32 overflow-y-auto divide-y divide-gray-200">
                    {previewResult.changed.slice(0, 5).map(a => (
                      <div key={a.anomalyId} className="px-3 py-2 text-xs text-gray-600 flex items-center gap-2 flex-wrap">
                        <Badge variant="info" className="mr-1">{AnomalyTypeLabels[a.type]}</Badge>
                        <span className="font-medium">{a.residentName || a.residentId}</span>
                        <span>
                          → 新状态：
                          <span className={cn(
                            'ml-1 px-1.5 py-0.5 rounded text-[11px]',
                            a.status === ReviewStatus.NEED_HOME_VISIT ? 'bg-blue-100 text-blue-700'
                              : a.status === ReviewStatus.CONFIRMED ? 'bg-green-100 text-green-700'
                              : a.status === ReviewStatus.IGNORED ? 'bg-gray-200 text-gray-700'
                              : 'bg-amber-100 text-amber-700'
                          )}>
                            {a.status === ReviewStatus.NEED_HOME_VISIT ? '需上门'
                              : a.status === ReviewStatus.CONFIRMED ? '已确认'
                              : a.status === ReviewStatus.IGNORED ? '忽略'
                              : '待处理'}
                          </span>
                        </span>
                      </div>
                    ))}
                    {previewResult.changed.length > 5 && (
                      <div className="px-3 py-2 text-xs text-gray-400">...还有 {previewResult.changed.length - 5} 条</div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-green-800">
                  <p className="font-medium">受保护异常明细</p>
                  <p className="mt-0.5">
                    {previewResult.protectedCount > 0
                      ? `共 ${previewResult.protectedCount} 条状态为"已确认"或"忽略"的人工复核记录，应用此方案时它们的状态、备注、处理人将原封不动保留。`
                      : '当前没有已人工复核的记录，所有异常将按新规则重新计算。'}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 rounded-b-2xl">
              <Button variant="outline" onClick={() => { setShowPreview(false); setShowApplyConfirm(null) }}>
                取消
              </Button>
              {showApplyConfirm ? (
                <Button variant="primary" onClick={confirmApply}>
                  <CheckCircle className="w-4 h-4" />
                  确认应用方案
                </Button>
              ) : (
                <Button variant="outline" onClick={() => { setShowPreview(false) }}>
                  关闭
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {showUndoConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUndoConfirm(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Undo2 className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">确认撤销最近一次沙盒应用？</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {lastApply
                      ? `将恢复到应用「${lastApply.draftName}」之前的规则版本，已人工确认或忽略的复核结果不会被覆盖。`
                      : '没有可撤销的应用记录。'}
                  </p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-green-800">
                  <p className="font-medium">人工复核结果受保护</p>
                  <p className="mt-0.5">状态为"已确认"或"忽略"的异常记录将完整保留，不会被撤销操作静默覆盖。</p>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 rounded-b-2xl">
              <Button variant="outline" onClick={() => setShowUndoConfirm(false)}>取消</Button>
              <Button variant="primary" onClick={confirmUndo} className="text-white bg-orange-600 hover:bg-orange-700">
                <Undo2 className="w-4 h-4" />
                确认撤销
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
