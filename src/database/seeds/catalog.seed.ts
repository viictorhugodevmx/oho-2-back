import { DesignModel } from "../../modules/catalog/models/design.model.js";
import { ProductModel } from "../../modules/catalog/models/product.model.js";
import { designSeeds } from "./design.seed-data.js";
import { productSeeds } from "./product.seed-data.js";

interface SeedSummary {
  matched: number;
  modified: number;
  inserted: number;
}

export interface CatalogSeedResult {
  products: SeedSummary;
  designs: SeedSummary;
}

export async function seedCatalog(): Promise<CatalogSeedResult> {
  const productOperations = productSeeds.map((seed) => {
    const { _id, ...product } = new ProductModel(seed).toObject();

    void _id;

    return {
      updateOne: {
        filter: {
          externalId: seed.externalId,
        },
        update: {
          $set: product,
        },
        upsert: true,
      },
    };
  });

  const designOperations = designSeeds.map((seed) => {
    const { _id, ...design } = new DesignModel(seed).toObject();

    void _id;

    return {
      updateOne: {
        filter: {
          externalId: seed.externalId,
        },
        update: {
          $set: design,
        },
        upsert: true,
      },
    };
  });

  const [productResult, designResult] = await Promise.all([
    ProductModel.bulkWrite(productOperations, {
      ordered: false,
    }),
    DesignModel.bulkWrite(designOperations, {
      ordered: false,
    }),
  ]);

  return {
    products: {
      matched: productResult.matchedCount,
      modified: productResult.modifiedCount,
      inserted: productResult.upsertedCount,
    },
    designs: {
      matched: designResult.matchedCount,
      modified: designResult.modifiedCount,
      inserted: designResult.upsertedCount,
    },
  };
}
