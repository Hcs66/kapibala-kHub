import type { AnalysisSummaryDTO } from '@/shared/api/types'
import { Brain, Lightbulb, AlertTriangle, ArrowRight } from 'lucide-react'

interface AnalysisSidebarProps {
  analysis: AnalysisSummaryDTO | null
  loading?: boolean
}

export function AnalysisSidebar({ analysis, loading }: AnalysisSidebarProps): React.ReactElement {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xs text-muted-foreground">加载分析中...</p>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
        <Brain className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">选择会话后显示分析结果</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {analysis.stage && (
        <div className="rounded-md bg-muted p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">销售阶段</p>
          <p className="text-sm font-medium">{analysis.stage}</p>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">会话摘要</p>
        <p className="text-sm leading-relaxed">{analysis.summary}</p>
      </div>

      {analysis.trust && (
        <div className="flex items-start gap-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">信任度</p>
            <p className="text-sm">{analysis.trust}</p>
          </div>
        </div>
      )}

      {analysis.concern && (
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">关注点</p>
            <p className="text-sm">{analysis.concern}</p>
          </div>
        </div>
      )}

      {analysis.nextAction && (
        <div className="flex items-start gap-2">
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">建议动作</p>
            <p className="text-sm">{analysis.nextAction}</p>
          </div>
        </div>
      )}

      {analysis.evidenceRefs.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">依据</p>
          <div className="flex flex-col gap-1.5">
            {analysis.evidenceRefs.map((ref) => (
              <div key={ref.messageId} className="rounded border border-border bg-muted/50 px-2.5 py-1.5">
                <p className="text-xs italic text-muted-foreground">"{ref.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
