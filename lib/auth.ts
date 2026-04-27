import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export async function signUp(email: string, username: string, password: string) {
  try {
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password_hash,
      },
    });

    return { success: true, user };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Email or username already taken' };
    }
    return { success: false, error: error.message };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUser(id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        projects: true,
        scripts: true,
      },
    });
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProfile(
  id: string,
  data: {
    bio?: string;
    location?: string;
    specialty?: string;
    avatar?: string;
  }
) {
  try {
    const user = await prisma.user.update({
      where: { id },
      data,
    });
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCrewDirectory(filters?: {
  specialty?: string;
  location?: string;
  availability?: string;
}) {
  try {
    const users = await prisma.user.findMany({
      where: {
        ...(filters?.specialty && { specialty: { contains: filters.specialty } }),
        ...(filters?.location && { location: filters.location }),
        ...(filters?.availability && { availability: filters.availability }),
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        location: true,
        specialty: true,
        hourly_rate: true,
        followers_count: true,
      },
    });
    return { success: true, users };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
