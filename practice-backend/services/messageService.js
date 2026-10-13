const { pool } = require("../config/db");
const { sendToUser } = require("../websocket");

async function messageTo(senderId, receiverId, content) {
  const result = await pool.query(
    `
    INSERT INTO messages (sender_id, receiver_id, content)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [senderId, receiverId, content],
  );

  const message = result.rows[0];

  sendToUser(receiverId, {
    type: "new_message",
    data: message,
  });

  return message;
}

async function getMessages(senderId, receiverId) {
  const result = await pool.query(
    `
      SELECT *
      FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
      `,
    [senderId, receiverId],
  );
  const messages = result.rows;
  return messages;
}

async function getChatUsers(id) {
  const result = await pool.query(
    `
      SELECT id, email
      FROM users
      WHERE id <> $1
      ORDER BY email ASC
      `,
    [id],
  );
  const users = result.rows;
  return users;
}

module.exports = {
  messageTo,
  getMessages,
  getChatUsers,
};
