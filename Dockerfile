FROM node:20-alpine

WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the Next.js app
RUN npm run build

EXPOSE 3000

EXPOSE 5555

CMD ["npm", "start"]