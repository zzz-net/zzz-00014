import { useState } from 'react'
import {
  FileText,
  Search,
  Download,
  Filter,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { Button } from './common/Button'
import { Card } from './common/Card'
import { Badge } from './common/Badge'
import {
  LogActionType,
  LogActionTypeLabels,
  OperationLog,
} from '@/types'
import { cn } from '@/lib/utils'

const ActionColor: Record<LogActionType, string> = {
  [LogActionType.IMPORT]: 'bg-blue-100 text-blue-700 border-blue-200',
  [LogActionType.RULE_CHANGE]: 'bg-purple-100 text-purple-700 border-purple-200',
  [LogActionType.BATCH_RECALCULATE]: 'bg-amber-100 text-amber-700 border-amber-200',
  [LogActionType.EXPORT]: 'bg-green-100 text-green-700 border-green-200',
  [LogActionType.REVIEW_STATUS_CHANGE]: 'bg-rose-100 text-rose-700 border-rose-200',
  [LogActionType.RESET]: 'bg-red-100 text-red-700 border-red-200',
  [LogActionType.PRE_CHECK]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  [LogActionType.PRE_CHECK_IMPORT_PASS]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [LogActionType.PRE_CHECK_IMPORT_WARN]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  [LogActionType.PRE_CHECK_CANCEL]: 'bg-gray-100 text-gray-700 border-gray-200',
  [LogActionType.PRE_CHECK_EXPORT]: 'bg-teal-100 text-teal-700 border-teal-200',
  [LogActionType.IMPORT_BATCH_CREATE]: 'bg-sky-100 text-sky-700 border-sky-200',
  [LogActionType.IMPORT_BATCH_REVERT]: 'bg-orange-100 text-orange-700 border-orange-200',
  [LogActionType.IMPORT_BATCH_EXPORT]: 'bg-lime-100 text-lime-700 border-lime-200',
  [LogActionType.SANDBOX_DRAFT_SAVE]: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  [LogActionType.SANDBOX_DRAFT_DELETE]: 'bg-rose-100 text-rose-700 border-rose-200',
  [LogActionType.SANDBOX_DRAFT_LOAD]: 'bg-blue-100 text-blue-700 border-blue-200',
  [LogActionType.SANDBOX_DRAFT_EXPORT]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [LogActionType.SANDBOX_DRAFT_IMPORT]: 'bg-violet-100 text-violet-700 border-violet-200',
  [LogActionType.SANDBOX_PREVIEW]: 'bg-sky-100 text-sky-700 border-sky-200',
  [LogActionType.SANDBOX_APPLY]: 'bg-green-100 text-green-700 border-green-200',
  [LogActionType.SANDBOX_UNDO]: 'bg-orange-100 text-orange-700 border-orange-200',
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN')
  } catch {
    return iso
  }
}

interface LogRowProps {
  log: OperationLog
}

