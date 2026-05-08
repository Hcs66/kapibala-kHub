import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Plus, X, Trash2, Check } from 'lucide-react'
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
      className="absolute left-sm right-sm top-full z-50 mt-1 overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-elevated"
    >
      <div className="px-sm pb-xs pt-sm">
        <div className="flex items-center gap-2 rounded-lg border border-outline-variant/60 bg-surface-container-low px-2.5 py-[6px] transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-glow">
          <Search className="h-3.5 w-3.5 shrink-0 text-outline" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('conversation.searchTags')}
            className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-outline-variant"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="rounded-full p-0.5 text-outline-variant transition-colors hover:bg-surface-container hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[180px] overflow-y-auto px-xs py-xs">
        {filteredTags.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-4 text-center">
            <span className="text-[11px] text-on-surface-variant">{t('conversation.noTagsFound')}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-[2px]">
            {filteredTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.tagId)
              return (
                <button
                  key={tag.tagId}
                  type="button"
                  onClick={() => toggleTag(tag.tagId)}
                  className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left transition-colors ${
                    isSelected
                      ? 'bg-primary/5'
                      : 'hover:bg-surface-container-low'
                  }`}
                >
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-black/5"
                    style={{ backgroundColor: tag.color ?? '#94a3b8' }}
                  />
                  <span className={`flex-1 truncate text-[12px] ${isSelected ? 'font-semibold text-primary' : 'text-on-surface'}`}>
                    {tag.name}
                  </span>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => void handleDeleteTag(tag.tagId, e)}
                    className="shrink-0 rounded-md p-1 text-on-surface-variant opacity-0 transition-all hover:bg-error/10 hover:text-error group-hover:opacity-100"
                    title={t('conversation.deleteTag')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-surface-container-highest px-sm py-xs">
        {isCreating ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-black/5"
                style={{ backgroundColor: selectedColor }}
              />
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreateTag()
                  if (e.key === 'Escape') setIsCreating(false)
                }}
                placeholder={t('conversation.newTagPlaceholder')}
                className="flex-1 rounded-md border border-outline-variant/60 bg-transparent px-2 py-[5px] text-[12px] outline-none transition-colors focus:border-primary"
                autoFocus
              />
              <button
                type="button"
                onClick={() => void handleCreateTag()}
                disabled={!newTagName.trim()}
                className="rounded-md bg-primary px-2.5 py-[5px] text-[11px] font-medium text-white transition-colors hover:bg-primary-dim disabled:opacity-40"
              >
                {t('common.confirm')}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-md p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-[6px] pl-[18px]">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-full transition-all ${
                    selectedColor === color ? 'scale-110 ring-2 ring-offset-1 ring-primary/30' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && (
                    <Check className="h-2.5 w-2.5 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-[6px] text-[12px] font-medium text-primary transition-colors hover:bg-primary/5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('conversation.createTag')}</span>
          </button>
        )}
      </div>
    </div>
  )
}
