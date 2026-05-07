import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Plus, X, Trash2 } from 'lucide-react'
import { useTagStore } from '@/stores/tagStore'
import { useConversationStore } from '@/stores/conversationStore'

const PRESET_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#f97316',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#14b8a6',
]

interface TagPopoverProps {
  open: boolean
  onClose: () => void
}

export function TagPopover({ open, onClose }: TagPopoverProps): React.ReactElement | null {
  const { t } = useTranslation()
  const tags = useTagStore((s) => s.tags)
  const createTag = useTagStore((s) => s.createTag)
  const deleteTag = useTagStore((s) => s.deleteTag)
  const selectedTagIds = useConversationStore((s) => s.selectedTagIds)
  const toggleTag = useConversationStore((s) => s.toggleTag)

  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])
  const popoverRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, handleClickOutside])

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setIsCreating(false)
      setNewTagName('')
      setSelectedColor(PRESET_COLORS[0])
    }
  }, [open])

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleCreateTag = async (): Promise<void> => {
    const name = newTagName.trim()
    if (!name) return
    await createTag(name, selectedColor)
    setNewTagName('')
    setSelectedColor(PRESET_COLORS[0])
    setIsCreating(false)
  }

  const handleDeleteTag = async (tagId: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    await deleteTag(tagId)
  }

  if (!open) return null

  return (
    <div
      ref={popoverRef}
      className="absolute left-sm right-sm top-full z-50 mt-1 rounded-lg border border-outline-variant bg-surface-container-lowest shadow-elevated"
    >
      <div className="p-sm">
        <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-sm py-[7px] transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-glow">
          <Search className="h-3.5 w-3.5 shrink-0 text-outline-variant" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('conversation.searchTags')}
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-outline-variant"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-outline-variant hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[200px] overflow-y-auto px-xs">
        {filteredTags.length === 0 ? (
          <div className="px-sm py-3 text-center text-xs text-on-surface-variant">
            {t('conversation.noTagsFound')}
          </div>
        ) : (
          filteredTags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.tagId)
            return (
              <button
                key={tag.tagId}
                type="button"
                onClick={() => toggleTag(tag.tagId)}
                className={`flex w-full items-center gap-2 rounded-md px-sm py-[6px] text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-primary-fixed/30 text-primary'
                    : 'text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color ?? '#94a3b8' }}
                />
                <span className="flex-1 truncate font-medium">{tag.name}</span>
                {isSelected && (
                  <span className="shrink-0 text-[10px] font-semibold text-primary">✓</span>
                )}
                <button
                  type="button"
                  onClick={(e) => void handleDeleteTag(tag.tagId, e)}
                  className="shrink-0 rounded p-0.5 text-on-surface-variant opacity-0 transition-opacity hover:text-error group-hover:opacity-100 [button:hover>&]:opacity-100"
                  title={t('conversation.deleteTag')}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            )
          })
        )}
      </div>

      <div className="border-t border-surface-container-highest p-xs">
        {isCreating ? (
          <div className="flex flex-col gap-2 px-xs">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreateTag()
                  if (e.key === 'Escape') setIsCreating(false)
                }}
                placeholder={t('conversation.newTagPlaceholder')}
                className="flex-1 rounded border border-outline-variant bg-transparent px-2 py-1 text-xs outline-none focus:border-primary"
                autoFocus
              />
              <button
                type="button"
                onClick={() => void handleCreateTag()}
                disabled={!newTagName.trim()}
                className="rounded bg-primary px-2 py-1 text-[10px] font-medium text-on-primary transition-colors disabled:opacity-50"
              >
                {t('common.confirm')}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-on-surface-variant hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="mr-1 text-[10px] text-on-surface-variant">{t('conversation.tagColor')}</span>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`flex h-4 w-4 items-center justify-center rounded-full transition-transform ${
                    selectedColor === color ? 'scale-125 ring-2 ring-offset-1 ring-primary/40' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && (
                    <span className="text-[8px] font-bold text-white">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex w-full items-center gap-2 rounded-md px-sm py-[6px] text-xs font-medium text-primary transition-colors hover:bg-surface-container-low"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('conversation.createTag')}</span>
          </button>
        )}
      </div>
    </div>
  )
}
