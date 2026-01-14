import { TermsCard } from "@/components/terms-card/desktop"
import { Header } from "@/components/header/desktop"
import { DownloadButtons } from "@/components/download-buttons"

export default function HomeDesktop() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url('/images/karaoke-bg.jpg')`,
          backgroundPosition: "center center",
        }}
      />

      {/* Header */}
      <Header />

      {/* Terms Card */}
      <div className="relative z-10 flex min-h-screen items-center px-6 pt-20 md:px-12 lg:px-20">
        <TermsCard />
      </div>

      {/* Download Buttons - Lado direito */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20">
        <DownloadButtons />
      </div>

      <div className="absolute bottom-4 right-4 z-10 text-xs text-white/80">BLUE KARAOKÊS</div>
    </main>
  )
}

