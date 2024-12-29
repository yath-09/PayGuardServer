FROM node:20

WORKDIR /app

COPY package*.json ./
# copying the prisma client
COPY prisma ./prisma

RUN npx prisma generate

RUN npm install

COPY . .

EXPOSE 8000


CMD ["npm", "run", "dev"]
