import { Header } from "@/components/header/mobile"
import { Music, History, Users, Cloud, Shield, Zap, Database, Smartphone } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: Music,
    title: "Biblioteca de Músicas",
    description: "Acesse milhares de músicas organizadas por título, artista e código. Busque rapidamente e encontre suas músicas favoritas.",
  },
  {
    icon: History,
    title: "Histórico Completo",
    description: "Acompanhe todas as músicas executadas com data e hora. Visualize estatísticas e tendências do seu karaokê.",
  },
  {
    icon: Users,
    title: "Gestão de Usuários",
    description: "Sistema completo de administração para gerenciar usuários, permissões e assinaturas de forma simples e eficiente.",
  },
  {
    icon: Cloud,
    title: "Sincronização em Nuvem",
    description: "Sincronize seus dados entre dispositivos. Acesse suas músicas e histórico de qualquer lugar.",
  },
  {
    icon: Shield,
    title: "Segurança e Privacidade",
    description: "Seus dados estão protegidos com criptografia e autenticação segura. Conformidade com LGPD.",
  },
  {
    icon: Zap,
    title: "Performance Otimizada",
    description: "Interface rápida e responsiva. Busca instantânea e navegação fluida mesmo com milhares de músicas.",
  },
  {
    icon: Database,
    title: "Armazenamento Inteligente",
    description: "Armazene suas músicas de forma organizada. Suporte para múltiplos formatos de áudio.",
  },
  {
    icon: Smartphone,
    title: "Multiplataforma",
    description: "Acesse via web ou use nosso aplicativo desktop. Funciona offline e online, sempre disponível.",
  },
]

export default function RecursosMobile() {
  return (
    <main className="relative min-h-screen w-full bg-gradient-to-b from-black via-gray-900 to-black">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            Recursos
          </h1>
          <p className="text-base text-gray-300 mb-6">
            Descubra todas as funcionalidades que fazem do Blue Karaokês a melhor solução para seu negócio
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <div className="mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#409fff]/20 flex items-center justify-center group-hover:bg-[#409fff]/30 transition-colors">
                      <Icon className="h-5 w-5 text-[#409fff]" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 pb-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-[#409fff]/20 to-[#3090f0]/20 border border-[#409fff]/30 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-3">
              Pronto para começar?
            </h2>
            <p className="text-gray-300 text-sm mb-6">
              Experimente todas essas funcionalidades agora mesmo
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/cadastro" className="w-full">
                <Button size="lg" className="w-full bg-[#409fff] hover:bg-[#3090f0] text-white">
                  Criar Conta
                </Button>
              </Link>
              <Link href="/login" className="w-full">
                <Button size="lg" variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                  Fazer Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

