import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store connected sockets by user ID and workspace/board subscriptions
const connectedUsers = new Map();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Make io globally accessible for API routes/server actions
  global.io = io;

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // User authentication - client sends userId on connect
    socket.on('authenticate', (userId) => {
      socket.userId = userId;
      connectedUsers.set(socket.id, { userId, socket });
      console.log(`User ${userId} authenticated with socket ${socket.id}`);
    });

    // Subscribe to workspace updates
    socket.on('join-workspace', (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
      console.log(`Socket ${socket.id} joined workspace:${workspaceId}`);
    });

    // Leave workspace room
    socket.on('leave-workspace', (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
      console.log(`Socket ${socket.id} left workspace:${workspaceId}`);
    });

    // Subscribe to board updates
    socket.on('join-board', (boardId) => {
      socket.join(`board:${boardId}`);
      console.log(`Socket ${socket.id} joined board:${boardId}`);
    });

    // Leave board room
    socket.on('leave-board', (boardId) => {
      socket.leave(`board:${boardId}`);
      console.log(`Socket ${socket.id} left board:${boardId}`);
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);
      console.log('Client disconnected:', socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Socket.io server is running');
  });
});
