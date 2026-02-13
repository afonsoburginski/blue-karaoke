import type { FC } from "react"
import { QRCodeSVG } from "qrcode.react"

export interface QrCodeProps {
  value: string
  label?: string
  imageSrc?: string
  /** Modo máquina: QR e rótulo maiores */
  large?: boolean
}

export function QrCode({ value, label, imageSrc, large }: QrCodeProps) {
  const qrSize = large ? 220 : 165
  const qrContent = imageSrc ? (
    <img
      src={imageSrc}
      alt={label ?? "QR Code"}
      width={qrSize}
      height={qrSize}
      className="block"
      style={{ width: qrSize, height: qrSize }}
    />
  ) : (
    <QRCodeSVG
      value={value}
      size={qrSize}
      level="M"
      marginSize={large ? 4 : 3}
      bgColor="#FFFFFF"
      fgColor="#000000"
      className="block"
      style={{ width: qrSize, height: qrSize, minWidth: qrSize, minHeight: qrSize }}
    />
  )

  return (
    <div className={`rounded-xl overflow-hidden shadow-md border border-stone-300 bg-white flex flex-col items-center gap-1 ${large ? "p-3 border-2" : "p-2"}`}>
      {label && (
        <p className={large ? "text-2xl font-bold text-stone-600 text-center" : "text-lg font-bold text-stone-600 text-center"}>
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

export interface QrCodesHomeProps {
  modoMaquina?: boolean
}

export const QrCodesHome: FC<QrCodesHomeProps> = ({ modoMaquina }) => {
  return (
    <div className={`flex flex-row items-center ${modoMaquina ? "gap-6" : "gap-3"}`}>
      <QrCode value={CATALOGO_URL} label="Catálogo" large={modoMaquina} />
      <QrCode value={INSTAGRAM_URL} label="Instagram" large={modoMaquina} />
    </div>
  )
}
