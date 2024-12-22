import { MessageModel } from "../model";
import { Op } from "sequelize";

// Track online users and their sockets
const onlineUsers = new Map();
// Track typing status
const typingUsers = new Map();

export const test = (socket: any) => {
  // Add user to online users when they connect
  onlineUsers.set(socket.user.id, socket);

  // Broadcast user's online status to their contacts
  socket.broadcast.emit("user_status", {
    userId: socket.user.id,
    status: "online",
  });

  // Initialize private chat with another user
  socket.on("start_chat", async (receiverId: string) => {
    try {
      // Get chat history between these two users
      const messages = await MessageModel.findAll({
        where: {
          [Op.or]: [
            { senderId: socket.user.id, receiverId: receiverId },
            { senderId: receiverId, receiverId: socket.user.id },
          ],
        },
        order: [["createdAt", "ASC"]],
      });

      socket.emit("chat_history", messages);
    } catch (error) {
      console.error("Error starting chat:", error);
      socket.emit("error", "Failed to start chat");
    }
  });

  // Send a private message
  socket.on(
    "send_message",
    async (data: { content: string; receiverId: string }) => {
      try {
        // Validate message
        if (!data.content?.trim()) {
          throw new Error("Message content cannot be empty");
        }

        // Generate temporary ID for optimistic UI
        const tempId = Date.now().toString();

        // Immediately emit to sender for optimistic UI
        socket.emit("message_sent", {
          id: tempId,
          content: data.content,
          senderId: socket.user.id,
          senderName: socket.user.name,
          receiverId: data.receiverId,
          createdAt: new Date(),
          delivered: false,
        });

        // Create message in database
        const newMessage = await MessageModel.create({
          senderId: socket.user.id,
          senderName: socket.user.name,
          receiverId: data.receiverId,
          content: data.content,
          delivered: false,
          readAt: null,
        });

        // Update sender with actual message ID
        socket.emit("message_confirmed", {
          tempId,
          actualId: newMessage.id,
        });

        // Send to receiver if they're online
        const receiverSocket = onlineUsers.get(data.receiverId);
        if (receiverSocket) {
          receiverSocket.emit("new_message", {
            id: newMessage.id,
            content: data.content,
            senderId: socket.user.id,
            senderName: socket.user.name,
            receiverId: data.receiverId,
            createdAt: newMessage.createdAt,
          });

          // Mark as delivered
          newMessage.delivered = true;
          await newMessage.save();
        }
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", "Failed to send message");
      }
    },
  );

  // Mark message as read
  socket.on("mark_as_read", async (messageId: string) => {
    try {
      const message = await MessageModel.findByPk(messageId);
      if (message && message.receiverId === socket.user.id) {
        message.readAt = new Date();
        await message.save();

        // Notify sender that message was read
        const senderSocket = onlineUsers.get(message.senderId);
        if (senderSocket) {
          senderSocket.emit("message_read", {
            messageId,
            readAt: message.readAt,
          });
        }
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  });

  // Handle typing indicators
  socket.on("typing_start", (receiverId: string) => {
    // Clear existing timeout if any
    if (typingUsers.has(socket.user.id)) {
      clearTimeout(typingUsers.get(socket.user.id));
    }

    // Set new timeout to automatically clear typing status
    const timeout = setTimeout(() => {
      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) {
        receiverSocket.emit("user_stopped_typing", {
          userId: socket.user.id,
        });
      }
      typingUsers.delete(socket.user.id);
    }, 3000);

    typingUsers.set(socket.user.id, timeout);

    // Notify receiver
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      receiverSocket.emit("user_typing", {
        userId: socket.user.id,
      });
    }
  });

  socket.on("typing_stop", (receiverId: string) => {
    // Clear timeout if exists
    if (typingUsers.has(socket.user.id)) {
      clearTimeout(typingUsers.get(socket.user.id));
      typingUsers.delete(socket.user.id);
    }

    // Notify receiver
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      receiverSocket.emit("user_stopped_typing", {
        userId: socket.user.id,
      });
    }
  });

  // Handle disconnect
  socket.on("disconnect", async () => {
    // Remove from online users
    onlineUsers.delete(socket.user.id);

    // Clear any typing timeouts
    if (typingUsers.has(socket.user.id)) {
      clearTimeout(typingUsers.get(socket.user.id));
      typingUsers.delete(socket.user.id);
    }

    // Broadcast offline status
    socket.broadcast.emit("user_status", {
      userId: socket.user.id,
      status: "offline",
    });
  });
};
