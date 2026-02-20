"use client";
import { useState } from "react";
import Image from "next/image";
import f1gpt from "./assets/f1gpt.png";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import PromptSuggestionsRow from "./components/PromptSuggestionsRow";
import LoadingBubble from "./components/LoadingBubble";
import Bubble from "./components/Bubble";

const Home = () => {
  const { sendMessage, status, messages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const isLoading = status === "streaming" || status === "submitted";
  const noMessages = !messages || messages.length === 0;

  const handlePrompt = (promptText: string) => {
    sendMessage({ text: promptText });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <main className="app-shell">
      <header className="chat-header">
        <div className="logo-wrap">
          <Image src={f1gpt} alt="F1GPT" width={48} height={48} priority />
        </div>
        <p className="tagline">Ask anything about Formula 1</p>
      </header>

      <section
        className={`chat-content ${noMessages ? "empty" : ""}`}
        aria-label="Chat messages"
      >
        {noMessages ? (
          <>
            <p className="starter-text">
              The ultimate place for Formula One superfans. Ask F1GPT anything
              about F1 racing and get answers backed by the latest data.
            </p>
            <PromptSuggestionsRow onPromptClick={handlePrompt} />
          </>
        ) : (
          <>
            {messages.map((message, index) => (
              <Bubble key={`message-${index}`} message={message} />
            ))}
            {isLoading && <LoadingBubble />}
          </>
        )}
      </section>

      <footer className="chat-footer">
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            className="question-box"
            type="text"
            autoComplete="off"
            placeholder="Ask F1GPT anything about Formula 1..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Message"
          />
          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </form>
      </footer>
    </main>
  );
};

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

export default Home;
