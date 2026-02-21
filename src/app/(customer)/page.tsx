import { createProject } from "@/actions/olynero-projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default async function Home() {
  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-2xl">Create a new project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Describe a landing page or CRUD app. We will generate a project,
              build it, and provide a preview + zip artifact.
            </p>
          </div>
          <form action={createProject} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                Project name
              </label>
              <Input
                id="name"
                name="name"
                placeholder="Customer CRM, Portfolio, SaaS waitlist..."
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="description">
                Description (optional)
              </label>
              <Textarea
                id="description"
                name="description"
                placeholder="Landing page for an AI bookkeeping product..."
                rows={4}
              />
            </div>
            <Button type="submit" className="w-full">
              Create project
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Landing: hero, features, CTA, testimonials.</p>
            <p>CRUD: list + create + edit + delete with Supabase.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What happens next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. We draft a structured spec from your chat.</p>
            <p>2. A template is generated and built.</p>
            <p>3. You get a preview URL and zip artifact.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
