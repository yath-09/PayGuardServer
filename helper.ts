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


//build the docker image
//docker build -t payguardserver .

//run the docker image
// 8000:3000 8000 is the outside world and 3000 inside world so PORT should also be same as 3000

//docker run -p 8000:8000 --env DATABASE_URL="your_database_url" --env PORT=your_port --env JWT_SECRET="YOurSecret" payguardserver
//or run below to inclide everthing
//docker run -p 8000:8000 --env-file .env your_docker_image_name
