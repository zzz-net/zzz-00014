import { useRef, useState } from 'react'
import { Upload, CheckCircle, AlertCircle, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataType, DataTypeLabels, ImportResult } from '@/types'
import { useAppStore } from '@/store'
import { Badge } from './common/Badge'

interface FileUploadProps {
  type: DataType
}

export function FileUpload({ type }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const lastResult = useAppStore(s => s.lastImportResult[type])
  const importData = useAppStore(s => s.importData)
  const importedCount =
    type === 'residents'
      ? useAppStore(s => s.residents.length)
      : type === 'appointments'
      ? useAppStore(s => s.appointments.length)
      : useAppStore(s => s.followups.length)

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setIsLoading(true)
    try {
      const text = await file.text()
      await importData(type, text, file.name)
    } finally {
      setIsLoading(false)
    }
  }

  const getBadgeVariant = (result: ImportResult | null) => {
    if (!result) return 'neutral'
    if (result.isDuplicate) return 'info'
    if (result.success) return 'success'
    return 'danger'
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFileName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-xl p-5 transition-all cursor-pointer',
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : lastResult?.success
          ? 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-400'
          : lastResult && !lastResult.success && !lastResult.isDuplicate
          ? 'border-red-300 bg-red-50/30 hover:border-red-400'
          : 'border-gray-300 bg-gray-50/50 hover:border-blue-400 hover:bg-blue-50/30'
      )}
      onDragOver={e => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file && file.name.endsWith('.csv')) handleFile(file)
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      <div className="flex items-start gap-4">
        <div
          className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
            lastResult?.success
              ? 'bg-emerald-100 text-emerald-600'
              : lastResult && !lastResult.success
              ? 'bg-red-100 text-red-600'
              : 'bg-blue-100 text-blue-600'
          )}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : lastResult?.success ? (
            <CheckCircle className="w-6 h-6" />
          ) : lastResult && !lastResult.success ? (
            <AlertCircle className="w-6 h-6" />
          ) : (
            <Upload className="w-6 h-6" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">{DataTypeLabels[type]}</span>
              <Badge variant="neutral">当前 {importedCount} 条</Badge>
            </div>
            {lastResult && (
              <Badge variant={getBadgeVariant(lastResult)}>
                {lastResult.isDuplicate ? '重复文件' : lastResult.success ? '导入成功' : '导入失败'}
              </Badge>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-1">
            {fileName ? (
              <span className="inline-flex items-center gap-1">
                {fileName}
                <button
                  onClick={handleClear}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : (
              '点击或拖拽 CSV 文件到此处上传'
            )}
          </p>

          {lastResult && (
            <p
              className={cn(
                'text-xs mt-2',
                lastResult.success || lastResult.isDuplicate ? 'text-gray-600' : 'text-red-600'
              )}
            >
              {lastResult.message}
              {lastResult.errors.length > 0 && `（前3条: ${lastResult.errors.slice(0, 3).map(e => `第${e.row}行${e.field}`).join('；')}`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
