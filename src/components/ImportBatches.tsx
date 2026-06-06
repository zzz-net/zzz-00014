import { useState } from 'react'
import {
  Layers,
  Download,
  Undo2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { Button } from './common/Button'
import { Card } from './common/Card'
import { Badge } from './common/Badge'
import {
  DataTypeLabels,
  ImportBatch,
  PreCheckIssueCodeLabels,
  RevertBatchResult,
} from '@/types'
import { cn } from '@/lib/utils'

const DataTypeColor: Record<string, string> = {
  residents: 'bg-blue-100 text-blue-700 border-blue-200',
  appointments: 'bg-violet-100 text-violet-700 border-violet-200',
  followups: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const ModeLabels: Record<string, string> = {
  direct: '直接导入',
  all: '全部数据',
  validOnly: '仅有效数据',
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN')
  } catch {
    return iso
  }
}

interface BatchRowProps {
  batch: ImportBatch
  isLatest: boolean
}

function BatchRow({ batch, isLatest }: BatchRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [revertResult, setRevertResult] = useState<RevertBatchResult | null>(null)
  const revertBatch = useAppStore(s => s.revertBatch)

  const handleRevert = () => {
    const result = revertBatch(batch.batchId)
    setRevertResult(result)
    if (result.success) {
      setShowConfirm(false)
    }
  }

  return (
    <>
      <tr className={cn(
        'border-b border-gray-100 hover:bg-gray-50 transition-colors',
        batch.reverted && 'bg-gray-50/50 opacity-70'
      )}>
        <td className="px-4 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-white rounded transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
        </td>
        <td className="px-4 py-3">
          <span className={cn('inline-flex items-center border font-medium rounded-full px-2 py-0.5 text-xs', DataTypeColor[batch.dataType])}>
            {DataTypeLabels[batch.dataType]}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700 font-medium">{batch.fileName}</td>
        <td className="px-4 py-3 text-sm text-gray-600">
          <span className="text-emerald-600 font-semibold">{batch.importedCount}</span>
          <span className="text-gray-400 mx-1">/</span>
          <span className="text-amber-600">{batch.skippedCount}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {batch.preCheckSummary && batch.preCheckSummary.errorCount > 0 && (
              <Badge variant="danger">错{batch.preCheckSummary.errorCount}</Badge>
            )}
            {batch.preCheckSummary && batch.preCheckSummary.warningCount > 0 && (
              <Badge variant="warning">警{batch.preCheckSummary.warningCount}</Badge>
            )}
            {!batch.preCheckSummary && <Badge variant="neutral">无预检</Badge>}
            <Badge variant="neutral">{ModeLabels[batch.mode]}</Badge>
            {batch.reverted ? (
              <Badge variant="danger">已撤销</Badge>
            ) : isLatest ? (
              <Badge variant="info">最新</Badge>
            ) : null}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <User className="w-3.5 h-3.5 text-gray-400" />
            {batch.operator}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {formatDate(batch.createdAt)}
          </div>
          {batch.reverted && batch.revertedAt && (
            <div className="flex items-center gap-1.5 text-xs text-orange-600 mt-1">
              <Undo2 className="w-3 h-3" />
              {batch.revertedBy} 于 {formatDate(batch.revertedAt)} 撤销
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {!batch.reverted && isLatest && (
            <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>
              <Undo2 className="w-3.5 h-3.5" />
              撤销
            </Button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={8} className="px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-medium text-gray-500 mb-2">批次信息</p>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">批次ID</span><span className="font-mono text-gray-700">{batch.batchId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">文件哈希</span><span className="font-mono text-gray-700 truncate max-w-[180px]" title={batch.fileHash}>{batch.fileHash.slice(0, 16)}...</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">导入模式</span><span className="text-gray-700">{ModeLabels[batch.mode]}</span></div>
                </dl>
              </div>
              {batch.preCheckSummary && (
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">预检摘要</p>
                  <dl className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">总行数</span><span className="text-gray-700">{batch.preCheckSummary.totalRows}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">有效行数</span><span className="text-gray-700">{batch.preCheckSummary.validRows}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">错误/警告</span><span className="text-gray-700">{batch.preCheckSummary.errorCount} / {batch.preCheckSummary.warningCount}</span></div>
                    <div>
                      <span className="text-gray-500">问题类型：</span>
                      <span className="text-gray-700">
                        {batch.preCheckSummary.issueCodes.length > 0
                          ? batch.preCheckSummary.issueCodes.map(c => (PreCheckIssueCodeLabels as Record<string, string>)[c] || c).join('、')
                          : '无'}
                      </span>
                    </div>
                  </dl>
                </div>
              )}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-medium text-gray-500 mb-2">快照统计（撤销时还原）</p>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">居民数</span><span className="text-gray-700">{batch.snapshot.residents.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">预约数</span><span className="text-gray-700">{batch.snapshot.appointments.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">随访数</span><span className="text-gray-700">{batch.snapshot.followups.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">异常数</span><span className="text-gray-700">{batch.snapshot.anomalies.length}</span></div>
                </dl>
              </div>
            </div>
          </td>
        </tr>
      )}
      {showConfirm && (
        <tr className="bg-orange-50">
          <td colSpan={8} className="px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">确认撤销批次「{batch.fileName}」？</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    将还原 {DataTypeLabels[batch.dataType]} 数据、异常统计和未登记居民记录到导入前状态。
                  </p>
                  <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    已确认/忽略的人工复核结果将被保护，不会被覆盖。
                  </p>
                  {revertResult && !revertResult.success && (
                    <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-200 rounded p-2">
                      {revertResult.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => { setShowConfirm(false); setRevertResult(null) }}>
                  取消
                </Button>
                <Button variant="danger" size="sm" onClick={handleRevert}>
                  <Undo2 className="w-3.5 h-3.5" />
                  确认撤销
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function ImportBatches() {
  const importBatches = useAppStore(s => s.importBatches)
  const exportBatches = useAppStore(s => s.exportBatches)
  const revertLastBatch = useAppStore(s => s.revertLastBatch)
  const [globalRevertResult, setGlobalRevertResult] = useState<RevertBatchResult | null>(null)
  const [showRevertAlert, setShowRevertAlert] = useState(false)

  const nonReverted = importBatches.filter(b => !b.reverted)
  const latestBatchId = nonReverted.length > 0 ? nonReverted[0].batchId : null

  const handleRevertLatest = () => {
    const result = revertLastBatch()
    setGlobalRevertResult(result)
    setShowRevertAlert(true)
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-sky-600" />
          <span>导入批次追踪</span>
          <Badge variant="neutral">{importBatches.length} 条</Badge>
          {nonReverted.length > 0 && (
            <Badge variant="info" className="ml-1">{nonReverted.length} 条生效中</Badge>
          )}
        </div>
      }
      subtitle="每次 CSV 入库自动生成批次，支持撤销最近一次成功导入，还原数据并保护人工复核结果"
      headerRight={
        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={handleRevertLatest}
            disabled={nonReverted.length === 0}
          >
            <Undo2 className="w-4 h-4" />
            撤销最近批次
          </Button>
          <div className="relative group">
            <Button variant="primary" size="sm" disabled={importBatches.length === 0}>
              <Download className="w-4 h-4" />
              导出
            </Button>
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => exportBatches('csv')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                导出 CSV
              </button>
              <button
                onClick={() => exportBatches('json')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t border-gray-100"
              >
                导出 JSON
              </button>
            </div>
          </div>
        </div>
      }
    >
      {showRevertAlert && globalRevertResult && (
        <div className={cn(
          'mb-4 rounded-lg border p-3 flex items-start gap-3',
          globalRevertResult.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        )}>
          {globalRevertResult.success ? (
            <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className={cn(
              'text-sm font-medium',
              globalRevertResult.success ? 'text-green-800' : 'text-red-800'
            )}>
              {globalRevertResult.success ? '撤销成功' : '撤销失败'}
            </p>
            <p className={cn(
              'text-xs mt-0.5',
              globalRevertResult.success ? 'text-green-700' : 'text-red-700'
            )}>
              {globalRevertResult.message}
              {globalRevertResult.blockedReason && (
                <span className="ml-1 font-mono">（{globalRevertResult.blockedReason}）</span>
              )}
            </p>
          </div>
          <button onClick={() => setShowRevertAlert(false)} className="p-1 hover:bg-black/5 rounded flex-shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {importBatches.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">暂无导入批次记录</p>
          <p className="text-sm text-gray-400 mt-1">
            成功导入居民、预约或随访 CSV 后会自动生成批次
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left w-10"></th>
                <th className="px-4 py-3 text-left w-24">数据类型</th>
                <th className="px-4 py-3 text-left">文件名</th>
                <th className="px-4 py-3 text-left w-24">导入/跳过</th>
                <th className="px-4 py-3 text-left w-40">预检摘要</th>
                <th className="px-4 py-3 text-left w-28">操作者</th>
                <th className="px-4 py-3 text-left w-44">时间</th>
                <th className="px-4 py-3 text-right w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {importBatches.map(batch => (
                <BatchRow
                  key={batch.batchId}
                  batch={batch}
                  isLatest={batch.batchId === latestBatchId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
