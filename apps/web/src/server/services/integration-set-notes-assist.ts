import { z } from "zod";
import { generateOpenAIJsonObject } from "@/server/ai/json";
import {
  INTEGRATION_SET_NOTES_GENERATE_SYSTEM_PROMPT,
  INTEGRATION_SET_NOTES_REFINE_SYSTEM_PROMPT,
} from "@/server/ai/prompts";
import {
  isLikelyFitsFilename,
  parseFitsHeaderHints,
} from "@/lib/fits-header-sniff";
import {
  summarizeIntegrationAssets,
  type IntegrationAssetSummaryInput,
} from "@/lib/integration-asset-summary";
import { getPrisma } from "@lumigraph/db";
import * as s3 from "./s3";

const GeneratedNotesSchema = z.object({
  notes: z.string().min(80).max(4000),
});

const RefinedNotesSchema = z.object({
  notes: z.string().min(1).max(4000),
});

const FITS_PREFIX_BYTES = 2880;
const MAX_FITS_FILES_TO_SNIFF = 3;

async function buildNotesContextString(
  integrationSetId: string,
  userId: string
): Promise<string | null> {
  const prisma = await getPrisma();
  const set = await prisma.integrationSet.findUnique({
    where: { id: integrationSetId },
  });
  if (!set || set.userId !== userId) return null;

  const assets = await prisma.asset.findMany({
    where: {
      integrationSetId,
      userId,
      status: "UPLOADED",
      kind: "INTEGRATION",
    },
    orderBy: { relativePath: "asc" },
  });

  const summaryInputs: IntegrationAssetSummaryInput[] = assets.map((a) => ({
    relativePath: a.relativePath,
    filename: a.filename,
    contentType: a.contentType,
    sizeBytes: a.sizeBytes,
  }));

  const inv = summarizeIntegrationAssets(summaryInputs);
  const lines: string[] = [
    `Integration set title: ${set.title}`,
    `Total files: ${inv.totalFiles}`,
    "",
    "By top-level folder (file count, size, common extensions):",
  ];
  for (const f of inv.byFolder.slice(0, 12)) {
    lines.push(
      `- ${f.folder}: ${f.fileCount} files, ${f.topExtensions.join(", ") || "—"}`
    );
  }
  lines.push("", "By type label:");
  for (const t of inv.byType.slice(0, 15)) {
    lines.push(`- ${t.label}: ${t.fileCount} files`);
  }
  lines.push("", "Sample paths (up to 25):");
  for (const a of assets.slice(0, 25)) {
    lines.push(`- ${a.relativePath}`);
  }

  const bucket = s3.getS3Bucket();
  const fitsSnippets: string[] = [];
  let sniffed = 0;
  for (const a of assets) {
    if (!isLikelyFitsFilename(a.filename)) continue;
    if (sniffed >= MAX_FITS_FILES_TO_SNIFF) break;
    const buf = await s3.readS3ObjectPrefix(bucket, a.s3Key, FITS_PREFIX_BYTES);
    if (!buf || buf.length < 80) continue;
    const hints = parseFitsHeaderHints(buf);
    if (Object.keys(hints).length === 0) continue;
    fitsSnippets.push(`File ${a.relativePath}: ${JSON.stringify(hints)}`);
    sniffed += 1;
  }
  if (fitsSnippets.length > 0) {
    lines.push("", "FITS header hints (partial, first files only):");
    lines.push(...fitsSnippets);
  }

  return lines.join("\n");
}

export async function generateIntegrationSetNotes(
  integrationSetId: string,
  userId: string
) {
  const context = await buildNotesContextString(integrationSetId, userId);
  if (!context) {
    throw new Error("Integration set not found");
  }

  const response = await generateOpenAIJsonObject({
    systemPrompt: INTEGRATION_SET_NOTES_GENERATE_SYSTEM_PROMPT,
    userPrompt: `Context:\n${context}`,
    schema: GeneratedNotesSchema,
  });

  return { notes: response.notes.trim() };
}

export async function refineIntegrationSetNotes(
  integrationSetId: string,
  userId: string,
  currentNotes: string
) {
  const context = await buildNotesContextString(integrationSetId, userId);
  if (!context) {
    throw new Error("Integration set not found");
  }

  const response = await generateOpenAIJsonObject({
    systemPrompt: INTEGRATION_SET_NOTES_REFINE_SYSTEM_PROMPT,
    userPrompt: [
      "Context (for grounding only; do not contradict the user's notes unnecessarily):",
      context,
      "",
      "Current notes:",
      currentNotes.trim(),
    ].join("\n"),
    schema: RefinedNotesSchema,
  });

  return { notes: response.notes.trim() };
}
