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
    <div className="border-t border-border bg-white/78 px-4 py-2.5 backdrop-blur-[16px]">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Languages className="h-3.5 w-3.5" />
        <span>{t('translate.preview')}</span>
      </div>
      <div className="mt-1.5 flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{t('translate.original')}：{text}</p>
        {loading ? (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t('translate.translating')}</span>
          </div>
        ) : translatedText ? (
          <p className="text-xs font-medium">{t('translate.translated')}：{translatedText}</p>
        ) : null}
      </div>
      {translatedText && !loading && (
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-dim"
        >
          {t('translate.confirmSend')}
        </button>
      )}
    </div>
  )
}
