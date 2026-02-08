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
