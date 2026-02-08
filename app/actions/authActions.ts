"use server";

import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';

export async function loginUser(email: string, password?: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Handle password verification with gradual migration
    if (user.password) {
      if (!password) {
        return { success: false, error: "Password required" };
      }

      // Check if password is already hashed (bcrypt hashes start with $2b$ or $2a$)
      const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');

      if (!isHashed) {
        // Legacy plaintext password - verify directly
        if (user.password !== password) {
          return { success: false, error: "Invalid password" };
        }

        // Immediately re-hash the password
        const hashedPassword = await hashPassword(password);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });
      } else {
        // Modern hashed password - use bcrypt
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          return { success: false, error: "Invalid password" };
        }
      }
    }

    return { 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`
      } 
    };
  } catch (error) {
    console.error("Database error:", error);
    return { success: false, error: "Authentication failed" };
  }
}

export async function registerUser(name: string, email: string, password: string) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "Email already registered" };
    }

    // Hash password before storing
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return { 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name || name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`
      } 
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "Registration failed" };
  }
}

export async function loginWithGoogle(googleToken: string) {
  try {
    const { OAuth2Client } = await import('google-auth-library');
    
    const client = new OAuth2Client(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    // Verify the token
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return { success: false, error: "Invalid token" };
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return { success: false, error: "Email not found in Google profile" };
    }

    // Check if user exists with this googleId
    let user = await prisma.user.findUnique({
      where: { googleId: googleId as string },
    });

    // If not, try to find by email
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email },
      });

      // If user exists with same email but no googleId, link the Google account
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleId as string,
            googleImage: picture as string,
          },
        });
      }
    }

    // If still no user, create a new one
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          googleId: googleId as string,
          googleImage: picture as string,
        },
      });
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || email.split('@')[0],
        avatar: user.googleImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`,
      },
    };
  } catch (error) {
    console.error("Google OAuth error:", error);
    return { success: false, error: "Google authentication failed" };
  }
}
