import React from "react";

const ChatMessage = ({ msg }) => (
  <div
    className="p-2 rounded-sm"
    style={{
      backgroundColor: msg.role === "user" ? "#E8F0F8" : "#F4F8FC",
      borderLeft:
        msg.role === "assistant"
          ? "2px solid #1171b8"
          : "2px solid #C9E0EF",
    }}
    data-testid={`chat-message-${msg.id}`}
  >
    <span
      className="text-xs font-bold uppercase tracking-wider mb-1 block"
      style={{
        color: msg.role === "user" ? "#C9E0EF" : "#1171b8",
        fontFamily: "JetBrains Mono, monospace",
      }}
    >
      {msg.role}
    </span>
    <p
      className="text-sm leading-relaxed"
      style={{
        color: "#062C60",
        fontFamily:
          msg.role === "assistant"
            ? "IBM Plex Sans, sans-serif"
            : "JetBrains Mono, monospace",
      }}
    >
      {msg.content}
    </p>
  </div>
);

export default ChatMessage;
