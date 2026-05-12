import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { downloadFile } from '@/shared/utils/downloadFile'

interface ImagePreviewProps {
  src: string
  alt?: string
  open: boolean
  onClose: () => void
}

export function ImagePreview({ src, alt, open, onClose }: ImagePreviewProps): React.ReactElement | null {
  const { t } = useTranslation()
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (open) {
      setScale(1)
      setRotation(0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') setScale((s) => Math.min(s + 0.25, 4))
      if (e.key === '-') setScale((s) => Math.max(s - 0.25, 0.25))
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.25, 4))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.25, 0.25))
  }, [])

  const handleRotate = useCallback(() => {
    setRotation((r) => r + 90)
  }, [])

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      await downloadFile(src)
    } finally {
      setDownloading(false)
    }
  }, [src])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setScale((s) => Math.min(s + 0.1, 4))
    } else {
      setScale((s) => Math.max(s - 0.1, 0.25))
    }
  }, [])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onWheel={handleWheel}
      role="dialog"
      aria-modal="true"
      aria-label={alt ?? t('message.imagePreview')}
    >
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label={t('message.zoomOut')}
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <span className="min-w-[48px] text-center text-sm text-white/80">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={handleZoomIn}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label={t('message.zoomIn')}
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleRotate}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label={t('message.rotate')}
        >
          <RotateCw className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={downloading}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
          aria-label={t('message.download')}
        >
          <Download className={`h-5 w-5 ${downloading ? 'animate-pulse' : ''}`} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label={t('common.cancel')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <img
        src={src}
        alt={alt ?? ''}
        className="max-h-[85vh] max-w-[85vw] select-none rounded-lg object-contain transition-transform duration-200"
        style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
        draggable={false}
      />
    </div>,
    document.body,
  )
}
