//npx prisma migrate dev
//for migrations of the script

// . Delete Stale Prisma Files
// Manually delete the .prisma folder in node_modules:
// bash
// Copy code
// rm -rf node_modules/.prisma
// Regenerate the Prisma Client:
// bash
// Copy code
// npx prisma generate
//npx prisma migrate dev --name changes_made

// npx prisma db seed