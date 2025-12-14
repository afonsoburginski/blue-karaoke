import { TermsCard } from "@/components/terms-card"
import { Header } from "@/components/header"

export default function Home() {
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

      {/* Watermark */}
      <div className="absolute bottom-4 right-4 z-10 text-xs text-white/80">BLUE KARAOKÊS</div>
    </main>
  )
}
