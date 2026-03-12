import { prisma } from '../../lib/prisma';
import { emitToUser } from '../../lib/socket';
import {
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  checkDueDateNotifications,
} from '../../app/actions/notificationActions';

const mockPrisma = prisma as unknown as {
  notification: { [k: string]: jest.Mock };
  task: { [k: string]: jest.Mock };
};
const mockEmitToUser = emitToUser as jest.Mock;

describe('notificationActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── createNotification ──────────────────────────────────────────────

  describe('createNotification', () => {
    const data = {
      type: 'TASK_ASSIGNED' as const,
      message: 'You were assigned a task',
      userId: 'user-1',
      taskId: 'task-1',
      actorId: 'actor-1',
    };

    it('creates a notification and emits to user on success', async () => {
      const created = { id: 'notif-1', ...data };
      mockPrisma.notification.create.mockResolvedValue(created);

      const result = await createNotification(data);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          type: data.type,
          message: data.message,
          userId: data.userId,
          taskId: data.taskId,
          actorId: data.actorId,
          workspaceInvitationId: null,
        },
        include: expect.objectContaining({ task: expect.any(Object), actor: expect.any(Object) }),
      });
      expect(mockEmitToUser).toHaveBeenCalledWith(data.userId, 'notification:new', created);
      expect(result).toEqual({ success: true, notification: created });
    });

    it('returns { success: false } on error', async () => {
      mockPrisma.notification.create.mockRejectedValue(new Error('DB error'));

      const result = await createNotification(data);

      expect(result).toEqual({ success: false });
    });

    it('handles missing optional fields (taskId, actorId)', async () => {
      const minimalData = {
        type: 'WORKSPACE_INVITATION' as const,
        message: 'You were invited',
        userId: 'user-1',
      };
      const created = { id: 'notif-2', ...minimalData };
      mockPrisma.notification.create.mockResolvedValue(created);

      const result = await createNotification(minimalData);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          taskId: null,
          actorId: null,
          workspaceInvitationId: null,
        }),
        include: expect.any(Object),
      });
      expect(result).toEqual({ success: true, notification: created });
    });
  });

  // ── getNotifications ────────────────────────────────────────────────

  describe('getNotifications', () => {
    it('returns a list of notifications', async () => {
      const notifications = [{ id: 'n1' }, { id: 'n2' }];
      mockPrisma.notification.findMany.mockResolvedValue(notifications);

      const result = await getNotifications('user-1');

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' }, orderBy: { createdAt: 'desc' }, take: 100 }),
      );
      expect(result).toEqual(notifications);
    });

    it('returns empty array on error', async () => {
      mockPrisma.notification.findMany.mockRejectedValue(new Error('DB error'));

      const result = await getNotifications('user-1');

      expect(result).toEqual([]);
    });
  });

  // ── getUnreadNotificationCount ──────────────────────────────────────

  describe('getUnreadNotificationCount', () => {
    it('returns the unread count', async () => {
      mockPrisma.notification.count.mockResolvedValue(7);

      const result = await getUnreadNotificationCount('user-1');

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
      expect(result).toBe(7);
    });

    it('returns 0 on error', async () => {
      mockPrisma.notification.count.mockRejectedValue(new Error('DB error'));

      const result = await getUnreadNotificationCount('user-1');

      expect(result).toBe(0);
    });
  });

  // ── markNotificationAsRead ──────────────────────────────────────────

  describe('markNotificationAsRead', () => {
    it('marks a single notification as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await markNotificationAsRead('notif-1', 'user-1');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { isRead: true },
      });
      expect(result).toEqual({ success: true });
    });

    it('returns { success: false } on error', async () => {
      mockPrisma.notification.updateMany.mockRejectedValue(new Error('DB error'));

      const result = await markNotificationAsRead('notif-1', 'user-1');

      expect(result).toEqual({ success: false });
    });
  });

  // ── markAllNotificationsAsRead ──────────────────────────────────────

  describe('markAllNotificationsAsRead', () => {
    it('marks all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await markAllNotificationsAsRead('user-1');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
      expect(result).toEqual({ success: true });
    });

    it('returns { success: false } on error', async () => {
      mockPrisma.notification.updateMany.mockRejectedValue(new Error('DB error'));

      const result = await markAllNotificationsAsRead('user-1');

      expect(result).toEqual({ success: false });
    });
  });

  // ── checkDueDateNotifications ───────────────────────────────────────

  describe('checkDueDateNotifications', () => {
    const userId = 'user-1';

    it('creates notifications for tasks without existing ones', async () => {
      const now = Date.now();
      const dueDate = new Date(now + 12 * 60 * 60 * 1000); // 12 hours from now

      const tasks = [
        {
          id: 'task-1',
          title: 'Finish report',
          dueDate,
          list: { title: 'To Do', board: { id: 'board-1', title: 'Project X', workspaceId: 'ws-1' } },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(tasks);
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-new' });

      const result = await checkDueDateNotifications(userId);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignees: { some: { userId } },
            dueDate: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
          }),
        }),
      );
      expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
        where: { userId, taskId: 'task-1', type: 'DUE_DATE_APPROACHING' },
      });
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(result).toEqual({ success: true, created: 1 });
    });

    it('skips tasks with existing notification', async () => {
      const dueDate = new Date(Date.now() + 6 * 60 * 60 * 1000);

      const tasks = [
        {
          id: 'task-2',
          title: 'Review PR',
          dueDate,
          list: { title: 'In Progress', board: { id: 'board-2', title: 'Dev', workspaceId: 'ws-2' } },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(tasks);
      mockPrisma.notification.findFirst.mockResolvedValue({ id: 'existing-notif' });

      const result = await checkDueDateNotifications(userId);

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, created: 0 });
    });

    it('uses singular "heure" when exactly 1 hour left', async () => {
      const dueDate = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now

      const tasks = [
        {
          id: 'task-3',
          title: 'Urgent task',
          dueDate,
          list: { title: 'To Do', board: { id: 'board-1', title: 'Project X', workspaceId: 'ws-1' } },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(tasks);
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-singular' });

      const result = await checkDueDateNotifications(userId);

      expect(result).toEqual({ success: true, created: 1 });
      // Verify the message uses singular form
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            message: expect.stringContaining('1 heure'),
          }),
        }),
      );
    });

    it('returns { success: false, created: 0 } on error', async () => {
      mockPrisma.task.findMany.mockRejectedValue(new Error('DB error'));

      const result = await checkDueDateNotifications(userId);

      expect(result).toEqual({ success: false, created: 0 });
    });
  });
});
