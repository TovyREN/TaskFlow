FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000
EXPOSE 5555

CMD ["npm", "start"]