import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Условия сервиса OlyneroAI</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Последнее обновление: 21 февраля 2026
      </p>
      <div className="mt-8 space-y-6 text-base text-muted-foreground">
        <p>
          OlyneroAI предоставляет сервис генерации веб‑приложений. Используя
          платформу, вы подтверждаете, что имеете право размещать и обрабатывать
          вводимые данные.
        </p>
        <p>
          Вы несёте ответственность за содержимое проектов и за соблюдение
          применимого законодательства. Сервис предоставляется «как есть», без
          гарантий бесперебойной работы.
        </p>
        <p>
          Мы можем обновлять условия, публикуя новую версию на этой странице.
          Продолжая использование, вы соглашаетесь с актуальной редакцией.
        </p>
        <p>
          Вопросы по условиям: <Link href="mailto:support@olynero.com">support@olynero.com</Link>.
        </p>
      </div>
    </div>
  );
}
