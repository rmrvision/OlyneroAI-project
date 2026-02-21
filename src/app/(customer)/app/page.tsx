import { createProject } from "@/actions/olynero-projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default async function WorkspacePage() {
  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="h-full border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-2xl">Создать новый проект</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Опишите landing или CRUD‑приложение. Мы сгенерируем проект, соберём
              его и дадим превью + zip‑артефакт.
            </p>
          </div>
          <form action={createProject} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                Название проекта
              </label>
              <Input
                id="name"
                name="name"
                placeholder="CRM для продаж, лендинг агентства..."
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="description">
                Краткое описание (опционально)
              </label>
              <Textarea
                id="description"
                name="description"
                placeholder="Например: лендинг для AI‑аналитики финансов..."
                rows={4}
              />
            </div>
            <Button type="submit" className="w-full">
              Создать проект
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="text-lg">Готовые форматы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Badge variant="secondary">Landing</Badge>
              <p>Герой‑блок, преимущества, CTA, блоки доверия.</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary">CRUD</Badge>
              <p>Список, создание, редактирование, удаление через Supabase.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="text-lg">Что происходит дальше</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Преобразуем запрос в спецификацию.</p>
            <p>2. Создаём шаблон и запускаем сборку.</p>
            <p>3. Вы получаете превью и zip‑архив.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
