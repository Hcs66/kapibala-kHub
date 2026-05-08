import { useTranslation } from 'react-i18next'
import { Zap, Settings } from 'lucide-react'
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
    <div className="flex items-center gap-[6px] overflow-x-auto border-b border-surface-container-highest px-sm py-[8px] scrollbar-none">
      <button
        type="button"
        onClick={() => setActiveFilter(!activeFilterOn)}
        className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-[4px] text-[11px] font-medium transition-all ${
          activeFilterOn
            ? 'bg-emerald-500 text-white shadow-sm [&_svg]:text-white'
            : 'border border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant hover:border-primary/30 hover:text-foreground'
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
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-[4px] text-[11px] font-medium transition-all ${
              isSelected
                ? 'shadow-sm'
                : 'border border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant hover:border-primary/30 hover:text-foreground'
            }`}
            style={
              isSelected
                ? { backgroundColor: `${tag.color}18`, color: tag.color, border: `1px solid ${tag.color}40` }
                : undefined
            }
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: tag.color ?? '#94a3b8' }}
            />
            <span>{tag.name}</span>
          </button>
        )
      })}

      <button
        type="button"
        onClick={onOpenTagPopover}
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
        title={t('conversation.manageTags')}
      >
        <Settings className="h-3 w-3" />
      </button>
    </div>
  )
}
