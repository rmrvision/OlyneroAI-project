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
    <div className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-16 pt-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-sm font-semibold">
              O
            </div>
            <div className="text-lg font-semibold tracking-tight">OlyneroAI</div>
          </div>
          <nav className="flex items-center gap-3 text-sm text-muted-foreground">
            <Link className="hover:text-foreground" href="/login">
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
              v0.1 · Любой landing или CRUD
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              OlyneroAI — генератор веб‑приложений в стиле крупных LLM.
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              Опишите задачу простыми словами: «landing» или «crud customers(name, phone)». Мы
              соберём проект, покажем превью и дадим zip‑артефакт.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Создать аккаунт</Link>
              </Button>
            </div>
            <div className="grid gap-3 pt-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                <p className="text-sm font-medium">Поток работы</p>
                <p className="text-sm text-muted-foreground">
                  Чат → спецификация → сборка → превью → zip.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                <p className="text-sm font-medium">Безопасная сборка</p>
                <p className="text-sm text-muted-foreground">
                  Изолированный runner на Docker с лимитами ресурсов.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle className="text-base">Что можно сгенерировать</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="mt-1 size-2 rounded-full bg-primary/70" />
                  <div>
                    <p className="text-foreground">Landing</p>
                    <p>Герой‑блок, ценности, CTA, блоки преимуществ.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 size-2 rounded-full bg-primary/70" />
                  <div>
                    <p className="text-foreground">CRUD</p>
                    <p>Таблица, создание, редактирование, удаление через Supabase.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle className="text-base">Как начать</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>1. Зарегистрируйтесь или войдите.</p>
                <p>2. Создайте проект.</p>
                <p>3. В чате опишите landing или crud.</p>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
