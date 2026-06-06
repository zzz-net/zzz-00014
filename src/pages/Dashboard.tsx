import { useState } from 'react'
import {
  Activity,
  Download,
  RotateCcw,
  HelpCircle,
  X,
  Settings,
  FileText,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { FileUpload } from '@/components/FileUpload'
import { StatsOverview } from '@/components/StatsOverview'
import { FilterBar } from '@/components/FilterBar'
import { AnomalyTable } from '@/components/AnomalyTable'
import { UnregisteredList } from '@/components/UnregisteredList'
import { QCRuleConfig } from '@/components/QCRuleConfig'
import { OperationLogs } from '@/components/OperationLogs'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { cn } from '@/lib/utils'

type TabType = 'dashboard' | 'rules' | 'logs'

export default function Dashboard() {
  const exportFilteredData = useAppStore(s => s.exportFilteredData)
  const resetAll = useAppStore(s => s.resetAll)
  const getFilteredAnomalies = useAppStore(s => s.getFilteredAnomalies)
  const recalculateAnomalies = useAppStore(s => s.recalculateAnomalies)
  const anomalies = useAppStore(s => s.anomalies)
  const residents = useAppStore(s => s.residents.length)
  const appointments = useAppStore(s => s.appointments.length)
  const followups = useAppStore(s => s.followups.length)
  const hasData = residents > 0 || appointments > 0 || followups > 0
  const currentRuleVersion = useAppStore(s => s.currentRuleVersion)
  const ruleVersions = useAppStore(s => s.ruleVersions)

  const [showHelp, setShowHelp] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showRecalcConfirm, setShowRecalcConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  const currentVersion = ruleVersions.find(v => v.version === currentRuleVersion)

  const tabs: { key: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'dashboard', label: '异常看板', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'rules', label: '质控规则', icon: <Settings className="w-4 h-4" /> },
    { key: 'logs', label: '操作日志', icon: <FileText className="w-4 h-4" />, badge: undefined },
  ]

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
              {currentVersion && activeTab === 'dashboard' && (
                <Badge variant="info" className="ml-3 bg-blue-500/20 text-blue-200 border-blue-400/30">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {currentVersion.name}
                </Badge>
              )}
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
              {activeTab === 'dashboard' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRecalcConfirm(true)}
                    disabled={!hasData}
                    className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">重算</span>
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
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1 bg-slate-700/50 p-1 rounded-lg w-fit">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  activeTab === tab.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <>
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
          </>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
            <QCRuleConfig />

            <Card title="批量重算" subtitle="按当前规则重新计算所有异常记录">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">重新识别异常</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      当前共有 <span className="font-semibold text-gray-700">{anomalies.length}</span> 条异常记录。
                      <span className="text-green-600 flex items-center gap-1 mt-1">
                        <ShieldCheck className="w-3 h-3" />
                        已确认/忽略的记录将保留原状态
                      </span>
                    </p>
                  </div>
                </div>
                <Button variant="primary" onClick={() => setShowRecalcConfirm(true)} disabled={!hasData}>
                  <RefreshCw className="w-4 h-4" />
                  立即重算
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'logs' && <OperationLogs />}
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
                <h4 className="font-medium text-gray-900 mb-2">功能模块</h4>
                <ul className="space-y-2">
                  <li><strong className="text-blue-600">异常看板：</strong>数据导入、异常识别、筛选与复核</li>
                  <li><strong className="text-purple-600">质控规则：</strong>配置异常识别阈值、管理规则版本、预览差异后应用</li>
                  <li><strong className="text-emerald-600">操作日志：</strong>记录所有关键操作，支持筛选与导出</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">异常类型说明</h4>
                <ul className="space-y-2">
                  <li><strong className="text-red-600">逾期未访：</strong>预约日期已过但7天内无随访记录（阈值可配置）</li>
                  <li><strong className="text-sky-600">未预约到访：</strong>有随访记录但N天内无对应预约（窗口可配置）</li>
                  <li><strong className="text-purple-600">重复随访：</strong>同一居民同一天有多条随访记录</li>
                  <li><strong className="text-rose-600">指标越界：</strong>血压或血糖超出配置的上下限范围</li>
                  <li><strong className="text-amber-600">居民不在名册：</strong>记录中的居民编号在居民名册中不存在</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">复核状态</h4>
                <ul className="space-y-2">
                  <li><strong className="text-amber-600">待处理：</strong>新识别的异常，需要确认</li>
                  <li><strong className="text-emerald-600">已确认：</strong>异常情况已核实（受保护，规则变更不会覆盖）</li>
                  <li><strong className="text-gray-500">忽略：</strong>误报或无需处理（受保护，规则变更不会覆盖）</li>
                  <li><strong className="text-blue-600">需上门：</strong>需要安排上门随访</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>数据安全：</strong>已确认和忽略的异常记录受保护，规则变更或批量重算不会静默覆盖人工复核结果。</span>
                </p>
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

      {showRecalcConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRecalcConfirm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">重新计算异常？</h3>
                  <p className="text-sm text-gray-600 mt-1">将按当前质控规则重新识别所有异常。</p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-700">
                  <strong>安全保护已启用</strong><br />
                  状态为"已确认"或"忽略"的人工复核记录不会被覆盖，保持原样。
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowRecalcConfirm(false)}>取消</Button>
                <Button variant="primary" onClick={() => { recalculateAnomalies(true); setShowRecalcConfirm(false) }}>
                  保护状态并重算
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
