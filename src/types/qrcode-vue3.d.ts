import type { DefineComponent } from 'vue'

export interface QRCodeVue3Props {
  value?: string
  width?: number
  height?: number
  qrOptions?: {
    typeNumber?: number
    mode?: 'Numeric' | 'Alphanumeric' | 'Byte' | 'Kanji'
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  }
  imageOptions?: {
    hideBackgroundDots?: boolean
    imageSize?: number
    margin?: number
    crossOrigin?: 'anonymous' | 'use-credentials'
  }
  dotsOptions?: {
    type?: 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded'
    color?: string
    gradient?: Record<string, unknown>
  }
  backgroundOptions?: { color?: string; gradient?: Record<string, unknown> }
  cornersSquareOptions?: { type?: string; color?: string }
  cornersDotOptions?: { type?: string; color?: string }
  download?: boolean
  downloadButton?: string
  downloadOptions?: { name?: string; extension?: 'png' | 'jpg' | 'webp' }
  myclass?: string
  imgclass?: string
  fileExt?: string
}

declare module 'qrcode-vue3' {
  const QRCodeVue3: DefineComponent<QRCodeVue3Props>
  export default QRCodeVue3
}
