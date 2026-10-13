const messageService = require("../services/messageService");

// Create a message
async function createMessage(req, res) {
  const { receiverId, content } = req.body;

  // Validate required input
  if (!receiverId || !content?.trim()) {
    return res.status(400).json({
      success: false,
      message: "receiverId and content are required",
    });
  }

  // Prevent sending a message to yourself
  if (Number(receiverId) === req.user.id) {
    return res.status(400).json({
      success: false,
      message: "You cannot send a message to yourself",
    });
  }

  // Validate message length
  if (content.trim().length > 1000) {
    return res.status(400).json({
      success: false,
      message: "Message is too long (max 1000 characters)",
    });
  }

  // Save message and send WebSocket notification
  const message = await messageService.messageTo(
    req.user.id,
    receiverId,
    content.trim(),
  );

  // Send HTTP response
  res.status(201).json({
    success: true,
    message,
  });
}

async function handleGetMessages(req, res) {
  const { userId } = req.params;
  const messages = await messageService.getMessages(req.user.id, userId);
  res.status(200).json({
    success: true,
    messages,
  });
}

async function handleGetChatUsers(req, res) {
  const users = await messageService.getChatUsers(req.user.id);

  res.status(200).json({
    success: true,
    users,
  });
}

module.exports = {
  createMessage,
  handleGetMessages,
  handleGetChatUsers,
};
