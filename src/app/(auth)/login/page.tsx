import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[]; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = (await searchParams) ?? {};

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[30%] left-[30%] h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-blue-600/8 blur-[100px]" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-xl font-bold">
              O
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold">OlyneroAI</h1>
              <p className="text-sm text-white/40">Создавайте приложения словами</p>
            </div>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-white/8 bg-white/4 p-6 shadow-2xl backdrop-blur-sm">
            <LoginForm
              error={error ? String(error) : undefined}
              callbackUrl={callbackUrl}
            />
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-white/25">
            Продолжая, вы соглашаетесь с{" "}
            <a href="/terms" className="text-white/40 hover:text-white/60 underline underline-offset-2">условиями</a>
            {" "}и{" "}
            <a href="/privacy" className="text-white/40 hover:text-white/60 underline underline-offset-2">политикой</a>
          </p>
        </div>
      </div>
    </div>
  );
}
