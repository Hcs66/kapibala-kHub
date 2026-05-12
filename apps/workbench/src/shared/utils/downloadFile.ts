export async function downloadFile(url: string, filename?: string): Promise<void> {
  const response = await fetch(url)
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename ?? extractFilename(url)
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)
}

function extractFilename(url: string): string {
  try {
    const pathname = new URL(url, window.location.origin).pathname
    const segments = pathname.split('/')
    const last = segments[segments.length - 1]
    return last || 'image.png'
  } catch {
    return 'image.png'
  }
}
