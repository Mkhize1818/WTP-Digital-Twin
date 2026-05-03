import React from "react";

const ChatMessage = ({ msg }) => (
  <div
    className="p-2 rounded-sm"
    style={{
      backgroundColor: msg.role === "user" ? "#163F56" : "#0B1D3A",
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
        color: "#FFFFFF",
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
