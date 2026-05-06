import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface MessageInputProps {
  disabled?: boolean
  onSend: (text: string) => void
  onTextChange?: (text: string) => void
  externalText?: string
}

export function MessageInput({ disabled, onSend, onTextChange, externalText }: MessageInputProps): React.ReactElement {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus()
    }
  }, [disabled])

  useEffect(() => {
    if (externalText !== undefined && externalText !== text) {
      setText(externalText)
    }
  }, [externalText])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${String(Math.min(el.scrollHeight, 100))}px`
  }, [text])

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
    onTextChange?.('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const trimmed = text.trim()
      if (!trimmed) return
      onSend(trimmed)
      setText('')
      onTextChange?.('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="shrink-0 border-t border-surface-container-highest bg-surface-bright p-md">
      <div className="flex items-end gap-sm">
        <button
          type="button"
          disabled={disabled}
          className="p-2 text-outline-variant transition-colors hover:text-primary disabled:opacity-50"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center rounded-lg border border-outline-variant bg-surface-container-lowest p-[2px] transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-glow">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              onTextChange?.(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? t('message.inputDisabledPlaceholder') : t('message.inputPlaceholder')}
            disabled={disabled}
            rows={1}
            className="custom-scrollbar max-h-[100px] w-full resize-none border-none bg-transparent px-3 py-2 text-[14px] text-foreground outline-none placeholder:text-outline-variant disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary-dim active:scale-95 disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </form>
  )
}
