import React, { useEffect, useState, useRef } from "react";
import { fetchWithAuth } from "../../api";
import "./chat.css";
import { useSocket } from "../../socketContext";
import { useAuth } from "../../authContext";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const Chat = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const { lastEvent, onlineUsers } = useSocket();
  const { isLoggedIn, loading } = useAuth();
  const navigate = useNavigate();
  const textRef = useRef(null);

  // Redirect to login if the user is not authenticated
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate("/login");
    }
  }, []);

  // Fetch the list of chat users
  useEffect(() => {
    const loadUsers = async () => {
      const res = await fetchWithAuth(`${API_URL}/chat/users`);
      const data = await res.json();
      if (data.success) setUsers(data.users);
    };
    loadUsers();
  }, []);

  // Fetch message history when the selected user changes
  useEffect(() => {
    if (!selectedUser) return;

    const loadHistory = async () => {
      const res = await fetchWithAuth(`${API_URL}/messages/${selectedUser.id}`);
      const data = await res.json();
      if (data.success) setMessages(data.messages);
    };
    loadHistory();
  }, [selectedUser]);

  // Scroll to the bottom whenever messages change
  useEffect(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
    // setTimeout(() => {
    //   textRef.current.focus();
    // }, 400);
  }, [messages]);

  // Add incoming messages from the selected user to the chat
  useEffect(() => {
    if (!lastEvent || lastEvent.type !== "new_message") return;
    if (!selectedUser || lastEvent.data.sender_id !== selectedUser.id) return;
    setMessages((prev) => [...prev, lastEvent.data]);
  }, [lastEvent]);

  // add handle delivered_at
  useEffect(() => {
    if (!lastEvent || lastEvent.type !== "message_delivered") return;
    setMessages((prev) =>
      prev.map((msg) =>
        String(msg.id) === String(lastEvent.data.messageId)
          ? { ...msg, delivered_at: lastEvent.data.delivered_at }
          : msg,
      ),
    );
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

  if (loading) {
    return <p>loading...</p>;
  }

  return (
    <div className="chat">
      <h2 style={{ color: "orange" }}>Chat</h2>

      <div className="chat-users">
        {users.map((user) => (
          <button key={user.id} onClick={() => setSelectedUser(user)}>
            <span
              style={{
                color: onlineUsers.has(String(user.id)) ? "green" : "gray",
              }}
            >
              ●
            </span>{" "}
            {user.email}
          </button>
        ))}
      </div>

      {selectedUser && (
        <>
          <h3>Chat with {selectedUser.email}</h3>

          <div className="chat-messages">
            {messages.map((msg) =>
              msg.sender_id === selectedUser.id ? (
                <p key={msg.id}>
                  <strong>
                    {selectedUser.email}: {msg.content}
                  </strong>
                </p>
              ) : (
                <p key={msg.id}>
                  <strong className="meStrong">
                    Me: {msg.content}{" "}
                    <span style={{ fontSize: "small" }}>
                      {msg.delivered_at ? "✓✓" : "✓"}
                    </span>
                  </strong>{" "}
                </p>
              ),
            )}
          </div>

          <form onSubmit={handleSend}>
            <textarea
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message"
            />
            <button className="chatBtn">Send</button>
          </form>
        </>
      )}
    </div>
  );
};

export default Chat;
