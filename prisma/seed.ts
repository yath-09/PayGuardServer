import { exec } from "child_process";

// Run individual seed scripts
async function main() {
  //console.log("Seeding banks...");
  // await exec("ts-node prisma/seeds/seedBanks.ts");

  console.log("Seeding User and respective banks...");
  await exec("ts-node prisma/seeds/seedUserAndBank.ts")

  
  console.log("Seeding complete!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
