import type { Types } from "mongoose";

import {
  IdempotencyRecordModel,
  type IdempotencyOperation,
} from "../models/idempotency-record.model.js";

export interface CreateProcessingIdempotencyRecord {
  operation: IdempotencyOperation;
  keyHash: string;
  requestHash: string;
  lockedAt: Date;
  expiresAt: Date;
}

export const idempotencyRepository = {
  createProcessing(record: CreateProcessingIdempotencyRecord) {
    return IdempotencyRecordModel.create({
      ...record,
      status: "processing",
      orderId: null,
      responseStatusCode: null,
      errorCode: null,
      completedAt: null,
    });
  },

  findByOperationAndKeyHash(operation: IdempotencyOperation, keyHash: string) {
    return IdempotencyRecordModel.findOne({
      operation,
      keyHash,
    })
      .select("+keyHash +requestHash")
      .exec();
  },

  markCompleted(
    recordId: Types.ObjectId,
    orderId: Types.ObjectId,
    responseStatusCode: number,
    completedAt: Date,
  ) {
    return IdempotencyRecordModel.findOneAndUpdate(
      {
        _id: recordId,
        status: "processing",
      },
      {
        $set: {
          status: "completed",
          orderId,
          responseStatusCode,
          errorCode: null,
          completedAt,
        },
      },
      {
        new: true,
      },
    ).exec();
  },

  markFailed(recordId: Types.ObjectId, errorCode: string, completedAt: Date) {
    return IdempotencyRecordModel.findOneAndUpdate(
      {
        _id: recordId,
        status: "processing",
      },
      {
        $set: {
          status: "failed",
          errorCode,
          completedAt,
        },
      },
      {
        new: true,
      },
    ).exec();
  },
};
