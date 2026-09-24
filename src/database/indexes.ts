import {
  RefreshSessionModel,
  UserModel,
} from "../modules/auth/models/index.js";
import { DesignModel } from "../modules/catalog/models/design.model.js";
import { ProductModel } from "../modules/catalog/models/product.model.js";
import {
  GuestOrderAccessModel,
  IdempotencyRecordModel,
  OrderModel,
} from "../modules/orders/models/index.js";
import { logger } from "../shared/logger/logger.js";

export async function ensureDatabaseIndexes(): Promise<void> {
  await Promise.all([
    ProductModel.createIndexes(),
    DesignModel.createIndexes(),
    UserModel.createIndexes(),
    RefreshSessionModel.createIndexes(),
    OrderModel.createIndexes(),
    GuestOrderAccessModel.createIndexes(),
    IdempotencyRecordModel.createIndexes(),
  ]);

  logger.info(
    {
      models: [
        "Product",
        "Design",
        "User",
        "RefreshSession",
        "Order",
        "GuestOrderAccess",
        "IdempotencyRecord",
      ],
    },
    "MongoDB indexes ensured",
  );
}
