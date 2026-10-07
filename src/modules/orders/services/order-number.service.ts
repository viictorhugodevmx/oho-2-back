import { randomBytes } from "node:crypto";

function formatDateSection(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

export const orderNumberService = {
  create(currentDate = new Date()): string {
    const dateSection = formatDateSection(currentDate);
    const randomSection = randomBytes(4).toString("hex").toUpperCase();

    return `OHO-${dateSection}-${randomSection}`;
  },
};
