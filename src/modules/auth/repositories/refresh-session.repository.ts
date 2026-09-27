import { Types, type Model } from "mongoose";

import {
  RefreshSessionModel,
  type RefreshSession,
} from "../models/refresh-session.model.js";

const refreshSessions = RefreshSessionModel as Model<RefreshSession>;

interface CreateRefreshSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

export const refreshSessionRepository = {
  create(input: CreateRefreshSessionInput) {
    return refreshSessions.create({
      userId: new Types.ObjectId(input.userId),
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      replacedBySessionId: null,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });
  },

  findActiveByTokenHash(tokenHash: string) {
    return refreshSessions
      .findOne({
        tokenHash,
        revokedAt: null,
        expiresAt: {
          $gt: new Date(),
        },
      })
      .select("+tokenHash")
      .exec();
  },

  revokeAndReplace(
    sessionId: Types.ObjectId,
    replacementSessionId: Types.ObjectId,
    revokedAt: Date,
  ) {
    return refreshSessions
      .updateOne(
        {
          _id: sessionId,
          revokedAt: null,
          expiresAt: {
            $gt: revokedAt,
          },
        },
        {
          $set: {
            revokedAt,
            replacedBySessionId: replacementSessionId,
          },
        },
      )
      .exec();
  },

  revokeByTokenHash(tokenHash: string, revokedAt: Date) {
    return refreshSessions
      .updateOne(
        {
          tokenHash,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt,
          },
        },
      )
      .exec();
  },

  deleteById(sessionId: Types.ObjectId) {
    return refreshSessions.deleteOne({
      _id: sessionId,
    });
  },
};
