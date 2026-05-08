import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Filter, Clock, Check, User, Building2 } from 'lucide-react'
import { useTagStore } from '@/stores/tagStore'
import { useConversationStore } from '@/stores/conversationStore'
import type { PersonDTO, OrganizationDTO } from '@/shared/api/types'

type ActiveFilterRange = 'all' | '24h' | '3d' | '1w' | '1m'

const RANGE_OPTIONS: Array<{ key: ActiveFilterRange; labelKey: string }> = [
  { key: 'all', labelKey: 'filter.rangeAll' },
  { key: '24h', labelKey: 'filter.range24h' },
  { key: '3d', labelKey: 'filter.range3d' },
  { key: '1w', labelKey: 'filter.range1w' },
  { key: '1m', labelKey: 'filter.range1m' },
]

interface FilterPopoverProps {
  open: boolean
  onClose: () => void
  persons: PersonDTO[]
  organizations: OrganizationDTO[]
  personFilter: string
  orgFilter: string
  onPersonFilterChange: (id: string) => void
  onOrgFilterChange: (id: string) => void
}

export function FilterPopover({
  open,
  onClose,
  persons,
  organizations,
  personFilter,
  orgFilter,
  onPersonFilterChange,
  onOrgFilterChange,
}: FilterPopoverProps): React.ReactElement | null {
  const { t } = useTranslation()
  const popoverRef = useRef<HTMLDivElement>(null)
  const tags = useTagStore((s) => s.tags)
  const activeFilterRange = useConversationStore((s) => s.activeFilterRange)
  const selectedTagIds = useConversationStore((s) => s.selectedTagIds)
  const setActiveFilterRange = useConversationStore((s) => s.setActiveFilterRange)
  const toggleTag = useConversationStore((s) => s.toggleTag)

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
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, handleClickOutside])

  if (!open) return null

  return (
    <div
      ref={popoverRef}
      className="absolute left-sm right-sm top-full z-50 mt-1 animate-slide-up rounded-xl border border-outline-variant bg-surface-container-lowest shadow-elevated"
    >
      <div className="divide-y divide-surface-container-highest">
        <div className="p-sm">
          <p className="mb-[6px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('filter.timeRange')}
          </p>
          <div className="flex flex-wrap gap-[5px]">
            {RANGE_OPTIONS.map((opt) => {
              const isActive = activeFilterRange === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setActiveFilterRange(opt.key)}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-[5px] text-[11px] font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'border border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant hover:border-primary/30'
                  }`}
                >
                  {opt.key !== 'all' && <Clock className="h-3 w-3" />}
                  <span>{t(opt.labelKey)}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-sm">
          <div className="mb-[6px] flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('conversation.assignTags')}
            </p>
          </div>
          <div className="flex flex-wrap gap-[5px]">
            {tags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.tagId)
              return (
                <button
                  key={tag.tagId}
                  type="button"
                  onClick={() => toggleTag(tag.tagId)}
                  className={`flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'shadow-sm'
                      : 'border border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant hover:border-primary/30'
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
                  {isSelected && <Check className="h-2.5 w-2.5" />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-sm">
          <p className="mb-[6px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('person.filterByPerson')}
          </p>
          <div className="flex items-center gap-[6px]">
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <select
              value={personFilter}
              onChange={(e) => onPersonFilterChange(e.target.value)}
              className="flex-1 truncate rounded-md border border-outline-variant/50 bg-surface-container-low px-2 py-[5px] text-[11px] font-medium text-on-surface-variant outline-none focus:border-primary"
            >
              <option value="">{t('person.allPersons')}</option>
              {persons.map((p) => (
                <option key={p.personId} value={p.personId}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-sm">
          <p className="mb-[6px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('organization.filterByOrg')}
          </p>
          <div className="flex items-center gap-[6px]">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <select
              value={orgFilter}
              onChange={(e) => onOrgFilterChange(e.target.value)}
              className="flex-1 truncate rounded-md border border-outline-variant/50 bg-surface-container-low px-2 py-[5px] text-[11px] font-medium text-on-surface-variant outline-none focus:border-primary"
            >
              <option value="">{t('organization.allOrganizations')}</option>
              {organizations.map((o) => (
                <option key={o.organizationId} value={o.organizationId}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FilterTriggerProps {
  activeCount: number
  onClick: () => void
}

export function FilterTrigger({ activeCount, onClick }: FilterTriggerProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg transition-colors ${
        activeCount > 0
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-surface-container-low hover:text-foreground'
      }`}
    >
      <Filter className="h-3.5 w-3.5" />
      {activeCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-[3px] text-[9px] font-bold leading-none text-white">
          {activeCount}
        </span>
      )}
    </button>
  )
}
