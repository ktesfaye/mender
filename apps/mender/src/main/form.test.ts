import { describe, expect, it } from 'vitest';
import { questionsOf } from './form';

describe('questionsOf', () => {
  it('reads an AskUserQuestion form as one question per field with its written companion folded in', () => {
    const questions = questionsOf('Please answer the following questions.', {
      type: 'object',
      properties: {
        question_0: {
          type: 'string',
          title: 'Auth',
          description: 'Which auth?',
          oneOf: [
            { const: 'OAuth', title: 'OAuth', description: 'hosted' },
            { const: 'JWT', title: 'JWT' },
          ],
        },
        question_0_custom: {
          type: 'string',
          _meta: {
            _askUserQuestionCustomAnswer: { questionId: 'question_0', isCustomAnswer: true },
          },
        },
        question_1: {
          type: 'array',
          title: 'Extras',
          description: 'Which extras?',
          items: { anyOf: [{ const: 'a', title: 'A' }] },
        },
        question_1_custom: {
          type: 'string',
          _meta: {
            _askUserQuestionCustomAnswer: { questionId: 'question_1', isCustomAnswer: true },
          },
        },
        note: { type: 'string', title: 'Note' },
      },
    });
    expect(questions).toEqual([
      {
        key: 'question_0',
        written: 'question_0_custom',
        header: 'Auth',
        text: 'Which auth?',
        several: false,
        options: [
          { value: 'OAuth', label: 'OAuth', about: 'hosted' },
          { value: 'JWT', label: 'JWT' },
        ],
      },
      {
        key: 'question_1',
        written: 'question_1_custom',
        header: 'Extras',
        text: 'Which extras?',
        several: true,
        options: [{ value: 'a', label: 'A' }],
      },
      { key: 'note', written: 'note', header: 'Note', text: 'Note', several: false, options: [] },
    ]);
  });

  it('carries what the agent hung on an option as its preview', () => {
    const [question] = questionsOf('Which?', {
      type: 'object',
      properties: {
        question_0: {
          type: 'string',
          oneOf: [
            {
              const: 'A',
              title: 'A',
              _meta: { '_claude/askUserQuestionOption': { preview: '/x/a.mp4' } },
            },
            { const: 'B', title: 'B' },
          ],
        },
      },
    });
    expect(question.options.map((one) => one.preview)).toEqual(['/x/a.mp4', undefined]);
  });
});
