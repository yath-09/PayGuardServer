import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedBanks() {
  const banks = ["hdfc", "axis", "icici"];
  for (const bank of banks) {
    await prisma.bank.upsert({
      where: { name: bank },
      update: {},
      create: { name: bank },
    });
  }
  console.log("Default banks seeded");
}

seedBanks()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
