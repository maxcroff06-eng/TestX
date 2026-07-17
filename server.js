const express = require("express"); // Line 1: Express ko import karna
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express(); // Line 5: 'app' ko define karna (Ye line missing thi)
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// HTML serve karne ke liye - index.html 'public' folder mein honi chahiye
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Game Data Storage
let rooms = {};

// 6-digit room code banane ke liye
function createCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Room Create Karna
    socket.on("create-room", (data) => {
        let room = createCode();
        rooms[room] = {
            host: socket.id,
            players: []
        };
        rooms[room].players.push({
            id: socket.id,
            name: data.name,
            avatar: data.avatar,
            correct: 0,
            score: 0,
            totalTime: 0
        });
        socket.join(room);
        socket.emit("room-created", { room: room });
        io.to(room).emit("players-update", rooms[room].players);
    });

    // Room Join Karna
    socket.on("join-room", (data) => {
        let room = data.room;
        if (!rooms[room]) {
            socket.emit("error-msg", "Room Not Found!");
            return;
        }
        socket.join(room);
        rooms[room].players.push({
            id: socket.id,
            name: data.name,
            avatar: data.avatar,
            correct: 0,
            score: 0,
            totalTime: 0
        });
        io.to(room).emit("players-update", rooms[room].players);
    });

    socket.on("start-game", (room) => {
        io.to(room).emit("game-start");
    });

    socket.on("submit-answer", (data) => {
        let room = data.room;
        if (!rooms[room]) return;
        let player = rooms[room].players.find(p => p.id === socket.id);
        if (player) {
            player.score = data.score;
            player.correct = data.correctAnswers;
            player.totalTime = data.totalTime;
            rooms[room].players.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.totalTime - b.totalTime;
            });
            io.to(room).emit("rank-update", rooms[room].players);
        }
    });

    socket.on("finish-game", (room) => {
        if (rooms[room]) {
            io.to(room).emit("final-board", rooms[room].players);
        }
    });

    socket.on("disconnect", () => {
        for (let room in rooms) {
            rooms[room].players = rooms[room].players.filter(p => p.id !== socket.id);
            if (rooms[room].players.length === 0) {
                delete rooms[room];
            } else {
                io.to(room).emit("players-update", rooms[room].players);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
