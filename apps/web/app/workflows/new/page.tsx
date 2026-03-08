import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "auth";
import { WorkflowDefinitionForm } from "@/components/workflows/workflow-definition-form";
import { lumigraphTools } from "@/server/tools/lumigraph";

export const metadata: Metadata = {
  title: "New Workflow",
  description: "Create a private workflow definition for repeated processing.",
};

export default async function NewWorkflowPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/workflows/new");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <WorkflowDefinitionForm
        mode="create"
        toolOptions={lumigraphTools.map((tool) => ({
          name: tool.name,
          description: tool.description,
        }))}
      />
    </div>
  );
}
