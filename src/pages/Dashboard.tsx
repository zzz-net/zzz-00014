import { useState } from 'react'
import { Activity, Download, RotateCcw, HelpCircle, X } from 'lucide-react'
import { useAppStore } from '@/store'
import { FileUpload } from '@/components/FileUpload'
import { StatsOverview } from '@/components/StatsOverview'
import { FilterBar } from '@/components/FilterBar'
import { AnomalyTable } from '@/components/AnomalyTable'
import { UnregisteredList } from '@/components/UnregisteredList'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'

export default function Dashboard() {
  const exportFilteredData = useAppStore(s => s.exportFilteredData)
  const resetAll = useAppStore(s => s.resetAll)
  const getFilteredAnomalies = useAppStore(s => s.getFilteredAnomalies)
  const residents = useAppStore(s => s.residents.length)
  const appointments = useAppStore(s => s.appointments.length)
  const followups = useAppStore(s => s.followups.length)
  const hasData = residents > 0 || appointments > 0 || followups > 0
  const [showHelp, setShowHelp] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <header className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white shadow-lg">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
                <Activity className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">社区慢病随访复核看板</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  数据质量核查与异常复核管理系统
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-4 text-xs text-slate-400 mr-4">
                <span>居民: <span className="text-slate-200 font-medium">{residents}</span></span>
                <span>预约: <span className="text-slate-200 font-medium">{appointments}</span></span>
                <span>随访: <span className="text-slate-200 font-medium">{followups}</span></span>
                <span>异常: <span className="text-amber-300 font-medium">{getFilteredAnomalies().length}</span></span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowHelp(true)}
                className="bg-slate-700 hover:bg-slate-600"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">帮助</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                disabled={!hasData}
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">重置</span>
              </Button>
              <div className="relative group">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={getFilteredAnomalies().length === 0}
                >
                  <Download className="w-4 h-4" />
                  导出
                </Button>
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <button
                    onClick={() => exportFilteredData('csv')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    导出 CSV
                  </button>
                  <button
                    onClick={() => exportFilteredData('json')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t border-gray-100"
                  >
                    导出 JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <Card title="数据导入" subtitle="请依次导入居民名册、预约计划和随访记录 CSV 文件">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FileUpload type="residents" />
            <FileUpload type="appointments" />
            <FileUpload type="followups" />
          </div>
        </Card>

        <StatsOverview />

        <UnregisteredList />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <FilterBar />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <AnomalyTable />
          </div>
        </div>
      </main>

      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">使用说明</h3>
              <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">异常类型说明</h4>
                <ul className="space-y-2">
                  <li><strong className="text-red-600">逾期未访：</strong>预约日期已过但7天内无随访记录</li>
                  <li><strong className="text-sky-600">未预约到访：</strong>有随访记录但前3天内无对应预约</li>
                  <li><strong className="text-purple-600">重复随访：</strong>同一居民同一天有多条随访记录</li>
                  <li><strong className="text-rose-600">指标越界：</strong>血压(＞140/90)或血糖(＞7.0)超出正常范围</li>
                  <li><strong className="text-amber-600">居民不在名册：</strong>记录中的居民编号在居民名册中不存在</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">复核状态</h4>
                <ul className="space-y-2">
                  <li><strong className="text-amber-600">待处理：</strong>新识别的异常，需要确认</li>
                  <li><strong className="text-emerald-600">已确认：</strong>异常情况已核实</li>
                  <li><strong className="text-gray-500">忽略：</strong>误报或无需处理</li>
                  <li><strong className="text-blue-600">需上门：</strong>需要安排上门随访</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">CSV 字段要求</h4>
                <ul className="space-y-2">
                  <li><strong>居民名册：</strong>居民编号(必填)、姓名、性别、所属站点、责任护士、慢病类型</li>
                  <li><strong>预约计划：</strong>居民编号(必填)、预约日期(必填)、执行护士、站点、状态</li>
                  <li><strong>随访记录：</strong>居民编号(必填)、随访日期(必填)、随访护士、站点、收缩压、舒张压、血糖、到访方式</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700">💡 提示：请使用 src/sample-data/ 目录下的样例数据测试功能</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowResetConfirm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">确认重置所有数据？</h3>
              <p className="text-sm text-gray-600 mb-6">此操作将清空所有导入的数据、异常记录和复核状态，且无法恢复。</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowResetConfirm(false)}>取消</Button>
                <Button variant="danger" onClick={() => { resetAll(); setShowResetConfirm(false) }}>确认重置</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
