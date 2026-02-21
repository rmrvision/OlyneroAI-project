import { LoginForm } from "@/components/login-form";
import { Badge } from "@/components/ui/badge";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[]; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = (await searchParams) ?? {};
  return (
    <div className="min-h-screen">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <div className="space-y-6">
          <Badge className="w-fit" variant="secondary">
            OlyneroAI · v0.1
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight text-foreground md:text-4xl">
            Премиальный конструктор приложений с UX как у крупных LLM.
          </h1>
          <p className="text-base text-muted-foreground md:text-lg">
            Опишите задачу: landing или CRUD. Мы соберём проект, покажем превью
            и выдадим zip‑артефакт.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <p className="text-sm font-medium">Изолированные сборки</p>
              <p className="text-sm text-muted-foreground">
                Runner в Docker с лимитами ресурсов.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <p className="text-sm font-medium">Прозрачные логи</p>
              <p className="text-sm text-muted-foreground">
                Сборка и артефакты прямо в интерфейсе.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-lg shadow-black/30">
          <LoginForm
            error={error ? String(error) : undefined}
            callbackUrl={callbackUrl}
          />
        </div>
      </div>
    </div>
  );
}
