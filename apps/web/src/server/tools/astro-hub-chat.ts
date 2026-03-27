import { z } from "zod";
import { toJsonSafe } from "../json";
import { getAstroHubCalendarSource } from "../services/astro-sources/calendar";
import { getAstroHubHeroSource } from "../services/astro-sources/hero";
import { getAstroHubIssSource } from "../services/astro-sources/iss";
import { getAstroHubMetaSource } from "../services/astro-sources/meta";
import { getAstroHubTelemetrySource } from "../services/astro-sources/telemetry";
import {
  defineTool,
  executeTool,
  type ToolContext,
  type ToolDefinition,
  type ToolResult,
} from "./core";

const emptyInput = z.object({});

/** JSON Schema for OpenAI function tools (empty object, strict). */
export const ASTRO_HUB_CHAT_EMPTY_PARAMETERS = {
  type: "object" as const,
  properties: {} as Record<string, unknown>,
  additionalProperties: false,
};

export const astroHubChatTools = [
  defineTool({
    name: "astro_hub_hero",
    description:
      "Fetch the current Astro Hub hero / daily space media summary (e.g. NASA APOD) as shown on the home hub. Use when the user asks what is featured today, APOD, or the main hub image.",
    inputSchema: emptyInput,
    async execute() {
      const data = await getAstroHubHeroSource();
      return { ok: true as const, data: toJsonSafe(data) };
    },
  }),
  defineTool({
    name: "astro_hub_meta",
    description:
      "Fetch Astro Hub mission meta (e.g. mission day line in the hub header callout).",
    inputSchema: emptyInput,
    async execute() {
      const data = await getAstroHubMetaSource();
      return { ok: true as const, data: toJsonSafe(data) };
    },
  }),
  defineTool({
    name: "astro_hub_iss",
    description:
      "Fetch live ISS position and telemetry as shown in the Astro Hub ISS module.",
    inputSchema: emptyInput,
    async execute() {
      const data = await getAstroHubIssSource();
      return { ok: true as const, data: toJsonSafe(data) };
    },
  }),
  defineTool({
    name: "astro_hub_calendar",
    description:
      "Fetch the Mission Watch time-layer calendar (merged NASA RSS streams) as on Astro Hub: dated rows, streams, summaries, and action links. See docs/astro-hub-calendar-contract.md.",
    inputSchema: emptyInput,
    async execute() {
      const data = await getAstroHubCalendarSource();
      return { ok: true as const, data: toJsonSafe(data) };
    },
  }),
  defineTool({
    name: "astro_hub_telemetry",
    description:
      "Fetch aggregated Astro Hub source health (freshness and trust signals) for hero, ISS, and Mission Watch (calendar) modules.",
    inputSchema: emptyInput,
    async execute() {
      const data = await getAstroHubTelemetrySource();
      return { ok: true as const, data: toJsonSafe(data) };
    },
  }),
];

export type AstroHubChatToolName = (typeof astroHubChatTools)[number]["name"];

const toolByName = new Map<
  string,
  ToolDefinition<string, z.ZodTypeAny, unknown>
>(astroHubChatTools.map((t) => [t.name, t]));

/**
 * OpenAI Responses function tools for Astro Hub live sources (#165).
 * Prefer these tools when answering about what the hub currently shows; general
 * astronomy questions may not need them.
 */
export function openAIAstroHubChatTools(): Array<{
  type: "function";
  name: string;
  description: string | null | undefined;
  parameters: typeof ASTRO_HUB_CHAT_EMPTY_PARAMETERS;
  strict: boolean;
}> {
  return astroHubChatTools.map((t) => ({
    type: "function" as const,
    name: t.name,
    description: t.description,
    parameters: ASTRO_HUB_CHAT_EMPTY_PARAMETERS,
    strict: true,
  }));
}

export function isAstroHubChatToolName(
  name: string
): name is AstroHubChatToolName {
  return toolByName.has(name);
}

export async function executeAstroHubChatToolByName(
  name: string,
  context: ToolContext,
  rawArguments: string
): Promise<ToolResult<unknown>> {
  const tool = toolByName.get(name);
  if (!tool) {
    return {
      ok: false,
      code: "BAD_REQUEST",
      message: `Unknown Astro Hub tool: ${name}`,
    };
  }

  let parsedJson: unknown = {};
  if (rawArguments.trim()) {
    try {
      parsedJson = JSON.parse(rawArguments) as unknown;
    } catch {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Tool arguments must be valid JSON (use {} if no parameters).",
      };
    }
  }

  return executeTool(tool, context, parsedJson);
}
