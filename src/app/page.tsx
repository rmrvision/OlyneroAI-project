import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { ArrowRight, Sparkles, Zap, Shield, Globe } from "lucide-react";

export default async function LandingPage() {
  const user = await getSessionUser();
  const primaryHref = user ? "/app" : "/login";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Gradient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[40%] left-[20%] h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-[30%] right-[10%] h-[400px] w-[400px] rounded-full bg-blue-600/8 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[500px] rounded-full bg-violet-800/8 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/5 bg-black/20 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-xs font-bold">
              O
            </div>
            <span className="text-base font-semibold tracking-tight">OlyneroAI</span>
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-400">
              beta
            </span>
          </div>
          <nav className="flex items-center gap-3">
            {user ? (
              <Button asChild size="sm" className="bg-white text-black hover:bg-white/90">
                <Link href="/app">
                  Открыть студию
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-white/70 hover:text-white">
                  <Link href="/login">Войти</Link>
                </Button>
                <Button asChild size="sm" className="bg-white text-black hover:bg-white/90">
                  <Link href="/login">
                    Начать бесплатно
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="relative mx-auto max-w-7xl px-6">
        {/* Hero section */}
        <section className="flex flex-col items-center py-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
            <Sparkles className="h-3.5 w-3.5" />
            Российский аналог Lovable · Работает на GPT-4o
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
            Создавайте приложения
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              словами, не кодом
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/50 md:text-xl">
            Опишите задачу — OlyneroAI сгенерирует полноценное React-приложение с
            Tailwind CSS, соберёт его и покажет живое превью прямо в браузере.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 bg-white px-8 text-base text-black hover:bg-white/90"
            >
              <Link href={primaryHref}>
                {user ? "Открыть студию" : "Попробовать бесплатно"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Demo prompt examples */}
          <div className="mt-12 flex flex-wrap justify-center gap-2">
            {[
              "Лендинг для стартапа по доставке",
              "CRM для управления клиентами",
              "Портфолио фотографа",
              "Форма заявки для юридической фирмы",
            ].map((example) => (
              <Link
                key={example}
                href={primaryHref}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm text-white/60 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                {example}
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">Как это работает</h2>
            <p className="mt-2 text-white/40">Три шага от идеи до живого приложения</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Опишите приложение",
                desc: "Напишите что хотите создать в чате. Чем подробнее — тем лучше результат.",
                color: "from-violet-500/20 to-violet-600/5",
                border: "border-violet-500/20",
              },
              {
                step: "02",
                title: "AI генерирует код",
                desc: "GPT-4o создаёт полноценные React-компоненты с красивым Tailwind-дизайном.",
                color: "from-blue-500/20 to-blue-600/5",
                border: "border-blue-500/20",
              },
              {
                step: "03",
                title: "Смотрите превью",
                desc: "Приложение собирается и открывается прямо в браузере. Итерируйте в чате.",
                color: "from-emerald-500/20 to-emerald-600/5",
                border: "border-emerald-500/20",
              },
            ].map(({ step, title, desc, color, border }) => (
              <div
                key={step}
                className={`rounded-2xl border ${border} bg-gradient-to-b ${color} p-6`}
              >
                <div className="mb-4 text-3xl font-bold text-white/10">{step}</div>
                <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                <p className="text-sm text-white/50">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: "Быстро",
                desc: "Первый результат за 1–3 минуты",
              },
              {
                icon: Sparkles,
                title: "GPT-4o",
                desc: "Лучшая модель для генерации кода",
              },
              {
                icon: Globe,
                title: "Живое превью",
                desc: "Iframe прямо в интерфейсе",
              },
              {
                icon: Shield,
                title: "Изоляция",
                desc: "Docker sandbox для каждой сборки",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/5 bg-white/3 p-5"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/8">
                  <Icon className="h-4.5 w-4.5 text-white/70" />
                </div>
                <h3 className="mb-1 text-sm font-semibold">{title}</h3>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-20 rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/10 to-transparent p-12 text-center">
          <h2 className="text-3xl font-bold">Готовы попробовать?</h2>
          <p className="mt-3 text-white/50">
            Создайте первое приложение прямо сейчас. Бесплатно.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 h-12 bg-white px-10 text-base text-black hover:bg-white/90"
          >
            <Link href={primaryHref}>
              {user ? "Перейти в студию" : "Начать бесплатно"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-white/25">
          © 2025 OlyneroAI · Российский аналог Lovable
        </div>
      </footer>
    </div>
  );
}
