import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'peter@misfitscavern.com' },
    update: {},
    create: {
      email: 'peter@misfitscavern.com',
      username: 'lonerkid',
      password_hash: await bcrypt.hash('test123', 10),
      avatar: 'https://via.placeholder.com/150',
      bio: 'Creator of Misfits Cavern. Building the future of collaborative filmmaking.',
      location: 'Calgary, AB',
      tier: 'STUDIO',
      specialty: JSON.stringify(['Director', 'Writer', 'Producer']),
    },
  });

  console.log(`✓ Created user: ${user.username}`);

  // Create Femme Fatale project
  const project = await prisma.project.upsert({
    where: { id: 'femme-fatale' },
    update: {},
    create: {
      id: 'femme-fatale',
      creator_id: user.id,
      title: 'Femme Fatale',
      description: 'A gritty, character-driven thriller. Our flagship production.',
      status: 'production',
      genre: 'Thriller',
      visibility: 'public',
      featured: true,
      cover_image: 'https://via.placeholder.com/1200x600',
    },
  });

  console.log(`✓ Created project: ${project.title}`);

  // Create sample script
  const script = await prisma.script.upsert({
    where: { id: 'femme-fatale-draft' },
    update: {},
    create: {
      id: 'femme-fatale-draft',
      user_id: user.id,
      project_id: project.id,
      title: 'Femme Fatale - Draft 8',
      content: `INT. ABANDONED WAREHOUSE - NIGHT

Cold. Metal. Echoes.

A figure emerges from the darkness.

MAYA (V.O.)
(whispered)
They said I was the problem.

She steps into a shaft of light.

MAYA

I wasn't.`,
      status: 'ready',
      visibility: 'public',
      page_count: 120,
      word_count: 28500,
    },
  });

  console.log(`✓ Created script: ${script.title}`);

  console.log('✅ Database seeding complete!');
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
