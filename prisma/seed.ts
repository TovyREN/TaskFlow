import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
    },
  });

  // Create a workspace for the test user
  const existingWorkspace = await prisma.workspace.findFirst({
    where: { ownerId: user.id }
  });

  if (!existingWorkspace) {
    await prisma.workspace.create({
      data: {
        name: 'My Workspace',
        description: 'Default workspace for testing',
        color: '#3b82f6',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN'
          }
        },
        boards: {
          create: [
            { title: 'My First Board', color: '#3b82f6' },
            { title: 'Project Ideas', color: '#8b5cf6' }
          ]
        }
      }
    });
  }

  console.log('Seed successful: Created user test@example.com with workspace');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });