require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const messageRoutes = require("./routes/messages");
const Message = require("./models/Message");
const User = require("./models/User");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("لا يوجد توكن"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("توكن غير صالح"));
  }
});

io.on("connection", async (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);

  await User.findByIdAndUpdate(userId, { isOnline: true });
  io.emit("user_status_changed", { userId, isOnline: true });

  console.log(`✅ مستخدم متصل: ${userId}`);

  socket.on("send_message", async ({ receiverId, text }) => {
    try {
      const message = await Message.create({
        sender: userId,
        receiver: receiverId,
        text,
        status: "sent",
      });

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_message", message);
        message.status = "delivered";
        await message.save();
      }

      socket.emit("message_sent", message);
    } catch (err) {
      socket.emit("error_message", { message: "فشل إرسال الرسالة" });
    }
  });

  socket.on("typing", ({ receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId: userId });
    }
  });

  socket.on("stop_typing", ({ receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stop_typing", { senderId: userId });
    }
  });

  socket.on("mark_as_read", async ({ otherUserId }) => {
    await Message.updateMany(
      { sender: otherUserId, receiver: userId, status: { $ne: "read" } },
      { status: "read" }
    );
    const senderSocketId = onlineUsers.get(otherUserId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messages_read", { readerId: userId });
    }
  });

  socket.on("disconnect", async () => {
    onlineUsers.delete(userId);
    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastSeen: new Date(),
    });
    io.emit("user_status_changed", { userId, isOnline: false });
    console.log(`❌ مستخدم غير متصل: ${userId}`);
  });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ متصل بقاعدة البيانات MongoDB");
    server.listen(PORT, () => {
      console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ فشل الاتصال بقاعدة البيانات:", err.message);
  });
