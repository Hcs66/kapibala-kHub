import { useState, useEffect, useCallback } from 'react'
import { Languages, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { mockClient } from '@/shared/api/mockClient'

interface TranslatePreviewProps {
  text: string
  targetLang: string
  onConfirmSend: (originalText: string, translatedText: string) => void
}

export function TranslatePreview({ text, targetLang, onConfirmSend }: TranslatePreviewProps): React.ReactElement | null {
  const { t } = useTranslation()
  const [translatedText, setTranslatedText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!text.trim()) {
      setTranslatedText('')
      return
    }

    setLoading(true)
    const timer = setTimeout(() => {
      void mockClient
        .translatePreview({ text, sourceLang: 'zh-CN', targetLang })
        .then((result) => {
          setTranslatedText(result.translatedText)
        })
        .finally(() => setLoading(false))
    }, 500)

    return () => {
      clearTimeout(timer)
      setLoading(false)
    }
  }, [text, targetLang])

  const handleConfirm = useCallback(() => {
    onConfirmSend(text, translatedText)
  }, [text, translatedText, onConfirmSend])

  if (!text.trim()) return null

  return (
    <div className="shrink-0 border-t border-surface-container-highest bg-surface-container-low px-md py-sm">
      <div className="relative rounded-lg border border-outline-variant/40 bg-surface-container-low p-sm">
        <div className="absolute right-2 top-2">
          <span className="rounded bg-primary-container/10 px-2 py-1 text-[10px] font-semibold text-primary">
            {t('translate.targetLang')}: {targetLang.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Languages className="h-3.5 w-3.5" />
          <span>{t('translate.preview')}</span>
        </div>
        <p className="mb-2 mt-1.5 min-h-[20px] text-[13px] text-on-surface-variant">{text}</p>
        <div className="border-t border-outline-variant/30 pt-2">
          {loading ? (
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-[13px] text-muted-foreground">{t('translate.translating')}</span>
            </div>
          ) : translatedText ? (
            <p className="text-[13px] font-medium text-primary">{translatedText}</p>
          ) : null}
        </div>
      </div>
      {translatedText && !loading && (
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-sm rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-dim active:scale-95"
        >
          {t('translate.confirmSend')}
        </button>
      )}
    </div>
  )
}
