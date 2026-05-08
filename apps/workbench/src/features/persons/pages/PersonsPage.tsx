import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Mail, Phone, MapPin, MessageSquare } from 'lucide-react'
import { apiClient } from '@/shared/api'
import type { PersonDTO } from '@/shared/api/types'

export function PersonsPage(): React.ReactElement {
  const { t } = useTranslation()
  const [persons, setPersons] = useState<PersonDTO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void apiClient.listPersons().then((data) => {
      setPersons(data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (persons.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <User className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('person.noPersons')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-lg">
      <div className="mb-lg flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{t('person.title')}</h1>
        <span className="text-sm text-muted-foreground">{persons.length} {t('person.title')}</span>
      </div>

      <div className="custom-scrollbar grid flex-1 gap-md overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
        {persons.map((person) => (
          <div
            key={person.personId}
            className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-soft transition-shadow hover:shadow-elevated"
          >
            <div className="flex items-center gap-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-sm font-bold text-primary">
                {person.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{person.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{person.source}</div>
              </div>
            </div>

            <div className="flex flex-col gap-[6px] text-[12px] text-on-surface-variant">
              {person.email && (
                <div className="flex items-center gap-[6px]">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{person.email}</span>
                </div>
              )}
              {person.phone && (
                <div className="flex items-center gap-[6px]">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span className="truncate">{person.phone}</span>
                </div>
              )}
              {person.location && (
                <div className="flex items-center gap-[6px]">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{person.location}</span>
                </div>
              )}
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-surface-container-highest pt-sm">
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {t('person.conversations', { count: person.conversationCount })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
