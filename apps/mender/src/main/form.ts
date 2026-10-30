/**
 * A form an agent wants filled in, read as the questions a person would be asked.
 *
 * ACP carries it as a flat JSON Schema: one field per question, its answers as a
 * titled enum, and — when it came from Claude's AskUserQuestion or a bridge like
 * it — a free-text companion field marked as that question's own "something
 * else". The board asks one question at a time, so this lays the fields out in
 * that order and folds each companion into the question it belongs to.
 */

export type FormValue = string | number | boolean | string[];

export interface FormQuestion {
  key: string;
  /** The field a written answer goes in instead of a pick, when there is one. */
  written?: string;
  header?: string;
  text: string;
  /** Several answers may be picked at once. */
  several: boolean;
  options: { value: string | boolean; label: string; about?: string; preview?: string }[];
}

const COMPANION = '_askUserQuestionCustomAnswer';

const OPTION_META = '_claude/askUserQuestionOption';

type Choice = {
  const?: unknown;
  title?: string;
  description?: string;
  _meta?: Record<string, unknown> | null;
};

type Field = {
  type?: string;
  title?: string;
  description?: string;
  enum?: unknown[];
  oneOf?: Choice[];
  anyOf?: Choice[];
  items?: Field;
  _meta?: Record<string, unknown> | null;
};

export function questionsOf(message: string, schema: Record<string, unknown>): FormQuestion[] {
  const fields = (schema.properties ?? {}) as Record<string, Field>;
  const companions = new Map<string, string>();
  for (const [key, field] of Object.entries(fields)) {
    const of = (field._meta?.[COMPANION] as { questionId?: unknown } | undefined)?.questionId;
    if (typeof of === 'string') companions.set(of, key);
  }
  const own = [...companions.values()];
  const keys = Object.keys(fields).filter((key) => !own.includes(key));
  return keys.map((key) => {
    const field = fields[key];
    const several = field.type === 'array';
    const choices = several ? field.items : field;
    const options =
      field.type === 'boolean'
        ? [
            { value: true, label: 'yes' },
            { value: false, label: 'no' },
          ]
        : (choices?.oneOf ?? choices?.anyOf ?? []).length
          ? (choices?.oneOf ?? choices?.anyOf ?? []).map((choice) => {
              const preview = (choice._meta?.[OPTION_META] as { preview?: unknown } | undefined)
                ?.preview;
              return {
                value: String(choice.const),
                label: choice.title ?? String(choice.const),
                ...(choice.description ? { about: choice.description } : {}),
                ...(typeof preview === 'string' && preview.trim() ? { preview } : {}),
              };
            })
          : (choices?.enum ?? []).map((value) => ({ value: String(value), label: String(value) }));
    /* A field with nothing to pick from is answered by writing, in itself. */
    const written = companions.get(key) ?? (options.length ? undefined : key);
    return {
      key,
      ...(written ? { written } : {}),
      ...(field.title ? { header: field.title } : {}),
      text: field.description ?? (keys.length === 1 ? message : (field.title ?? message)),
      several,
      options,
    };
  });
}
