import { useState, useEffect, useCallback } from 'react'
import { Languages, Loader2 } from 'lucide-react'
import { mockClient } from '@/shared/api/mockClient'

interface TranslatePreviewProps {
  text: string
  targetLang: string
  onConfirmSend: (originalText: string, translatedText: string) => void
}

export function TranslatePreview({ text, targetLang, onConfirmSend }: TranslatePreviewProps): React.ReactElement | null {
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
    <div className="border-t border-border bg-muted/50 px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Languages className="h-3.5 w-3.5" />
        <span>翻译预览</span>
      </div>
      <div className="mt-1.5 flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">原文：{text}</p>
        {loading ? (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">翻译中...</span>
          </div>
        ) : translatedText ? (
          <p className="text-xs font-medium">译文：{translatedText}</p>
        ) : null}
      </div>
      {translatedText && !loading && (
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-2 rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground"
        >
          确认发送
        </button>
      )}
    </div>
  )
}
