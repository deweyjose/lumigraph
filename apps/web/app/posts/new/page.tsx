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
    <div className="mx-auto w-full max-w-4xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <NewPostForm />
    </div>
  );
}
