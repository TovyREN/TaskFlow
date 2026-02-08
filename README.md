## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Run with Docker

**Prerequisites:** Docker

1. Launch App & Database:
   `sudo docker compose up --build -d`
2. Initialize the Database:
   `sudo docker compose exec app npx prisma db push`

## Database Management

**Prerequisites:** Docker

1. Prisma Studio:
   `sudo docker compose exec app npx prisma studio --port 5555 --browser none`

2. sync the changes with:
   `sudo docker compose exec app npx prisma generate \n sudo docker compose exec app npx prisma db push`
