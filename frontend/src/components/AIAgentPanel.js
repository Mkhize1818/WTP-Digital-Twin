import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { PaperPlaneRight, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AIAgentPanel = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);

    try {
      const response = await axios.post(`${API}/ai/query`, {
        query,
        session_id: sessionId,
      });

      const assistantMessage = { role: "assistant", content: response.data.response };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error querying AI:", error);
      toast.error("Failed to get AI response");
      const errorMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error processing your request.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQueries = [
    "How much water has passed through today?",
    "Show me chlorine compliance status",
    "When was the last anomaly detected?",
    "What's the average pressure?",
  ];

  return (
    <div
      className="border p-4 md:p-6 flex flex-col"
      style={{
        backgroundColor: "#0A0A0A",
        borderColor: "rgba(0, 122, 255, 0.5)",
        minHeight: "500px",
        maxHeight: "500px",
      }}
      data-testid="ai-agent-panel"
    >
      <div className="mb-4">
        <h3
          className="text-lg md:text-xl font-semibold tracking-tight mb-1"
          style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
        >
          AI Agent
        </h3>
        <p className="text-xs" style={{ color: "#A3A3A3" }}>
          Ask questions about the system
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: "#A3A3A3" }}>
              Try asking:
            </p>
            {suggestedQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(q)}
                className="w-full text-left text-xs p-2 border rounded-sm hover:border-[#007AFF] transition-colors"
                style={{
                  backgroundColor: "#121212",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  color: "#A3A3A3",
                }}
                data-testid={`suggested-query-${idx}`}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className="p-2 rounded-sm"
            style={{
              backgroundColor: msg.role === "user" ? "#1A1A1A" : "#121212",
              borderLeft:
                msg.role === "assistant"
                  ? "2px solid #007AFF"
                  : "2px solid #A3A3A3",
            }}
            data-testid={`chat-message-${idx}`}
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
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-2">
            <CircleNotch size={16} color="#007AFF" className="animate-spin" />
            <span className="text-xs" style={{ color: "#A3A3A3" }}>
              Thinking...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 px-3 py-2 text-sm border rounded-sm focus:outline-none focus:ring-2"
          style={{
            backgroundColor: "#121212",
            borderColor: "rgba(255, 255, 255, 0.1)",
            color: "#FFFFFF",
            fontFamily: "JetBrains Mono, monospace",
          }}
          disabled={loading}
          data-testid="ai-query-input"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="px-4 py-2 rounded-sm transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#007AFF", color: "#FFFFFF" }}
          data-testid="submit-query-button"
        >
          <PaperPlaneRight size={20} weight="fill" />
        </button>
      </form>
    </div>
  );
};

export default AIAgentPanel;