import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Политика конфиденциальности</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Последнее обновление: 21 февраля 2026
      </p>
      <div className="mt-8 space-y-6 text-base text-muted-foreground">
        <p>
          Мы собираем минимальный набор данных для работы сервиса: адрес
          электронной почты, метаданные проектов и историю сборок.
        </p>
        <p>
          Данные используются для аутентификации, хранения проектов и улучшения
          стабильности сервиса. Мы не передаём информацию третьим лицам, кроме
          случаев, предусмотренных законом.
        </p>
        <p>
          Вы можете запросить удаление аккаунта и данных по адресу
          <Link href="mailto:support@olynero.com"> support@olynero.com</Link>.
        </p>
      </div>
    </div>
  );
}
