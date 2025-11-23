console.log('Starting TemptMeet Backend...');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const apiRoutes = require('./routes/api');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

const allowedOrigins = ["https://temptmeet.vercel.app", "http://localhost:5173", "http://127.0.0.1:5173"];

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true
}));
app.use(express.json());

// Health Check
app.get('/', (req, res) => {
    res.status(200).send('TemptMeet Backend is running!');
});

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/temptmeet')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log('MongoDB Error:', err));

// Routes
app.use('/api', apiRoutes);

// Socket.io Logic for Matching
let waitingUsers = []; // Simple in-memory queue for demo

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_queue', async (data) => {
        const { interests, language, location } = data;

        // Save user to DB as online
        await User.create({
            socketId: socket.id,
            interests,
            language,
            location,
            isOnline: true
        });

        // Simple Matching Logic
        // Find a user in waitingUsers who matches language OR has common interest
        const matchIndex = waitingUsers.findIndex(user =>
            user.socketId !== socket.id &&
            (user.language === language || user.interests.some(i => interests.includes(i)))
        );

        if (matchIndex !== -1) {
            const partner = waitingUsers.splice(matchIndex, 1)[0];
            const roomId = `${socket.id}-${partner.socketId}`;

            socket.join(roomId);
            io.to(partner.socketId).socketsJoin(roomId); // Make partner join

            io.to(roomId).emit('match_found', { roomId });

            // Notify both
            io.to(socket.id).emit('partner_data', { socketId: partner.socketId });
            io.to(partner.socketId).emit('partner_data', { socketId: socket.id });

        } else {
            waitingUsers.push({ socketId: socket.id, interests, language, location });
        }
    });

    socket.on('send_message', (data) => {
        socket.to(data.roomId).emit('receive_message', data);
    });

    socket.on('skip', () => {
        // Logic to leave room and re-join queue would go here
        // For now, just disconnect from room
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
        waitingUsers = waitingUsers.filter(u => u.socketId !== socket.id);
        await User.deleteMany({ socketId: socket.id }); // Cleanup
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
