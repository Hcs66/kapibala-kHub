import type { AnalysisSummaryDTO } from '@/shared/api/types'
import { Brain, Lightbulb, AlertTriangle, ArrowRight, MessageCircle } from 'lucide-react'
import type { SuggestedReply } from '@/mocks/data'

interface AnalysisSidebarProps {
  analysis: AnalysisSummaryDTO | null
  loading?: boolean
  suggestedReplies?: SuggestedReply[]
  onSuggestedReplyClick?: (text: string) => void
}

export function AnalysisSidebar({ analysis, loading, suggestedReplies, onSuggestedReplyClick }: AnalysisSidebarProps): React.ReactElement {
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
        <div className="rounded-lg bg-ai-tint p-3">
          <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground">销售阶段</p>
          <p className="text-sm font-medium">{analysis.stage}</p>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground">会话摘要</p>
        <p className="text-sm leading-relaxed">{analysis.summary}</p>
      </div>

      {analysis.trust && (
        <div className="flex items-start gap-2 rounded-lg bg-ai-tint p-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">信任度</p>
            <p className="text-sm">{analysis.trust}</p>
          </div>
        </div>
      )}

      {analysis.concern && (
        <div className="flex items-start gap-2 rounded-lg bg-ai-tint p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">关注点</p>
            <p className="text-sm">{analysis.concern}</p>
          </div>
        </div>
      )}

      {analysis.nextAction && (
        <div className="flex items-start gap-2 rounded-lg bg-ai-tint p-3">
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">建议动作</p>
            <p className="text-sm">{analysis.nextAction}</p>
          </div>
        </div>
      )}

      {suggestedReplies && suggestedReplies.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-medium tracking-wide text-muted-foreground">建议回复</p>
          </div>
          <div className="flex flex-col gap-2">
            {suggestedReplies.map((reply) => (
              <button
                key={reply.id}
                type="button"
                onClick={() => onSuggestedReplyClick?.(reply.text)}
                className="rounded-md border border-border bg-surface-container-lowest p-2.5 text-left text-xs leading-relaxed shadow-[0px_2px_12px_rgba(0,0,0,0.03)] transition-colors hover:border-primary/50 hover:bg-ai-tint"
              >
                {reply.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {analysis.evidenceRefs.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground">依据</p>
          <div className="flex flex-col gap-1.5">
            {analysis.evidenceRefs.map((ref) => (
              <div key={ref.messageId} className="rounded-md border border-border bg-surface-container-low px-2.5 py-1.5">
                <p className="text-xs italic text-muted-foreground">"{ref.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
