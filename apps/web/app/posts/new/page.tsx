import { redirect } from "next/navigation";
import { auth } from "auth";
import { NewPostForm } from "@/components/posts/new-post-form";

export const metadata = {
  title: "New draft",
  description: "Create a new draft post.",
};

export default async function NewPostPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/posts/new");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <NewPostForm />
    </div>
  );
}
