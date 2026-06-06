import { X, Search, RotateCcw } from 'lucide-react'
import { useAppStore } from '@/store'
import { AnomalyType, AnomalyTypeLabels, ReviewStatus, ReviewStatusLabels } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from './common/Button'

export function FilterBar() {
  const filters = useAppStore(s => s.filters)
  const setFilters = useAppStore(s => s.setFilters)
  const resetFilters = useAppStore(s => s.resetFilters)
  const residents = useAppStore(s => s.residents)
  const appointments = useAppStore(s => s.appointments)
  const followups = useAppStore(s => s.followups)

  const allSites = Array.from(
    new Set([
      ...residents.map(r => r.site),
      ...appointments.map(a => a.site),
      ...followups.map(f => f.site),
    ])
  ).filter(Boolean)

  const allNurses = Array.from(
    new Set([
      ...residents.map(r => r.nurse),
      ...appointments.map(a => a.nurse),
      ...followups.map(f => f.nurse),
    ])
  ).filter(Boolean)

  const toggleArrayItem = <T extends string>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Search className="w-4 h-4" />
          筛选条件
        </h3>
        <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
          <RotateCcw className="w-3.5 h-3.5" />
          重置
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索居民编号、姓名、描述或备注..."
          value={filters.searchText}
          onChange={e => setFilters({ searchText: e.target.value })}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <FilterChipGroup
        label="站点"
        items={allSites}
        selected={filters.sites}
        onToggle={item => setFilters({ sites: toggleArrayItem(filters.sites, item) })}
      />

      <FilterChipGroup
        label="护士"
        items={allNurses}
        selected={filters.nurses}
        onToggle={item => setFilters({ nurses: toggleArrayItem(filters.nurses, item) })}
      />

      <FilterChipGroup
        label="异常类型"
        items={Object.values(AnomalyType)}
        labels={AnomalyTypeLabels}
        selected={filters.anomalyTypes}
        onToggle={item =>
          setFilters({ anomalyTypes: toggleArrayItem(filters.anomalyTypes, item as AnomalyType) })
        }
      />

      <FilterChipGroup
        label="复核状态"
        items={Object.values(ReviewStatus)}
        labels={ReviewStatusLabels}
        selected={filters.statuses}
        onToggle={item =>
          setFilters({ statuses: toggleArrayItem(filters.statuses, item as ReviewStatus) })
        }
        colorMode="status"
      />
    </div>
  )
}

interface FilterChipGroupProps {
  label: string
  items: string[]
  labels?: Record<string, string>
  selected: string[]
  onToggle: (item: string) => void
  colorMode?: 'default' | 'status'
}

function FilterChipGroup({ label, items, labels, selected, onToggle, colorMode = 'default' }: FilterChipGroupProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-300 data-[selected=true]:bg-amber-500 data-[selected=true]:text-white data-[selected=true]:border-amber-500'
      case 'CONFIRMED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 data-[selected=true]:bg-emerald-500 data-[selected=true]:text-white data-[selected=true]:border-emerald-500'
      case 'IGNORED':
        return 'bg-gray-50 text-gray-700 border-gray-300 data-[selected=true]:bg-gray-500 data-[selected=true]:text-white data-[selected=true]:border-gray-500'
      case 'NEED_HOME_VISIT':
        return 'bg-blue-50 text-blue-700 border-blue-300 data-[selected=true]:bg-blue-600 data-[selected=true]:text-white data-[selected=true]:border-blue-600'
      default:
        return ''
    }
  }

  if (items.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const isSelected = selected.includes(item)
          const labelText = labels?.[item] || item
          return (
            <button
              key={item}
              data-selected={isSelected}
              onClick={() => onToggle(item)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-full border transition-all',
                colorMode === 'status'
                  ? getStatusColor(item)
                  : cn(
                      'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
                      isSelected && 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                    )
              )}
            >
              {isSelected && <X className="w-3 h-3" />}
              {labelText}
            </button>
          )
        })}
      </div>
    </div>
  )
}
