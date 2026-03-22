'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export default function BusinessAssistantChatbot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your business assistant. Ask about quotations, inventory, attendance, or daily operations.',
    },
  ]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/business-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content:
          data?.reply ||
          'I could not understand that. Please ask about quotations, inventory, attendance, or operations.',
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          content: 'A network issue occurred. Please try again in a moment.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-3 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Business Assistant</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
              type="button"
            >
              Close
            </button>
          </div>

          <div className="h-72 space-y-3 overflow-y-auto p-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === 'user'
                    ? 'ml-auto max-w-[85%] rounded-lg bg-blue-600 px-3 py-2 text-sm text-white'
                    : 'max-w-[85%] rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900'
                }
              >
                {message.content}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type your business question..."
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                disabled={isSending}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={isSending || !input.trim()}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700"
      >
        {isOpen ? 'Hide Assistant' : 'Business Assistant'}
      </button>
    </div>
  );
}
