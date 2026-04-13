import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useAIChat() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage = { role: "user", content: query, id: `user-${Date.now()}` };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);

    try {
      const response = await axios.post(`${API}/ai/query`, {
        query,
        session_id: sessionId,
      });

      const assistantMessage = {
        role: "assistant",
        content: response.data.response,
        id: `assistant-${Date.now()}`,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      toast.error("Failed to get AI response");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error processing your request.",
          id: `error-${Date.now()}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return { query, setQuery, messages, loading, handleSubmit, messagesEndRef };
}
