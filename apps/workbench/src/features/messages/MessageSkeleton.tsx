export function MessageSkeleton({ count }: { count: number }): React.ReactElement {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => {
        const isOutbound = i % 3 === 1
        return (
          <div key={i} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col gap-1.5 ${isOutbound ? 'items-end' : 'items-start'}`}>
              {!isOutbound && (
                <div className="h-3 w-16 animate-pulse rounded bg-surface-container" />
              )}
              <div
                className={`animate-pulse rounded-lg ${isOutbound ? 'bg-primary/20' : 'bg-surface-container-low'}`}
                style={{ width: `${String(120 + (i * 37) % 100)}px`, height: '40px' }}
              />
              <div className="h-2.5 w-10 animate-pulse rounded bg-surface-container" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ConversationSkeleton({ count }: { count: number }): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md px-4 py-3">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-surface-container" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 animate-pulse rounded bg-surface-container" />
              <div className="h-3 w-12 animate-pulse rounded bg-surface-container" />
            </div>
            <div className="h-3 w-full animate-pulse rounded bg-surface-container" style={{ width: `${String(60 + (i * 13) % 30)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
