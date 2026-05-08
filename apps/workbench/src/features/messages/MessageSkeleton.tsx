export function MessageSkeleton({ count }: { count: number }): React.ReactElement {
  return (
    <div className="flex flex-col gap-md">
      {Array.from({ length: count }).map((_, i) => {
        const isOutbound = i % 3 === 1
        return (
          <div key={i} className={`flex gap-sm ${isOutbound ? 'flex-row-reverse ml-auto' : ''} max-w-[80%]`}>
            <div className="mt-1 h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface-container" />
            <div className={`flex flex-col gap-1.5 ${isOutbound ? 'items-end' : 'items-start'}`}>
              <div
                className={`animate-pulse rounded-2xl ${isOutbound ? 'rounded-tr-sm bg-primary/15' : 'rounded-tl-sm bg-surface-container-low'}`}
                style={{ width: `${String(140 + (i * 37) % 120)}px`, height: '48px' }}
              />
              <div className="h-2.5 w-12 animate-pulse rounded bg-surface-container" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ConversationSkeleton({ count }: { count: number }): React.ReactElement {
  return (
    <div className="flex flex-col gap-xs">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-sm rounded-lg p-sm">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-surface-container" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 animate-pulse rounded bg-surface-container" />
              <div className="h-3 w-10 animate-pulse rounded bg-surface-container" />
            </div>
            <div className="h-3 animate-pulse rounded bg-surface-container" style={{ width: `${String(60 + (i * 13) % 30)}%` }} />
            <div className="mt-xs flex gap-xs">
              <div className="h-4 w-14 animate-pulse rounded bg-surface-container" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
