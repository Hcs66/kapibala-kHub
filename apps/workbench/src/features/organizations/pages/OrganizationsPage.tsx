import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Globe, Users, MessageSquare } from 'lucide-react'
import { apiClient } from '@/shared/api'
import type { OrganizationDTO } from '@/shared/api/types'

export function OrganizationsPage(): React.ReactElement {
  const { t } = useTranslation()
  const [organizations, setOrganizations] = useState<OrganizationDTO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void apiClient.listOrganizations().then((data) => {
      setOrganizations(data)
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

  if (organizations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <Building2 className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('organization.noOrganizations')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-lg">
      <div className="mb-lg flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{t('organization.title')}</h1>
        <span className="text-sm text-muted-foreground">{organizations.length} {t('organization.title')}</span>
      </div>

      <div className="custom-scrollbar grid flex-1 gap-md overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
        {organizations.map((org) => (
          <div
            key={org.organizationId}
            className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-soft transition-shadow hover:shadow-elevated"
          >
            <div className="flex items-center gap-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-sm font-bold text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{org.name}</div>
                {org.industry && (
                  <div className="truncate text-[11px] text-muted-foreground">{org.industry}</div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-[6px] text-[12px] text-on-surface-variant">
              {org.country && (
                <div className="flex items-center gap-[6px]">
                  <Globe className="h-3 w-3 shrink-0" />
                  <span className="truncate">{org.country}</span>
                </div>
              )}
              {org.size && (
                <div className="flex items-center gap-[6px]">
                  <Users className="h-3 w-3 shrink-0" />
                  <span className="truncate">{org.size} {t('organization.size')}</span>
                </div>
              )}
              {org.annualRevenue && (
                <div className="flex items-center gap-[6px]">
                  <span className="h-3 w-3 shrink-0 text-center text-[10px] font-bold">$</span>
                  <span className="truncate">{org.annualRevenue}</span>
                </div>
              )}
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-surface-container-highest pt-sm">
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3" />
                {t('organization.persons', { count: org.personCount })}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {t('organization.conversations', { count: org.conversationCount })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
