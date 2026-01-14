import { TermsCard } from "@/components/terms-card/mobile"
import { Header } from "@/components/header/mobile"
import { DownloadButtons } from "@/components/download-buttons"

export default function HomeMobile() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat bg-center"
        style={{
          backgroundImage: `url('/images/karaoke-bg.jpg')`,
          backgroundPosition: "center center",
        }}
      />

      {/* Header */}
      <Header />

      {/* Terms Card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pt-16 pb-8">
        <TermsCard />
      </div>

      {/* Download Buttons - Canto inferior direito */}
      <div className="absolute right-4 bottom-16 z-20">
        <DownloadButtons />
      </div>

      <div className="absolute bottom-2 right-2 z-10 text-[10px] text-white/80">BLUE KARAOKÊS</div>
    </main>
  )
}

