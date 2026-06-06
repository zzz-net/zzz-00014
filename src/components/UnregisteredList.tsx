import { UserX, MapPin, Stethoscope, Calendar } from 'lucide-react'
import { useAppStore } from '@/store'
import { Badge } from './common/Badge'
import { Card } from './common/Card'

export function UnregisteredList() {
  const records = useAppStore(s => s.unregisteredRecords)

  if (records.length === 0) return null

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <UserX className="w-4 h-4 text-amber-600" />
          未登记居民记录
        </span>
      }
      subtitle="以下居民编号在居民名册中不存在"
      className="border-amber-200 bg-amber-50/30"
    >
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-left">居民编号</th>
              <th className="px-3 py-2 text-left">数据来源</th>
              <th className="px-3 py-2 text-left">日期</th>
              <th className="px-3 py-2 text-left">站点</th>
              <th className="px-3 py-2 text-left">护士</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-200/50">
            {records.map(record => (
              <tr key={record.id} className="hover:bg-amber-100/30">
                <td className="px-3 py-2.5 font-mono font-medium text-amber-800">{record.residentId}</td>
                <td className="px-3 py-2.5">
                  <Badge variant="warning" size="sm">
                    {record.source === 'appointment' ? '预约记录' : '随访记录'}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-gray-700">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {record.recordDate}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {record.site || '-'}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-gray-700">
                    <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                    {record.nurse || '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
