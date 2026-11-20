/**
 * Classifies a catalog entry as a text chat model or something else.
 *
 * Catalog metadata wins when the provider exposes it (`modalities`, `type`/
 * `model_type`, `architecture`). Older catalogs only carry ids, so the name
 * patterns below are the fallback.
 */
export type ModelKind = 'chat' | 'audio' | 'image' | 'embedding' | 'rerank' | 'moderation';

export interface ModelKindInput {
  id: string;
  modalities?: string[];
  modelType?: string;
  architecture?: string;
}

const META_RULES: { re: RegExp; kind: ModelKind }[] = [
  { re: /embed/i, kind: 'embedding' },
  { re: /rerank|re-rank|cross-encoder/i, kind: 'rerank' },
  { re: /moderation|guardrail|content-safety/i, kind: 'moderation' },
  { re: /whisper|transcri|speech|audio|tts|voice/i, kind: 'audio' },
  { re: /dall[-_ ]?e|stable[-_ ]?diffusion|sdxl|flux|imagen|text-to-image|image[-_ ]?gen/i, kind: 'image' },
];

export const NAME_RULES: { re: RegExp; kind: ModelKind }[] = [
  { re: /whisper|transcribe|transcription|speech|(^|[-_/])tts([-_/]|$)|audio/i, kind: 'audio' },
  { re: /embed/i, kind: 'embedding' },
  { re: /rerank|re-rank/i, kind: 'rerank' },
  { re: /moderation/i, kind: 'moderation' },
  { re: /dall[-_ ]?e|flux|stable[-_ ]?diffusion|sdxl|imagen/i, kind: 'image' },
];

function fromMetadata(input: ModelKindInput): ModelKind | null {
  const type = (input.modelType ?? '').toLowerCase();
  const arch = (input.architecture ?? '').toLowerCase();
  if (type) {
    for (const rule of META_RULES) if (rule.re.test(type)) return rule.kind;
    if (/chat|completion|language|llm|instruct|text->text|text to text/i.test(type)) return 'chat';
  }
  const modalities = (input.modalities ?? []).map((m) => m.toLowerCase());
  if (modalities.length) {
    if (modalities.some((m) => /embed/.test(m))) return 'embedding';
    if (modalities.some((m) => /rerank/.test(m))) return 'rerank';
    if (modalities.some((m) => /moderation/.test(m))) return 'moderation';
    // A model that emits text is a chat model even when it also reads images.
    if (modalities.some((m) => /text/.test(m))) return 'chat';
    if (modalities.some((m) => /audio|speech/.test(m))) return 'audio';
    if (modalities.some((m) => /image/.test(m))) return 'image';
  }
  if (arch) {
    for (const rule of META_RULES) if (rule.re.test(arch)) return rule.kind;
    if (/text->text|chat|completion/.test(arch)) return 'chat';
  }
  return null;
}

export function classifyModel(input: ModelKindInput): ModelKind {
  const metadata = fromMetadata(input);
  if (metadata) return metadata;
  for (const rule of NAME_RULES) if (rule.re.test(input.id)) return rule.kind;
  return 'chat';
}

export function isChatModel(input: ModelKindInput): boolean {
  return classifyModel(input) === 'chat';
}
