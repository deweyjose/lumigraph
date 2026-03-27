import { z } from "zod";
import { auth } from "auth";
import { apiError } from "@/server/api-responses";
import { hasOpenAIApiKey } from "@/server/ai/config";
import {
  WRITEUP_INTERVIEW_QUESTION_IDS,
  WRITEUP_REQUIRED_QUESTION_IDS,
} from "@/lib/post-writeup-interview-questions";
import { getPostForOwner } from "@/server/services/posts";
import {
  generatePostWriteupFromInterview,
  refinePostWriteup,
} from "@/server/services/post-writeup-assist";

const MAX_ANSWER_LEN = 2000;

const AnswersSchema = z
  .record(z.string(), z.string().max(MAX_ANSWER_LEN))
  .superRefine((answers, ctx) => {
    for (const id of WRITEUP_REQUIRED_QUESTION_IDS) {
      const v = answers[id]?.trim() ?? "";
      if (!v) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Answer required for ${id}`,
          path: ["answers", id],
        });
      }
    }
    for (const key of Object.keys(answers)) {
      if (
        !WRITEUP_INTERVIEW_QUESTION_IDS.includes(
          key as (typeof WRITEUP_INTERVIEW_QUESTION_IDS)[number]
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown answer key: ${key}`,
          path: ["answers", key],
        });
      }
    }
  });

const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
    answers: AnswersSchema,
  }),
  z.object({
    action: z.literal("refine"),
    description: z.string().min(1).max(10_000),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to generate a write-up");
  }

  if (!hasOpenAIApiKey()) {
    return apiError(
      503,
      "AI_UNAVAILABLE",
      "AI write-up assist is not configured on this deployment"
    );
  }

  const { id } = await params;
  if (!id) {
    return apiError(400, "BAD_REQUEST", "Missing post id");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "BAD_REQUEST", "Expected JSON body");
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError(
      400,
      "BAD_REQUEST",
      first?.message ?? "Invalid request body"
    );
  }

  const post = await getPostForOwner(id, session.user.id);
  if (!post) {
    return apiError(404, "NOT_FOUND", "Post not found or you do not own it");
  }

  const context = {
    title: post.title,
    description: post.description,
    targetName: post.targetName,
    targetType: post.targetType,
    captureDate: post.captureDate,
    bortle: post.bortle,
  };

  try {
    if (parsed.data.action === "refine") {
      const draft = await refinePostWriteup(context, parsed.data.description);
      return Response.json(draft);
    }

    const draft = await generatePostWriteupFromInterview(
      context,
      parsed.data.answers
    );
    return Response.json(draft);
  } catch {
    return apiError(502, "AI_GENERATION_FAILED", "Failed to generate write-up");
  }
}
