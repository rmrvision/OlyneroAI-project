import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";

export default async function LandingPage() {
  const user = await getSessionUser();
  const primaryHref = user ? "/app" : "/login";
  const primaryLabel = user
    ? "Перейти в рабочее пространство"
    : "Войти и начать";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-0 h-64 w-64 rounded-full bg-sky-500/20 blur-[120px]" />
        <div className="absolute -bottom-32 left-0 h-64 w-64 rounded-full bg-indigo-500/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 pb-20 pt-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white">
              O
            </div>
            <div className="text-lg font-semibold tracking-tight text-white">
              OlyneroAI
            </div>
          </div>
          <nav className="flex items-center gap-3 text-sm text-white/70">
            <Link className="hover:text-white" href="/login">
              Войти
            </Link>
            <Button asChild size="sm">
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
          </nav>
        </header>

        <main className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="flex flex-col gap-6">
            <Badge className="w-fit" variant="secondary">
              OlyneroAI Studio · v0.1
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              Премиальный app builder с логикой крупных LLM.
            </h1>
            <p className="text-base text-white/70 md:text-lg">
              Опишите задачу простыми словами, и OlyneroAI сгенерирует проект,
              соберёт его в изолированном runner, покажет превью и выдаст zip‑архив.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Создать аккаунт</Link>
              </Button>
            </div>
            <div className="grid gap-3 pt-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Шаблоны
                </p>
                <p className="mt-2 text-sm text-white">
                  Landing, CRUD на Supabase
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Сборка
                </p>
                <p className="mt-2 text-sm text-white">
                  Docker runner с лимитами
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Артефакты
                </p>
                <p className="mt-2 text-sm text-white">
                  Превью + zip для скачивания
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-base text-white">
                  Что можно сгенерировать
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/70">
                <div className="flex items-start gap-3">
                  <div className="mt-1 size-2 rounded-full bg-sky-400" />
                  <div>
                    <p className="text-white">Landing</p>
                    <p>Герой‑блок, преимущества, CTA, блоки доверия.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 size-2 rounded-full bg-indigo-400" />
                  <div>
                    <p className="text-white">CRUD</p>
                    <p>Список, создание, редактирование, удаление через Supabase.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-base text-white">Как это работает</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/70">
                <p>1. Вводите запрос в чат.</p>
                <p>2. AI формирует спецификацию проекта.</p>
                <p>3. Runner собирает и публикует превью.</p>
              </CardContent>
            </Card>
          </section>
        </main>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-base text-white">Единая среда</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-white/70">
              Управляйте проектами, сборками и превью в одном интерфейсе без
              переключения между сервисами.
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-base text-white">Прозрачные логи</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-white/70">
              Статусы, логи, артефакты и ссылки на превью сохраняются для каждого
              запуска.
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-base text-white">Контроль доступа</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-white/70">
              RLS в Supabase ограничивает доступ к проектам и сборкам только
              владельцами и администраторами.
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
