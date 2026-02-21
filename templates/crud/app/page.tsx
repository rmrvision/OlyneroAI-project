"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";

const ENTITY_NAME = "__ENTITY_NAME__";
const ENTITY_LABEL = "__ENTITY_LABEL__";
const FIELDS = [
  __ENTITY_FIELDS__
] as const;

type RecordRow = {
  id: string;
} & Record<(typeof FIELDS)[number]["name"], string>;

export default function Page() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const defaultForm = useMemo(() => {
    const initial: Record<string, string> = {};
    for (const field of FIELDS) {
      initial[field.name] = "";
    }
    return initial;
  }, []);

  async function loadRows() {
    setLoading(true);
    const { data, error } = await supabase.from(ENTITY_NAME).select("*");
    if (!error && data) {
      setRows(data as RecordRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    setForm(defaultForm);
    loadRows();
  }, [defaultForm]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const payload = { ...form };
    const query = editingId
      ? supabase.from(ENTITY_NAME).update(payload).eq("id", editingId)
      : supabase.from(ENTITY_NAME).insert(payload);

    const { error } = await query;
    if (!error) {
      setEditingId(null);
      setForm(defaultForm);
      await loadRows();
    }
    setLoading(false);
  }

  function startEdit(row: RecordRow) {
    setEditingId(row.id);
    const nextForm: Record<string, string> = { ...defaultForm };
    for (const field of FIELDS) {
      nextForm[field.name] = String(row[field.name] ?? "");
    }
    setForm(nextForm);
  }

  async function removeRow(id: string) {
    setLoading(true);
    const { error } = await supabase.from(ENTITY_NAME).delete().eq("id", id);
    if (!error) {
      await loadRows();
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            __PROJECT_NAME__
          </p>
          <h1 className="text-3xl font-semibold">{ENTITY_LABEL} Manager</h1>
          <p className="text-muted-foreground">
            Create, update, and delete {ENTITY_NAME} records.
          </p>
        </header>

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle>{editingId ? `Edit ${ENTITY_LABEL}` : `New ${ENTITY_LABEL}`}</CardTitle>
            <CardDescription>
              Provide the fields and save to Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              {FIELDS.map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={field.name}>
                    {field.label}
                  </label>
                  <Input
                    id={field.name}
                    value={form[field.name] ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        [field.name]: event.target.value,
                      }))
                    }
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                </div>
              ))}
              <div className="flex items-end gap-3">
                <Button type="submit" disabled={loading}>
                  {editingId ? "Save changes" : `Add ${ENTITY_LABEL}`}
                </Button>
                {editingId ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => {
                      setEditingId(null);
                      setForm(defaultForm);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle>{ENTITY_LABEL} Records</CardTitle>
            <CardDescription>
              {rows.length} items loaded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {FIELDS.map((field) => (
                    <TableHead key={field.name}>{field.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    {FIELDS.map((field) => (
                      <TableCell key={field.name}>
                        {row[field.name]}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeRow(row.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No records yet. Add your first {ENTITY_LABEL.toLowerCase()}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