function LogRow({ log }: LogRowProps) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-white rounded transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
        </td>
        <td className="px-4 py-3">
          <span className={cn('inline-flex items-center border font-medium rounded-full px-2 py-0.5 text-xs', ActionColor[log.actionType])}>
            {LogActionTypeLabels[log.actionType]}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <User className="w-3.5 h-3.5 text-gray-400" />
            {log.operator}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">{log.description}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {formatDate(log.timestamp)}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={5} className="px-8 py-4">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-500 mb-2">操作详情</p>
              <pre className="text-xs text-gray-600 bg-gray-50 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function OperationLogs() {
  const getFilteredLogs = useAppStore(s => s.getFilteredLogs)
  const logFilters = useAppStore(s => s.logFilters)
  const setLogFilters = useAppStore(s => s.setLogFilters)
  const resetLogFilters = useAppStore(s => s.resetLogFilters)
  const exportLogs = useAppStore(s => s.exportLogs)
  const operationLogs = useAppStore(s => s.operationLogs)
  const currentOperator = useAppStore(s => s.currentOperator)
  const setCurrentOperator = useAppStore(s => s.setCurrentOperator)

  const [showFilters, setShowFilters] = useState(false)
  const [operatorInput, setOperatorInput] = useState(currentOperator)

  const logs = getFilteredLogs()
  const uniqueOperators = Array.from(new Set(operationLogs.map(l => l.operator))).filter(Boolean)

  const toggleActionType = (type: LogActionType) => {
    const has = logFilters.actionTypes.includes(type)
    setLogFilters({
      actionTypes: has ? logFilters.actionTypes.filter(t => t !== type) : [...logFilters.actionTypes, type],
    })
  }

  const toggleOperator = (op: string) => {
    const has = logFilters.operators.includes(op)
    setLogFilters({
      operators: has ? logFilters.operators.filter(o => o !== op) : [...logFilters.operators, op],
    })
  }

  const hasFilters =
    logFilters.actionTypes.length > 0 ||
    logFilters.operators.length > 0 ||
    logFilters.startTime ||
    logFilters.endTime ||
    logFilters.searchText

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          <span>操作日志</span>
          <Badge variant="neutral">{logs.length} 条</Badge>
        </div>
      }
      subtitle="记录所有关键操作，支持筛选和导出"
      headerRight={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-2">
            <User className="w-3.5 h-3.5" />
            <input
              type="text"
              value={operatorInput}
              onChange={e => setOperatorInput(e.target.value)}
              onBlur={() => setCurrentOperator(operatorInput || '未登录用户')}
              placeholder="操作者姓名"
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-24"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">筛选</span>
            {hasFilters && (
              <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                {logFilters.actionTypes.length + logFilters.operators.length + (logFilters.startTime ? 1 : 0) + (logFilters.endTime ? 1 : 0) + (logFilters.searchText ? 1 : 0)}
              </span>
            )}
          </Button>
          <div className="relative group">
            <Button variant="primary" size="sm" disabled={logs.length === 0}>
              <Download className="w-4 h-4" />
              导出
            </Button>
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => exportLogs('csv')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                导出 CSV
              </button>
              <button
                onClick={() => exportLogs('json')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t border-gray-100"
              >
                导出 JSON
              </button>
            </div>
          </div>
        </div>
      }
    >
      {showFilters && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">筛选条件</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetLogFilters}>
                <RotateCcw className="w-3.5 h-3.5" />
                重置
              </Button>
              <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-gray-200 rounded">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">关键字搜索</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={logFilters.searchText}
                onChange={e => setLogFilters({ searchText: e.target.value })}
                placeholder="搜索操作描述、操作者或详情..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">操作类型</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(LogActionTypeLabels).map(([value, label]) => {
                  const selected = logFilters.actionTypes.includes(value as LogActionType)
                  return (
                    <button
                      key={value}
                      onClick={() => toggleActionType(value as LogActionType)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full border transition-colors',
                        selected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">操作者</label>
              <div className="flex flex-wrap gap-1.5">
                {uniqueOperators.length === 0 ? (
                  <span className="text-xs text-gray-400">暂无操作者记录</span>
                ) : (
                  uniqueOperators.map(op => {
                    const selected = logFilters.operators.includes(op)
                    return (
                      <button
                        key={op}
                        onClick={() => toggleOperator(op)}
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-full border transition-colors',
                          selected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        )}
                      >
                        {op}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">开始时间</label>
              <input
                type="date"
                value={logFilters.startTime}
                onChange={e => setLogFilters({ startTime: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">结束时间</label>
              <input
                type="date"
                value={logFilters.endTime}
                onChange={e => setLogFilters({ endTime: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">暂无操作日志</p>
          <p className="text-sm text-gray-400 mt-1">
            {hasFilters ? '试试调整筛选条件' : '导入数据、修改规则或复核异常后会自动记录'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left w-10"></th>
                <th className="px-4 py-3 text-left w-28">类型</th>
                <th className="px-4 py-3 text-left w-32">操作者</th>
                <th className="px-4 py-3 text-left">描述</th>
                <th className="px-4 py-3 text-left w-40">时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <LogRow key={log.logId} log={log} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
