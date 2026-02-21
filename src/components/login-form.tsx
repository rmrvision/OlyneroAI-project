"use client";

import { type ComponentProps, useState, useTransition } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LoginForm({
  className,
  error,
  callbackUrl,
  ...props
}: ComponentProps<"div"> & { error?: string; callbackUrl?: string }) {
  const [redirected, setRedirected] = useState(false);
  const [transitioning, startTransition] = useTransition();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [localError, setLocalError] = useState<string | null>(null);
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-1">
          <form
            className="p-6 md:p-8"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const email = String(formData.get("email") ?? "");
              const password = String(formData.get("password") ?? "");
              setLocalError(null);
              startTransition(async () => {
                const supabase = createSupabaseBrowserClient();
                const res =
                  mode === "signup"
                    ? await supabase.auth.signUp({
                        email,
                        password,
                      })
                    : await supabase.auth.signInWithPassword({
                        email,
                        password,
                      });

                if (res.error) {
                  setLocalError(res.error.message);
                  return;
                }

                setRedirected(true);
                window.location.href = callbackUrl ?? "/";
              });
            }}
          >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                  {mode === "login"
                    ? "Login to your OlyneroAI account"
                    : "Create your OlyneroAI account"}
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  placeholder="user@example.com"
                  required
                  disabled={transitioning || redirected}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={transitioning || redirected}
                />
              </Field>
              {(error || localError) && (
                <Alert variant="destructive">
                  <AlertTitle>Failed to login</AlertTitle>
                  <AlertDescription>{localError ?? error}</AlertDescription>
                </Alert>
              )}
              <Field>
                <Button type="submit" disabled={transitioning || redirected}>
                  {mode === "login" ? "Login" : "Create account"}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                {mode === "login" ? "New here?" : "Have an account?"}
              </FieldSeparator>
              <Field className="grid grid-cols-1 gap-4">
                <Button
                  variant="outline"
                  type="button"
                  disabled={transitioning || redirected}
                  onClick={() => {
                    setLocalError(null);
                    setMode(mode === "login" ? "signup" : "login");
                  }}
                >
                  {mode === "login" ? "Create account" : "Back to login"}
                </Button>
              </Field>
              {/*<FieldDescription className="text-center">*/}
              {/*  Don&apos;t have an account? <a href="#">Sign up</a>*/}
              {/*</FieldDescription>*/}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
