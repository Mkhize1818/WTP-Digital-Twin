import React from "react";
import { PaperPlaneRight, CircleNotch } from "@phosphor-icons/react";
import { useAIChat } from "../hooks/useAIChat";
import ChatMessage from "./ChatMessage";

const SUGGESTED_QUERIES = [
  "How much water has passed through today?",
  "Show me chlorine compliance status",
  "When was the last anomaly detected?",
  "What's the average pressure?",
];

const AIAgentPanel = () => {
  const { query, setQuery, messages, loading, handleSubmit, messagesEndRef } = useAIChat();

  return (
    <div
      className="border p-4 md:p-6 flex flex-col"
      style={{
        backgroundColor: "#062C60",
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
        <p className="text-xs" style={{ color: "#C9E0EF" }}>
          Ask questions about the system
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: "#C9E0EF" }}>
              Try asking:
            </p>
            {SUGGESTED_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="w-full text-left text-xs p-2 border rounded-sm hover:border-[#1171b8] transition-colors"
                style={{
                  backgroundColor: "#0B1D3A",
                  borderColor: "rgba(201, 224, 239, 0.15)",
                  color: "#C9E0EF",
                }}
                data-testid={`suggested-query-${q.slice(0, 20).replace(/\s/g, "-")}`}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-2">
            <CircleNotch size={16} color="#1171b8" className="animate-spin" />
            <span className="text-xs" style={{ color: "#C9E0EF" }}>
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
            backgroundColor: "#0B1D3A",
            borderColor: "rgba(201, 224, 239, 0.15)",
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
          style={{ backgroundColor: "#1171b8", color: "#FFFFFF" }}
          data-testid="submit-query-button"
        >
          <PaperPlaneRight size={20} weight="fill" />
        </button>
      </form>
    </div>
  );
};

export default AIAgentPanel;
