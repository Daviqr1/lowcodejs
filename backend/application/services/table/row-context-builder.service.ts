import { Service } from 'fastify-decorators';

import type { IField } from '@application/core/entity.core';
import { E_FIELD_TYPE, E_REACTION_TYPE } from '@application/core/entity.core';

import { RowContextBuilderContractService } from './row-context-builder-contract.service';

type EvaluationLike = { value?: number | null; user?: { toString(): string } };
type ReactionLike = { type?: string; user?: { toString(): string } };

@Service()
export default class RowContextBuilder implements RowContextBuilderContractService {
  transform<T extends Record<string, unknown>>(
    rowJson: T,
    fields: IField[],
    userId?: string,
  ): T {
    const row: Record<string, unknown> = rowJson;

    for (const field of fields) {
      if (field.type === E_FIELD_TYPE.EVALUATION) {
        const rawEvaluations = row[field.slug];
        let evaluations: EvaluationLike[] = [];
        if (Array.isArray(rawEvaluations)) evaluations = rawEvaluations;

        const count = evaluations.length;

        let average = 0;
        if (count > 0) {
          const sum = evaluations.reduce((acc, e) => acc + (e.value ?? 0), 0);
          average = sum / count;
        }

        let userValue: number | null = null;
        if (userId) {
          const userEval = evaluations.find(
            (e) => e.user?.toString() === userId,
          );
          if (userEval) {
            userValue = userEval.value ?? null;
          }
        }

        row[field.slug] = {
          _average: average,
          _count: count,
          _userValue: userValue,
        };
      }

      if (field.type === E_FIELD_TYPE.REACTION) {
        const rawReactions = row[field.slug];
        let reactions: ReactionLike[] = [];
        if (Array.isArray(rawReactions)) reactions = rawReactions;

        const likeCount = reactions.filter(
          (r) => r.type === E_REACTION_TYPE.LIKE,
        ).length;

        const unlikeCount = reactions.filter(
          (r) => r.type === E_REACTION_TYPE.UNLIKE,
        ).length;

        let userReaction: string | null = null;
        if (userId) {
          const userReact = reactions.find(
            (r) => r.user?.toString() === userId,
          );
          if (userReact) {
            userReaction = userReact.type ?? null;
          }
        }

        row[field.slug] = {
          _likeCount: likeCount,
          _unlikeCount: unlikeCount,
          _userReaction: userReaction,
        };
      }
    }

    return rowJson;
  }
}
