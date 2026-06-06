import { useState, useRef } from 'react'
import {
  X,
  ClipboardList,
  Download,
  Upload,
  Undo2,
  Trash2,
  FileJson,
  FileSpreadsheet,
  Filter,
  CheckSquare,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  AlertCircle,
  Plus,
  XCircle,
  Clock,
  FileText,
  Shield,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import {
  ShiftTodoList,
  ShiftTodoImportValidationResult,
  ShiftTodoUndoResult,
  UserRole,
  AnomalyTypeLabels,
  AnomalySeverityLabels,
  ReviewStatus,
  ReviewStatusLabels,
} from '@/types'
import { cn } from '@/lib/utils'

interface ShiftTodoPanelProps {
  open: boolean
  onClose: () => void
}

function FormatDate({ iso }: { iso: string }) {
  try {
    return new Date(iso).toLocaleString('zh-CN')
  } catch {
    return iso
  }
}

function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const color = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-emerald-100 text-emerald-700',
  }[severity]
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[11px] font-medium', color)}>
      {AnomalySeverityLabels[severity]}
    </span>
  )
}

const StatusLabelColor: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING]: 'bg-amber-100 text-amber-700',
  [ReviewStatus.CONFIRMED]: 'bg-emerald-100 text-emerald-700',
  [ReviewStatus.IGNORED]: 'bg-gray-100 text-gray-600',
  [ReviewStatus.NEED_HOME_VISIT]: 'bg-blue-100 text-blue-700',
}

