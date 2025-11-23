import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);

// Security Middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS Configuration
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/temptmeet', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ MongoDB Error:', err));

// Import Models
import './models/User.js';
import './models/Report.js';
import './models/Chat.js';

// Import Routes
import apiRoutes from './routes/api.js';
app.use('/api', apiRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Socket.io Logic
let waitingUsers = new Map();
let activeRooms = new Map();

io.on('connection', (socket) => {
    console.log('🔗 User connected:', socket.id);

    socket.on('join_queue', async (data) => {
        const { interests, language, location, mode, userId } = data;

        try {
            // Save/update user in database
            const User = mongoose.model('User');
            await User.findOneAndUpdate(
                { socketId: socket.id },
                {
                    socketId: socket.id,
                    userId,
                    interests,
                    language,
                    location,
                    mode,
                    isOnline: true,
                    lastSeen: new Date()
                },
                { upsert: true, new: true }
            );

            // Add to waiting queue
            waitingUsers.set(socket.id, {
                socketId: socket.id,
                userId,
                interests,
                language,
                location,
                mode,
                joinedAt: new Date()
            });

            socket.emit('queue_joined', { position: waitingUsers.size });

            // Try to find match
            findMatch(socket.id);
        } catch (error) {
            console.error('Error joining queue:', error);
            socket.emit('error', { message: 'Failed to join queue' });
        }
    });

    socket.on('leave_queue', () => {
        waitingUsers.delete(socket.id);
        socket.emit('queue_left');
    });

    // WebRTC Signaling
    socket.on('offer', (data) => {
        socket.to(data.roomId).emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.to(data.roomId).emit('answer', data);
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.roomId).emit('ice-candidate', data);
    });

    // Chat Messages
    socket.on('send_message', async (data) => {
        const { roomId, text, userId } = data;

        try {
            // Save message to database
            const Chat = mongoose.model('Chat');
            const message = new Chat({
                roomId,
                userId,
                text,
                timestamp: new Date()
            });
            await message.save();

            // Broadcast to room
            socket.to(roomId).emit('receive_message', {
                ...data,
                timestamp: message.timestamp
            });
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    socket.on('typing_start', (data) => {
        socket.to(data.roomId).emit('user_typing', { userId: data.userId });
    });

    socket.on('typing_stop', (data) => {
        socket.to(data.roomId).emit('user_stopped_typing', { userId: data.userId });
    });

    socket.on('skip_partner', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('partner_skipped');
        leaveRoom(socket.id);
        // Rejoin queue if desired
        setTimeout(() => {
            if (waitingUsers.has(socket.id)) {
                findMatch(socket.id);
            }
        }, 1000);
    });

    socket.on('report_user', async (data) => {
        try {
            const Report = mongoose.model('Report');
            await Report.create({
                reporterId: data.reporterId,
                reportedUserId: data.reportedUserId,
                reason: data.reason,
                roomId: data.roomId,
                timestamp: new Date()
            });

            socket.emit('report_success');
        } catch (error) {
            console.error('Error reporting user:', error);
            socket.emit('report_error');
        }
    });

    socket.on('disconnect', async () => {
        console.log('🔌 User disconnected:', socket.id);
        waitingUsers.delete(socket.id);
        leaveRoom(socket.id);

        try {
            const User = mongoose.model('User');
            await User.findOneAndUpdate(
                { socketId: socket.id },
                {
                    isOnline: false,
                    lastSeen: new Date()
                }
            );
        } catch (error) {
            console.error('Error updating user status:', error);
        }
    });

    function findMatch(userSocketId) {
        const user = waitingUsers.get(userSocketId);
        if (!user) return;

        for (const [otherSocketId, otherUser] of waitingUsers.entries()) {
            if (otherSocketId === userSocketId) continue;

            // Match criteria
            const languageMatch = user.language === otherUser.language;
            const modeMatch = user.mode === otherUser.mode;
            const interestMatch = user.interests.some(interest =>
                otherUser.interests.includes(interest)
            );

            if ((languageMatch || interestMatch) && modeMatch) {
                // Create room
                const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Remove both from queue
                waitingUsers.delete(userSocketId);
                waitingUsers.delete(otherSocketId);

                // Create room
                activeRooms.set(roomId, {
                    users: [userSocketId, otherSocketId],
                    createdAt: new Date(),
                    mode: user.mode
                });

                // Join rooms
                socket.join(roomId);
                io.sockets.sockets.get(otherSocketId)?.join(roomId);

                // Notify users
                io.to(userSocketId).emit('match_found', {
                    roomId,
                    initiator: true,
                    partner: {
                        interests: otherUser.interests,
                        language: otherUser.language,
                        location: otherUser.location
                    }
                });

                io.to(otherSocketId).emit('match_found', {
                    roomId,
                    initiator: false,
                    partner: {
                        interests: user.interests,
                        language: user.language,
                        location: user.location
                    }
                });

                break;
            }
        }
    }

    function leaveRoom(socketId) {
        for (const [roomId, room] of activeRooms.entries()) {
            if (room.users.includes(socketId)) {
                // Notify partner
                room.users.forEach(userId => {
                    if (userId !== socketId) {
                        io.to(userId).emit('partner_left');
                    }
                });

                // Cleanup room
                activeRooms.delete(roomId);
                break;
            }
        }
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
});