import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "auth";
import { ArrowLeft } from "lucide-react";
import { WorkflowDefinitionForm } from "@/components/workflows/workflow-definition-form";
import { Button } from "@/components/ui/button";
import { getWorkflowDefinitionForOwner } from "@/server/services/workflow-definitions";
import { lumigraphTools } from "@/server/tools/lumigraph";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Workflow ${id}`,
  };
}

export default async function WorkflowDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/workflows/${id}`);
  }

  const definition = await getWorkflowDefinitionForOwner(session.user.id, id);
  if (!definition) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/workflows" className="gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to workflows
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {definition.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit the workflow metadata and ordered steps for this private
          astrophotography process.
        </p>
      </div>

      <WorkflowDefinitionForm
        mode="edit"
        definitionId={definition.id}
        initialDefinition={definition}
        toolOptions={lumigraphTools.map((tool) => ({
          name: tool.name,
          description: tool.description,
        }))}
      />
    </div>
  );
}