function ListCard({
  list,
  expanded,
  onToggle,
  onDelete,
  onRemoveItem,
  onToggleComplete,
}: {
  list: ShiftTodoList
  expanded: boolean
  onToggle: () => void
  onDelete: (id: string) => void
  onRemoveItem: (listId: string, itemId: string) => void
  onToggleComplete: (listId: string, itemId: string) => void
  onExport: (listId: string, format: 'json' | 'csv') => void
}) {
  const currentRole = useAppStore(s => s.currentRole)
  const exportShiftTodoList = useAppStore(s => s.exportShiftTodoList)
  const isHeadNurse = currentRole === UserRole.HEAD_NURSE

  const completedCount = list.items.filter(i => i.completed).length
  const totalCount = list.items.length

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900 truncate">{list.name}</h4>
            <Badge variant="neutral" className="text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {completedCount}/{totalCount} 完成
            </Badge>
          </div>
          {list.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{list.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {list.createdBy}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <FormatDate iso={list.createdAt} />
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
                onClick={() => exportShiftTodoList(list.listId, 'json')}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1.5"
              >
                <FileJson className="w-3.5 h-3.5" />
                导出 JSON
              </button>
              <button
                onClick={() => exportShiftTodoList(list.listId, 'csv')}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 border-t border-gray-100"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                导出 CSV
              </button>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {isHeadNurse && (
            <button
              onClick={() => onDelete(list.listId)}
              className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
              title="删除清单"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          {list.items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
              暂无待办项
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-100">
                  <tr className="text-gray-500">
                    <th className="px-2 py-2 text-left font-medium w-8"></th>
                    <th className="px-2 py-2 text-left font-medium">居民</th>
                    <th className="px-2 py-2 text-left font-medium">异常</th>
                    <th className="px-2 py-2 text-left font-medium">状态</th>
                    <th className="px-2 py-2 text-left font-medium">责任护士</th>
                    <th className="px-2 py-2 text-left font-medium">截止时间</th>
                    <th className="px-2 py-2 text-left font-medium">处理说明</th>
                    <th className="px-2 py-2 text-left font-medium w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.items.map(item => (
                    <tr key={item.itemId} className={cn('hover:bg-white', item.completed && 'opacity-60')}>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => onToggleComplete(list.listId, item.itemId)}
                          className={cn(
                            'p-0.5 rounded transition-colors',
                            item.completed ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
                          )}
                        >
                          {item.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        <span className="font-medium text-gray-800">{item.residentName || '-'}</span>
                        <span className="text-gray-400 ml-1 text-[11px]">{item.residentId}</span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <SeverityBadge severity={item.anomalySeverity} />
                          <span className="text-gray-700 max-w-[160px] truncate" title={item.anomalyDescription}>
                            {AnomalyTypeLabels[item.anomalyType]}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', StatusLabelColor[item.anomalyStatus])}>
                          {ReviewStatusLabels[item.anomalyStatus]}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-gray-700">{item.responsibleNurse || '-'}</td>
                      <td className="px-2 py-2 text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.deadline || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-gray-500 max-w-[200px] truncate" title={item.handlingNote}>
                        {item.handlingNote || '-'}
                      </td>
                      <td className="px-2 py-2">
                        {isHeadNurse && (
                          <button
                            onClick={() => onRemoveItem(list.listId, item.itemId)}
                            className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                            title="移出"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ShiftTodoPanel({ open, onClose }: ShiftTodoPanelProps) {
  const currentRole = useAppStore(s => s.currentRole)
  const currentOperator = useAppStore(s => s.currentOperator)
  const shiftTodoLists = useAppStore(s => s.shiftTodoLists)
  const shiftTodoUndoHistory = useAppStore(s => s.shiftTodoUndoHistory)
  const selectedAnomalyIds = useAppStore(s => s.selectedAnomalyIds)
  const getFilteredAnomalies = useAppStore(s => s.getFilteredAnomalies)
  const createShiftTodoList = useAppStore(s => s.createShiftTodoList)
  const deleteShiftTodoList = useAppStore(s => s.deleteShiftTodoList)
  const batchAddAnomaliesToShiftTodo = useAppStore(s => s.batchAddAnomaliesToShiftTodo)
  const removeShiftTodoItem = useAppStore(s => s.removeShiftTodoItem)
  const toggleShiftTodoItemComplete = useAppStore(s => s.toggleShiftTodoItemComplete)
  const importShiftTodoList = useAppStore(s => s.importShiftTodoList)
  const undoLastShiftTodoBatchAction = useAppStore(s => s.undoLastShiftTodoBatchAction)

  const isHeadNurse = currentRole === UserRole.HEAD_NURSE

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'add' | 'import'>('list')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null)

  const [addListId, setAddListId] = useState('')
  const [addSourceMode, setAddSourceMode] = useState<'filter' | 'selected'>('filter')
  const [addResponsible, setAddResponsible] = useState(currentOperator)
  const [addDeadline, setAddDeadline] = useState('')
  const [addNote, setAddNote] = useState('')
  const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null)

  const [importText, setImportText] = useState('')
  const [importResult, setImportResult] = useState<ShiftTodoImportValidationResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [undoResult, setUndoResult] = useState<ShiftTodoUndoResult | null>(null)

  const filteredCount = getFilteredAnomalies().length
  const selectedCount = selectedAnomalyIds.length
  const addEffectiveCount = addSourceMode === 'filter' ? filteredCount : selectedCount

  const lastNonUndone = shiftTodoUndoHistory.find(h => !h.undone)

  if (!open) return null

  const handleCreate = () => {
    if (!createName.trim()) {
      setCreateResult({ success: false, message: '请输入清单名称' })
      return
    }
    const result = createShiftTodoList(createName, createDesc)
    if (result) {
      setCreateResult({ success: true, message: `成功创建清单「${result.name}」` })
      setCreateName('')
      setCreateDesc('')
      setActiveTab('list')
    } else {
      setCreateResult({ success: false, message: '创建失败，请检查权限或名称是否为空' })
    }
  }

  const handleAdd = () => {
    if (!addListId) {
      setAddResult({ success: false, message: '请选择目标清单' })
      return
    }
    if (!addResponsible.trim()) {
      setAddResult({ success: false, message: '请输入责任护士' })
      return
    }
    const result = batchAddAnomaliesToShiftTodo({
      listId: addListId,
      sourceMode: addSourceMode,
      responsibleNurse: addResponsible.trim(),
      deadline: addDeadline,
      handlingNote: addNote.trim(),
    })
    setAddResult(result)
    if (result.success) {
      setAddNote('')
    }
  }

  const handleImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setImportText(text)
      const result = importShiftTodoList(text)
      setImportResult(result)
    }
    reader.readAsText(file)
  }

  const handleUndo = () => {
    const result = undoLastShiftTodoBatchAction()
    setUndoResult(result)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">班次待办清单</h2>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                  isHeadNurse ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600')}>
                  <Shield className="w-3 h-3" />
                  {isHeadNurse ? '护士长模式' : '护士模式'}
                </span>
                {isHeadNurse ? '可创建、导入、删除清单' : '可查看、标记完成'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-2 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('list')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'list' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              清单列表
            </button>
            {isHeadNurse && (
              <>
                <button
                  onClick={() => setActiveTab('create')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    activeTab === 'create' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1" />
                  新建清单
                </button>
                <button
                  onClick={() => setActiveTab('add')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    activeTab === 'add' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <CheckSquare className="w-3.5 h-3.5 inline mr-1" />
                  批量加入
                </button>
                <button
                  onClick={() => setActiveTab('import')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    activeTab === 'import' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1" />
                  导入 JSON
                </button>
              </>
            )}
          </div>
          {isHeadNurse && (
            <Button variant="ghost" size="sm" onClick={handleUndo} disabled={!lastNonUndone}>
              <Undo2 className="w-4 h-4 mr-1" />
              撤销
              {lastNonUndone && (
                <span className="ml-1 text-[10px] text-gray-500">
                  {lastNonUndone.actionType === 'BATCH_ADD' ? '批量加入' : '导入'}
                </span>
              )}
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'list' && (
            <div className="space-y-3">
              {undoResult && (
                <div className={cn(
                  'mb-3 p-3 rounded-lg text-sm border flex items-start gap-2',
                  undoResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                )}>
                  {undoResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <span>{undoResult.message}</span>
                </div>
              )}
              {shiftTodoLists.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">暂无班次待办清单</p>
                  {isHeadNurse && <p className="text-xs mt-1">点击「新建清单」创建第一个</p>}
                </div>
              ) : (
                shiftTodoLists.map(list => (
                  <ListCard
                    key={list.listId}
                    list={list}
                    expanded={expandedId === list.listId}
                    onToggle={() => setExpandedId(expandedId === list.listId ? null : list.listId)}
                    onDelete={(id) => {
                      if (confirm(`确定删除清单「${list.name}」吗？`)) {
                        deleteShiftTodoList(id)
                      }
                    }}
                    onRemoveItem={removeShiftTodoItem}
                    onToggleComplete={toggleShiftTodoItemComplete}
                    onExport={() => {}}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'create' && isHeadNurse && (
            <div className="max-w-lg mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">清单名称 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="如：今日交班、夜班跟进、明日复核"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述说明</label>
                <textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="可选，简单描述清单用途"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
              {createResult && (
                <div className={cn(
                  'p-3 rounded-lg text-sm border flex items-start gap-2',
                  createResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                )}>
                  {createResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <span>{createResult.message}</span>
                </div>
              )}
              <Button variant="primary" onClick={handleCreate} className="w-full">
                <Plus className="w-4 h-4 mr-1" />
                创建清单
              </Button>
            </div>
          )}

          {activeTab === 'add' && isHeadNurse && (
            <div className="max-w-lg mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目标清单 <span className="text-red-500">*</span></label>
                {shiftTodoLists.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">请先创建清单</p>
                ) : (
                  <select
                    value={addListId}
                    onChange={(e) => setAddListId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">请选择清单...</option>
                    {shiftTodoLists.map(l => (
                      <option key={l.listId} value={l.listId}>{l.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">来源</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 flex-1">
                    <input
                      type="radio"
                      checked={addSourceMode === 'filter'}
                      onChange={() => setAddSourceMode('filter')}
                      className="text-indigo-600"
                    />
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">当前筛选结果（{filteredCount}条）</span>
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 flex-1">
                    <input
                      type="radio"
                      checked={addSourceMode === 'selected'}
                      onChange={() => setAddSourceMode('selected')}
                      className="text-indigo-600"
                    />
                    <CheckSquare className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">已勾选（{selectedCount}条）</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">责任护士 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={addResponsible}
                  onChange={(e) => setAddResponsible(e.target.value)}
                  placeholder="如：张护士"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">截止时间</label>
                <input
                  type="datetime-local"
                  value={addDeadline}
                  onChange={(e) => setAddDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">处理说明</label>
                <textarea
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  placeholder="可选，说明处理要求或注意事项"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
              {addResult && (
                <div className={cn(
                  'p-3 rounded-lg text-sm border flex items-start gap-2',
                  addResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                )}>
                  {addResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <span>{addResult.message}</span>
                </div>
              )}
              <Button variant="primary" onClick={handleAdd} disabled={shiftTodoLists.length === 0 || addEffectiveCount === 0} className="w-full">
                <CheckSquare className="w-4 h-4 mr-1" />
                加入 {addEffectiveCount} 条待办
              </Button>
            </div>
          )}

          {activeTab === 'import' && isHeadNurse && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选择 JSON 文件</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">点击选择 JSON 文件或拖放至此</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImportFile(file)
                    }}
                  />
                </div>
              </div>
              {importText && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileText className="w-3.5 h-3.5 inline mr-1" />
                    文件内容预览
                  </label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={8}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono bg-gray-50 resize-none"
                  />
                  <div className="mt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const result = importShiftTodoList(importText)
                        setImportResult(result)
                      }}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      解析并导入
                    </Button>
                  </div>
                </div>
              )}
              {importResult && (
                <div className={cn(
                  'p-4 rounded-xl border',
                  importResult.valid && importResult.canImport
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                )}>
                  <div className="flex items-start gap-2 mb-2">
                    {importResult.valid && importResult.canImport ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={cn('font-medium text-sm', importResult.valid && importResult.canImport ? 'text-emerald-800' : 'text-amber-800')}>
                        {importResult.valid && importResult.canImport ? '导入成功' : importResult.valid ? '存在警告，请检查后重试' : '导入失败'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        错误 {importResult.errorCount} 项 · 警告 {importResult.warningCount} 项
                      </p>
                    </div>
                  </div>
                  {importResult.issues.length > 0 && (
                    <ul className="space-y-1 pl-7">
                      {importResult.issues.slice(0, 20).map((issue, i) => (
                        <li key={i} className="text-xs flex items-start gap-1.5">
                          <span className={cn(
                            'mt-0.5 font-mono px-1 py-0.5 rounded text-[10px]',
                            issue.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          )}>
                            {issue.code}
                          </span>
                          <span className={issue.severity === 'error' ? 'text-red-700' : 'text-amber-700'}>
                            {issue.message}
                            {issue.suggestion && <span className="text-gray-500 ml-1">（{issue.suggestion}）</span>}
                          </span>
                        </li>
                      ))}
                      {importResult.issues.length > 20 && (
                        <li className="text-xs text-gray-400">... 还有 {importResult.issues.length - 20} 条</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
