import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, User, Building2, MessageSquare, X } from 'lucide-react'
import { apiClient } from '@/shared/api'
import type { PersonDTO, OrganizationDTO, ConversationDTO } from '@/shared/api/types'

interface GlobalSearchProps {
  onSelectConversation?: (conversationId: string) => void
  onSelectPerson?: (personId: string) => void
  onSelectOrganization?: (organizationId: string) => void
}

export function GlobalSearch({ onSelectConversation, onSelectPerson, onSelectOrganization }: GlobalSearchProps): React.ReactElement {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [persons, setPersons] = useState<PersonDTO[]>([])
  const [organizations, setOrganizations] = useState<OrganizationDTO[]>([])
  const [conversations, setConversations] = useState<ConversationDTO[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setPersons([])
      setOrganizations([])
      setConversations([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(() => {
      void apiClient.globalSearch({ query: value.trim(), limit: 5 }).then((result) => {
        setPersons(result.persons)
        setOrganizations(result.organizations)
        setConversations(result.conversations)
        setLoading(false)
      })
    }, 300)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value
    setQuery(value)
    handleSearch(value)
  }

  const handleFocus = (): void => {
    setOpen(true)
  }

  const handleClear = (): void => {
    setQuery('')
    setPersons([])
    setOrganizations([])
    setConversations([])
    setOpen(false)
  }

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  const hasResults = persons.length > 0 || organizations.length > 0 || conversations.length > 0
  const showDropdown = open && query.trim().length > 0

  return (
    <div ref={containerRef} className="relative flex max-w-[480px] flex-1 items-center justify-center">
      <div className="flex w-full items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-sm py-[7px] transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-glow">
        <Search className="h-4 w-4 shrink-0 text-outline-variant" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={t('search.placeholder')}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-outline-variant"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-lg right-lg top-full z-50 mt-1 max-h-[400px] overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-elevated">
          {loading && (
            <div className="px-md py-sm text-center text-xs text-muted-foreground">
              {t('common.loading')}
            </div>
          )}

          {!loading && !hasResults && (
            <div className="px-md py-lg text-center text-sm text-muted-foreground">
              {t('search.noResults')}
            </div>
          )}

          {!loading && persons.length > 0 && (
            <div className="border-b border-surface-container-highest py-xs">
              <div className="px-md py-[4px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('search.persons')}
              </div>
              {persons.map((person) => (
                <button
                  key={person.personId}
                  type="button"
                  onClick={() => {
                    onSelectPerson?.(person.personId)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-sm px-md py-[8px] text-left transition-colors hover:bg-surface-container-low"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{person.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {person.email ?? person.location ?? person.source}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {t('person.conversations', { count: person.conversationCount })}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && organizations.length > 0 && (
            <div className="border-b border-surface-container-highest py-xs">
              <div className="px-md py-[4px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('search.organizations')}
              </div>
              {organizations.map((org) => (
                <button
                  key={org.organizationId}
                  type="button"
                  onClick={() => {
                    onSelectOrganization?.(org.organizationId)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-sm px-md py-[8px] text-left transition-colors hover:bg-surface-container-low"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{org.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {[org.industry, org.country].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {t('organization.persons', { count: org.personCount })}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && conversations.length > 0 && (
            <div className="py-xs">
              <div className="px-md py-[4px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('search.conversations')}
              </div>
              {conversations.map((conv) => (
                <button
                  key={conv.conversationId}
                  type="button"
                  onClick={() => {
                    onSelectConversation?.(conv.conversationId)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-sm px-md py-[8px] text-left transition-colors hover:bg-surface-container-low"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{conv.customerDisplayName}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{conv.lastMessageText}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
