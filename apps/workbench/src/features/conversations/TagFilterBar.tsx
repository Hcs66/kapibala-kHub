import { useTranslation } from 'react-i18next'
import { Zap, List } from 'lucide-react'
import { useTagStore } from '@/stores/tagStore'
import { useConversationStore } from '@/stores/conversationStore'

interface TagFilterBarProps {
  onOpenTagPopover: () => void
}

export function TagFilterBar({ onOpenTagPopover }: TagFilterBarProps): React.ReactElement {
  const { t } = useTranslation()
  const tags = useTagStore((s) => s.tags)
  const activeFilterOn = useConversationStore((s) => s.activeFilterOn)
  const selectedTagIds = useConversationStore((s) => s.selectedTagIds)
  const setActiveFilter = useConversationStore((s) => s.setActiveFilter)
  const toggleTag = useConversationStore((s) => s.toggleTag)

  return (
    <div className="flex items-center gap-xs overflow-x-auto border-b border-surface-container-highest px-sm py-[8px] scrollbar-none">
      <button
        type="button"
        onClick={() => setActiveFilter(!activeFilterOn)}
        className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
          activeFilterOn
            ? 'bg-success/10 border border-success/30 text-success font-semibold'
            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-foreground'
        }`}
      >
        <Zap className="h-3 w-3" />
        <span>{t('conversation.active')}</span>
      </button>

      {tags.map((tag) => {
        const isSelected = selectedTagIds.includes(tag.tagId)
        return (
          <button
            key={tag.tagId}
            type="button"
            onClick={() => toggleTag(tag.tagId)}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              isSelected
                ? 'bg-primary-fixed border border-primary/20 text-primary font-semibold'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-foreground'
            }`}
          >
            {tag.color && (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
            )}
            <span>{tag.name}</span>
          </button>
        )
      })}

      <button
        type="button"
        onClick={onOpenTagPopover}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-foreground"
        title={t('conversation.manageTags')}
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
