"use server";

import { prisma } from '@/lib/prisma';

export async function loginUser(email: string, password?: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.password && user.password !== password) {
       return { success: false, error: "Invalid password" };
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

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
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
