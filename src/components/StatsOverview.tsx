import { AlertTriangle, CalendarX, CalendarCheck, Copy, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnomalyType, AnomalyTypeLabels, ReviewStatus } from '@/types'
import { useAppStore } from '@/store'

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  bgColor: string
}

function StatCard({ title, value, icon, color, bgColor }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className={cn('text-3xl font-bold mt-2 tabular-nums', color)}>{value}</p>
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', bgColor)}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export function StatsOverview() {
  const anomalies = useAppStore(s => s.anomalies)
  const pendingCount = anomalies.filter(a => a.status === ReviewStatus.PENDING).length

  const typeCounts = {
    [AnomalyType.OVERDUE_VISIT]: anomalies.filter(a => a.type === AnomalyType.OVERDUE_VISIT).length,
    [AnomalyType.UNPLANNED_VISIT]: anomalies.filter(a => a.type === AnomalyType.UNPLANNED_VISIT).length,
    [AnomalyType.DUPLICATE_FOLLOWUP]: anomalies.filter(a => a.type === AnomalyType.DUPLICATE_FOLLOWUP).length,
    [AnomalyType.ABNORMAL_METRIC]: anomalies.filter(a => a.type === AnomalyType.ABNORMAL_METRIC).length,
    [AnomalyType.UNREGISTERED_RESIDENT]: anomalies.filter(a => a.type === AnomalyType.UNREGISTERED_RESIDENT).length,
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        title="异常总数"
        value={anomalies.length}
        icon={<AlertTriangle className="w-6 h-6 text-amber-600" />}
        color="text-amber-600"
        bgColor="bg-amber-100"
      />
      <StatCard
        title="待处理"
        value={pendingCount}
        icon={<Activity className="w-6 h-6 text-orange-600" />}
        color="text-orange-600"
        bgColor="bg-orange-100"
      />
      <StatCard
        title={AnomalyTypeLabels[AnomalyType.OVERDUE_VISIT]}
        value={typeCounts[AnomalyType.OVERDUE_VISIT]}
        icon={<CalendarX className="w-6 h-6 text-red-600" />}
        color="text-red-600"
        bgColor="bg-red-100"
      />
      <StatCard
        title={AnomalyTypeLabels[AnomalyType.UNPLANNED_VISIT]}
        value={typeCounts[AnomalyType.UNPLANNED_VISIT]}
        icon={<CalendarCheck className="w-6 h-6 text-sky-600" />}
        color="text-sky-600"
        bgColor="bg-sky-100"
      />
      <StatCard
        title={AnomalyTypeLabels[AnomalyType.DUPLICATE_FOLLOWUP]}
        value={typeCounts[AnomalyType.DUPLICATE_FOLLOWUP]}
        icon={<Copy className="w-6 h-6 text-purple-600" />}
        color="text-purple-600"
        bgColor="bg-purple-100"
      />
      <StatCard
        title={AnomalyTypeLabels[AnomalyType.ABNORMAL_METRIC]}
        value={typeCounts[AnomalyType.ABNORMAL_METRIC]}
        icon={<Activity className="w-6 h-6 text-rose-600" />}
        color="text-rose-600"
        bgColor="bg-rose-100"
      />
    </div>
  )
}
