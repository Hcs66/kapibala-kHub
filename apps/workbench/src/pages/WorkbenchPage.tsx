export function WorkbenchPage(): React.ReactElement {
  return (
    <div className="flex h-svh">
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-12 items-center border-b border-sidebar-border px-4">
          <span className="text-sm font-medium">会话</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs text-muted-foreground">暂无会话</p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex h-12 items-center border-b border-border px-4">
          <span className="text-sm text-muted-foreground">选择一个会话开始聊天</span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">消息区</p>
        </div>
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="输入消息..."
              className="flex-1 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              disabled
            />
            <button
              type="button"
              disabled
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      </main>

      <aside className="flex w-80 shrink-0 flex-col border-l border-sidebar-border bg-sidebar">
        <div className="flex h-12 items-center border-b border-sidebar-border px-4">
          <span className="text-sm font-medium">AI 分析</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs text-muted-foreground">选择会话后显示分析结果</p>
        </div>
      </aside>
    </div>
  )
}
