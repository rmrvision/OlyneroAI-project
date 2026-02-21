import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  __FEATURES__
];

export default function Page() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e293b,_transparent_55%)] px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16">
        <header className="grid gap-10 rounded-3xl border border-border/60 bg-card/80 p-10 shadow-2xl shadow-black/30 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              __PROJECT_NAME__
            </p>
            <h1 className="text-4xl font-semibold leading-tight lg:text-5xl">
              __HEADLINE__
            </h1>
            <p className="text-lg text-muted-foreground">__SUBHEADLINE__</p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg">__CTA__</Button>
              <Button variant="outline" size="lg">
                See how it works
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <Card className="border-border/60 bg-muted/40">
              <CardHeader>
                <CardTitle>Launch plan</CardTitle>
                <CardDescription>
                  Everything you need to go live in a single flow.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Spec ready</span>
                  <span className="text-primary">Done</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Design system</span>
                  <span className="text-primary">Ready</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Deploy preview</span>
                  <span className="text-primary">2 min</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-muted/40">
              <CardHeader>
                <CardTitle>Live metrics</CardTitle>
                <CardDescription>
                  Track signups, retention, and activation in real time.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Weekly signups</p>
                  <p className="text-2xl font-semibold">1.2k</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Conversion</p>
                  <p className="text-2xl font-semibold">18.4%</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-border/60 bg-card/80 p-10 text-center">
          <h2 className="text-3xl font-semibold">Ready to launch?</h2>
          <p className="mt-3 text-muted-foreground">
            __PROJECT_NAME__ ships with a world-class landing experience out of
            the box.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button size="lg">__CTA__</Button>
            <Button size="lg" variant="outline">
              Talk to us
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
