import { ensureDatabaseIndexes } from "./indexes.js";
import { connectToDatabase, disconnectFromDatabase } from "./mongoose.js";
import { seedCatalog } from "./seeds/catalog.seed.js";
import { logger } from "../shared/logger/logger.js";

async function run(): Promise<void> {
  try {
    await connectToDatabase();
    await ensureDatabaseIndexes();

    const result = await seedCatalog();

    logger.info(
      {
        result,
      },
      "Catalog seed completed",
    );
  } catch (error) {
    logger.fatal(
      {
        error,
      },
      "Catalog seed failed",
    );

    process.exitCode = 1;
  } finally {
    await disconnectFromDatabase();
  }
}

void run();
