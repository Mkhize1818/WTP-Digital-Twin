import React from "react";

const ChatMessage = ({ msg }) => (
  <div
    className="p-2 rounded-sm"
    style={{
      backgroundColor: msg.role === "user" ? "#1A1A1A" : "#121212",
      borderLeft:
        msg.role === "assistant"
          ? "2px solid #007AFF"
          : "2px solid #A3A3A3",
    }}
    data-testid={`chat-message-${msg.id}`}
  >
    <span
      className="text-xs font-bold uppercase tracking-wider mb-1 block"
      style={{
        color: msg.role === "user" ? "#A3A3A3" : "#007AFF",
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
