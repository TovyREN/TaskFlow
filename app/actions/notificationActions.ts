"use server";

import { prisma } from '@/lib/prisma';
import { emitToUser } from '@/lib/socket';

const NOTIFICATION_INCLUDE = {
  task: {
    select: {
      id: true,
      title: true,
      list: {
        select: {
          board: {
            select: { id: true, workspaceId: true }
          }
        }
      }
    }
  },
  actor: {
    select: { id: true, name: true, email: true }
  },
  workspaceInvitation: {
    select: {
      id: true,
      status: true,
      role: true,
      workspace: {
        select: { id: true, name: true, color: true }
      }
    }
  }
};

export async function createNotification(data: {
  type: 'TASK_ASSIGNED' | 'DUE_DATE_APPROACHING' | 'WORKSPACE_INVITATION';
  message: string;
  userId: string;
  taskId?: string;
  actorId?: string;
  workspaceInvitationId?: string;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        type: data.type,
        message: data.message,
        userId: data.userId,
        taskId: data.taskId || null,
        actorId: data.actorId || null,
        workspaceInvitationId: data.workspaceInvitationId || null,
      },
      include: NOTIFICATION_INCLUDE
    });

    emitToUser(data.userId, 'notification:new', notification);

    return { success: true, notification };
  } catch (error) {
    console.error("Failed to create notification:", error);
    return { success: false };
  }
}

export async function getNotifications(userId: string) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: NOTIFICATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return notifications;
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }
}

export async function getUnreadNotificationCount(userId: string) {
  try {
    const count = await prisma.notification.count({
      where: { userId, isRead: false }
    });
    return count;
  } catch (error) {
    console.error("Failed to get unread count:", error);
    return 0;
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  try {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true }
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return { success: false };
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return { success: false };
  }
}

export async function checkDueDateNotifications(userId: string) {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingTasks = await prisma.task.findMany({
      where: {
        assignees: {
          some: { userId }
        },
        dueDate: {
          gte: now,
          lte: in24Hours
        }
      },
      include: {
        list: {
          select: {
            title: true,
            board: {
              select: { id: true, title: true, workspaceId: true }
            }
          }
        }
      }
    });

    let created = 0;
    for (const task of upcomingTasks) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          taskId: task.id,
          type: 'DUE_DATE_APPROACHING'
        }
      });

      if (!existing) {
        const hoursLeft = Math.round((task.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60));
        await createNotification({
          type: 'DUE_DATE_APPROACHING',
          message: `"${task.title}" expire dans ${hoursLeft} heure${hoursLeft !== 1 ? 's' : ''} (Board: ${task.list.board.title})`,
          userId,
          taskId: task.id,
        });
        created++;
      }
    }

    return { success: true, created };
  } catch (error) {
    console.error("Failed to check due date notifications:", error);
    return { success: false, created: 0 };
  }
}
