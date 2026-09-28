import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../../api";
import "../dashboard/dashboard.css";
import { useSocket } from "../../socketContext";

const API_URL = import.meta.env.VITE_API_URL;

const Chat = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const { lastEvent } = useSocket();

  useEffect(() => {
    const loadUsers = async () => {
      const res = await fetchWithAuth(`${API_URL}/chat/users`);
      const data = await res.json();
      if (data.success) setUsers(data.users);
    };
    loadUsers();
  }, []);

  useEffect(() => {
    if (!selectedUser) return;

    const loadHistory = async () => {
      const res = await fetchWithAuth(`${API_URL}/messages/${selectedUser.id}`);
      const data = await res.json();
      if (data.success) setMessages(data.messages);
    };
    loadHistory();
  }, [selectedUser]);

  useEffect(() => {
    if (!lastEvent || lastEvent.type !== "new_message") return;
    if (!selectedUser || lastEvent.data.sender_id !== selectedUser.id) return;

    setMessages((prev) => [...prev, lastEvent.data]);
  }, [lastEvent]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedUser || !text.trim()) return;

    const res = await fetchWithAuth(`${API_URL}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiverId: selectedUser.id,
        content: text.trim(),
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.message);
      return;
    }

    setMessages((prev) => [...prev, data.message]);
    setText("");
  };

  return (
    <div className="chat">
      <h2 style={{ color: "orange" }}>Chat</h2>

      <div className="chat-users">
        {users.map((user) => (
          <button key={user.id} onClick={() => setSelectedUser(user)}>
            {user.email}
          </button>
        ))}
      </div>

      {selectedUser && (
        <>
          <h3>Chat with {selectedUser.email}</h3>

          <div className="chat-messages">
            {messages.map((msg) => (
              <p key={msg.id}>
                <strong>
                  {msg.sender_id === selectedUser.id
                    ? selectedUser.email
                    : "Me"}
                  :
                </strong>{" "}
                {msg.content}
              </p>
            ))}
          </div>

          <form onSubmit={handleSend}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message"
            />
            <button>Send</button>
          </form>
        </>
      )}
    </div>
  );
};

export default Chat;
