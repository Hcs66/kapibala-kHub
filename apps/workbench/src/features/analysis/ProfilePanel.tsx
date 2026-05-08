import { useTranslation } from 'react-i18next'
import { User, Building2, Tag, Phone, Mail, Globe, Clock, MapPin, Languages } from 'lucide-react'
import type { CustomerProfileDTO } from '@/shared/api/types'

interface ProfilePanelProps {
  profile: CustomerProfileDTO | null
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString()
}

export function ProfilePanel({ profile }: ProfilePanelProps): React.ReactElement {
  const { t } = useTranslation()

  if (!profile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
        <User className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{t('sidebar.profile.noProfile')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-soft">
        <div className="mb-sm flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <h3 className="text-[13px] font-semibold text-foreground">{t('sidebar.profile.person')}</h3>
        </div>
        <div className="mb-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-[14px] font-bold text-primary">
            {profile.person.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">{profile.person.name}</p>
            {profile.person.source && (
              <p className="text-[11px] text-on-surface-variant">{profile.person.source}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {profile.person.phone && (
            <InfoRow icon={<Phone className="h-3 w-3" />} label={t('sidebar.profile.phone')} value={profile.person.phone} />
          )}
          {profile.person.email && (
            <InfoRow icon={<Mail className="h-3 w-3" />} label={t('sidebar.profile.email')} value={profile.person.email} />
          )}
          {profile.person.language && (
            <InfoRow icon={<Languages className="h-3 w-3" />} label={t('sidebar.profile.language')} value={profile.person.language.toUpperCase()} />
          )}
          {profile.person.timezone && (
            <InfoRow icon={<Clock className="h-3 w-3" />} label={t('sidebar.profile.timezone')} value={profile.person.timezone} />
          )}
          {profile.person.location && (
            <InfoRow icon={<MapPin className="h-3 w-3" />} label={t('sidebar.profile.location')} value={profile.person.location} />
          )}
          {profile.person.firstContactAtMs && (
            <InfoRow icon={<Clock className="h-3 w-3" />} label={t('sidebar.profile.firstContact')} value={formatDate(profile.person.firstContactAtMs)} />
          )}
        </div>
      </div>

      {profile.company && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-soft">
          <div className="mb-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-tertiary" />
            <h3 className="text-[13px] font-semibold text-foreground">{t('sidebar.profile.company')}</h3>
          </div>
          <p className="mb-2 text-[13px] font-semibold text-foreground">{profile.company.name}</p>
          <div className="flex flex-col gap-1.5">
            {profile.company.industry && (
              <InfoRow icon={<Building2 className="h-3 w-3" />} label={t('sidebar.profile.industry')} value={profile.company.industry} />
            )}
            {profile.company.size && (
              <InfoRow icon={<User className="h-3 w-3" />} label={t('sidebar.profile.companySize')} value={profile.company.size} />
            )}
            {profile.company.website && (
              <InfoRow icon={<Globe className="h-3 w-3" />} label={t('sidebar.profile.website')} value={profile.company.website} />
            )}
            {profile.company.country && (
              <InfoRow icon={<MapPin className="h-3 w-3" />} label={t('sidebar.profile.country')} value={profile.company.country} />
            )}
            {profile.company.annualRevenue && (
              <InfoRow icon={<Building2 className="h-3 w-3" />} label={t('sidebar.profile.annualRevenue')} value={profile.company.annualRevenue} />
            )}
          </div>
        </div>
      )}

      {profile.tags.length > 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-soft">
          <div className="mb-sm flex items-center gap-2">
            <Tag className="h-4 w-4 text-secondary" />
            <h3 className="text-[13px] font-semibold text-foreground">{t('sidebar.profile.tags')}</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-primary/20 bg-primary-fixed px-2.5 py-0.5 text-[11px] font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[11px] text-on-surface-variant">{label}</span>
      <span className="ml-auto text-[11px] font-medium text-foreground">{value}</span>
    </div>
  )
}
