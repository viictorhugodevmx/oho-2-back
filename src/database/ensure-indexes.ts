import { ensureDatabaseIndexes } from "./indexes.js";
import { connectToDatabase, disconnectFromDatabase } from "./mongoose.js";
import { logger } from "../shared/logger/logger.js";

async function run(): Promise<void> {
  try {
    await connectToDatabase();
    await ensureDatabaseIndexes();

    logger.info("Database index preparation completed");
  } catch (error) {
    logger.fatal({ error }, "Database index preparation failed");

    process.exitCode = 1;
  } finally {
    await disconnectFromDatabase();
  }
}

void run();
