import { useState } from 'react'
import { ChevronDown, ChevronUp, User, MapPin, Stethoscope, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Anomaly, AnomalyType, AnomalyTypeLabels, ReviewStatus, ReviewStatusLabels } from '@/types'
import { useAppStore } from '@/store'
import { Badge } from './common/Badge'

const AnomalyTypeConfig: Record<AnomalyType, { color: string; variant: 'danger' | 'warning' | 'info' | 'neutral' }> = {
  [AnomalyType.OVERDUE_VISIT]: { color: 'bg-red-50 border-l-red-500', variant: 'danger' },
  [AnomalyType.UNPLANNED_VISIT]: { color: 'bg-sky-50 border-l-sky-500', variant: 'info' },
  [AnomalyType.DUPLICATE_FOLLOWUP]: { color: 'bg-purple-50 border-l-purple-500', variant: 'warning' },
  [AnomalyType.ABNORMAL_METRIC]: { color: 'bg-rose-50 border-l-rose-500', variant: 'danger' },
  [AnomalyType.UNREGISTERED_RESIDENT]: { color: 'bg-amber-50 border-l-amber-500', variant: 'warning' },
}

const StatusColor: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING]: 'bg-amber-100 text-amber-700 border-amber-300',
  [ReviewStatus.CONFIRMED]: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  [ReviewStatus.IGNORED]: 'bg-gray-100 text-gray-600 border-gray-300',
  [ReviewStatus.NEED_HOME_VISIT]: 'bg-blue-100 text-blue-700 border-blue-300',
}

interface AnomalyRowProps {
  anomaly: Anomaly
}

function AnomalyRow({ anomaly }: AnomalyRowProps) {
  const [expanded, setExpanded] = useState(false)
  const updateAnomaly = useAppStore(s => s.updateAnomaly)
  const [editRemark, setEditRemark] = useState(anomaly.remark)
  const [handler, setHandler] = useState(anomaly.handler)

  const typeConfig = AnomalyTypeConfig[anomaly.type]

  const formatDate = (iso: string) => {
    if (!iso) return '-'
    try {
      return new Date(iso).toLocaleString('zh-CN')
    } catch {
      return '-'
    }
  }

  return (
    <>
      <tr
        className={cn('border-l-4 transition-colors hover:bg-gray-50/80', typeConfig.color)}
      >
        <td className="px-4 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-white/60 rounded transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
        </td>
        <td className="px-4 py-3">
          <Badge variant={typeConfig.variant}>{AnomalyTypeLabels[anomaly.type]}</Badge>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-900">{anomaly.residentName || '-'}</span>
            <span className="text-xs text-gray-500">{anomaly.residentId}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <MapPin className="w-3 h-3" />
              {anomaly.site || '-'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Stethoscope className="w-3 h-3" />
              {anomaly.nurse || '-'}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 max-w-md">
          <p className="text-sm text-gray-700 line-clamp-2">{anomaly.description}</p>
        </td>
        <td className="px-4 py-3">
          <select
            value={anomaly.status}
            onChange={e => updateAnomaly(anomaly.anomalyId, e.target.value as ReviewStatus)}
            className={cn(
              'text-xs px-2.5 py-1.5 rounded-lg border font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer',
              StatusColor[anomaly.status]
            )}
          >
            {Object.entries(ReviewStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {formatDate(anomaly.updatedAt)}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50 border-l-4 border-gray-300">
          <td colSpan={7} className="px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">处理人</label>
                <input
                  type="text"
                  value={handler}
                  onChange={e => {
                    setHandler(e.target.value)
                    updateAnomaly(anomaly.anomalyId, undefined, undefined, e.target.value)
                  }}
                  placeholder="输入处理人姓名"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">备注</label>
                <textarea
                  value={editRemark}
                  onChange={e => setEditRemark(e.target.value)}
                  onBlur={() => updateAnomaly(anomaly.anomalyId, undefined, editRemark)}
                  placeholder="输入复核备注..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
              {anomaly.relatedRecord && 'bloodPressureSystolic' in anomaly.relatedRecord && (
                <div className="md:col-span-2 bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">随访详情</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">随访日期: </span>
                      <span className="font-medium">{anomaly.relatedRecord.date}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">收缩压: </span>
                      <span className={cn('font-medium', anomaly.relatedRecord.bloodPressureSystolic && anomaly.relatedRecord.bloodPressureSystolic > 140 ? 'text-red-600' : '')}>
                        {anomaly.relatedRecord.bloodPressureSystolic ?? '-'} mmHg
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">舒张压: </span>
                      <span className={cn('font-medium', anomaly.relatedRecord.bloodPressureDiastolic && anomaly.relatedRecord.bloodPressureDiastolic > 90 ? 'text-red-600' : '')}>
                        {anomaly.relatedRecord.bloodPressureDiastolic ?? '-'} mmHg
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">血糖: </span>
                      <span className={cn('font-medium', anomaly.relatedRecord.bloodGlucose && anomaly.relatedRecord.bloodGlucose > 7.0 ? 'text-red-600' : '')}>
                        {anomaly.relatedRecord.bloodGlucose ?? '-'} mmol/L
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {anomaly.relatedRecord && 'status' in anomaly.relatedRecord && (
                <div className="md:col-span-2 bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">预约详情</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">预约日期: </span>
                      <span className="font-medium">{anomaly.relatedRecord.date}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">预约状态: </span>
                      <span className="font-medium">{anomaly.relatedRecord.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function AnomalyTable() {
  const getFilteredAnomalies = useAppStore(s => s.getFilteredAnomalies)
  const anomalies = getFilteredAnomalies()

  if (anomalies.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 shadow-sm text-center">
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600 font-medium">暂无异常数据</p>
        <p className="text-sm text-gray-400 mt-1">请先导入 CSV 数据或调整筛选条件</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          共 <span className="font-semibold text-gray-900">{anomalies.length}</span> 条异常记录
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left w-10"></th>
              <th className="px-4 py-3 text-left">异常类型</th>
              <th className="px-4 py-3 text-left">居民</th>
              <th className="px-4 py-3 text-left">站点/护士</th>
              <th className="px-4 py-3 text-left">异常描述</th>
              <th className="px-4 py-3 text-left">复核状态</th>
              <th className="px-4 py-3 text-left">更新时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {anomalies.map(anomaly => (
              <AnomalyRow key={anomaly.anomalyId} anomaly={anomaly} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
