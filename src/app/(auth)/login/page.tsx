import { LoginForm } from "@/components/login-form";
import { Badge } from "@/components/ui/badge";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[]; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = (await searchParams) ?? {};
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-0 h-64 w-64 rounded-full bg-sky-500/20 blur-[120px]" />
        <div className="absolute -bottom-32 left-0 h-64 w-64 rounded-full bg-indigo-500/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <div className="space-y-6">
          <Badge className="w-fit" variant="secondary">
            OlyneroAI Studio · v0.1
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">
            Премиальный конструктор приложений с UX как у крупных LLM.
          </h1>
          <p className="text-base text-white/70 md:text-lg">
            Опишите задачу: landing или CRUD. Мы соберём проект, покажем превью
            и выдадим zip‑артефакт.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-white">
                Изолированные сборки
              </p>
              <p className="text-sm text-white/70">
                Runner в Docker с лимитами ресурсов.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-white">Прозрачные логи</p>
              <p className="text-sm text-white/70">
                Сборка и артефакты прямо в интерфейсе.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/40">
          <LoginForm
            error={error ? String(error) : undefined}
            callbackUrl={callbackUrl}
          />
        </div>
      </div>
    </div>
  );
}
