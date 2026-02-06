import { QRCodeSVG } from "qrcode.react"

export interface QrCodeProps {
  value: string
  label?: string
  imageSrc?: string
}

export function QrCode({ value, label, imageSrc }: QrCodeProps) {
  const qrContent = imageSrc ? (
    <img
      src={imageSrc}
      alt={label ?? "QR Code"}
      width={140}
      height={140}
      className="block"
    />
  ) : (
    <QRCodeSVG
      value={value}
      size={140}
      level="M"
      marginSize={4}
      bgColor="#FFFFFF"
      fgColor="#000000"
      className="block"
    />
  )

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-stone-300 bg-white p-2 flex flex-col items-center gap-0.5">
      {label && (
        <p className="text-xl font-bold text-stone-600 text-center">
          {label}
        </p>
      )}
      {qrContent}
    </div>
  )
}

/** Dois QR codes da home: Catálogo e Instagram. */
const CATALOGO_URL = "https://www.bluekaraokes.com.br/catalogo"
const INSTAGRAM_URL = "https://www.instagram.com/bluekaraokesinop?igsh=MWJjamM4YjFrbHp3MA%3D%3D"

export function QrCodesHome() {
  return (
    <div className="flex flex-row items-center gap-3">
      <QrCode value={CATALOGO_URL} label="Catálogo" />
      <QrCode value={INSTAGRAM_URL} label="Instagram" />
    </div>
  )
}
