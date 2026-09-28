import type { WorkstyleDimension } from './dimensions';

export type QuizTagMetadata = {
  dimension: Record<string, WorkstyleDimension>;
};

const tagMetadata = {
  dimension: {
    Decisive: 'decision-making',
    Consultative: 'decision-making',
    Analytical: 'decision-making',
    Cautious: 'decision-making',
    Proactive: 'decision-making',
    Collaborative: 'decision-making',
    Deliberate: 'decision-making',
    Careful: 'decision-making',
    Flexible: 'adaptability',
    Strategic: 'adaptability',
    Consistent: 'adaptability',
    Steady: 'adaptability',
    Adaptive: 'adaptability',
    Responsive: 'adaptability',
    Stable: 'adaptability',
    Gradual: 'adaptability',
    Immediate: 'responsiveness',
    Timely: 'responsiveness',
    Balanced: 'responsiveness',
    Structured: 'responsiveness',
    Prompt: 'responsiveness',
    Dependable: 'responsiveness',
    Scheduled: 'responsiveness',
    'Fast-Paced': 'time-management',
    Prioritizing: 'time-management',
    Organized: 'time-management',
    Methodical: 'time-management',
    Versatile: 'time-management',
    Focused: 'time-management',
    'Deep-Working': 'time-management',
    Assertive: 'cooperativeness',
    Open: 'cooperativeness',
    Mediating: 'cooperativeness',
    Supportive: 'cooperativeness',
    Confident: 'cooperativeness',
    Receptive: 'cooperativeness',
    Cooperative: 'cooperativeness',
    Engaged: 'communication',
    Planned: 'communication',
    Independent: 'communication',
    Reliable: 'communication',
    Autonomous: 'communication',
  },
} as const satisfies QuizTagMetadata;

export const quizTagMetadata: QuizTagMetadata = tagMetadata;
