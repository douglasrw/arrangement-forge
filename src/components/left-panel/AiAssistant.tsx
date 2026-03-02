// AiAssistant.tsx — AI chat panel, always visible, context-aware scope.

import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';
import { ScopeBadge } from '@/components/shared/ScopeBadge';
import type { AiChatMessage } from '@/types';

function getScope(
  level: string,
  generationState: string,
  sectionName?: string,
  instrument?: string,
  bar?: number
): { scope: AiChatMessage['scope']; target?: string } {
  if (generationState === 'idle') return { scope: 'setup' };
  if (level === 'section' && sectionName) return { scope: 'section', target: sectionName };
  if (level === 'block' && instrument && bar != null) {
    return { scope: 'block', target: `${instrument} bar ${bar}` };
  }
  return { scope: 'song' };
}

export function AiAssistant() {
  const { project, chatMessages, addChatMessage } = useProjectStore();
  const { level, sectionId, blockId } = useSelectionStore();
  const { generationState } = useUiStore();
  const { sections, blocks, stems } = useProjectStore();
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const section = sections.find((s) => s.id === sectionId);
  const block = blocks.find((b) => b.id === blockId);
  const stem = stems.find((s) => s.id === block?.stemId);

  const { scope, target } = getScope(
    level,
    generationState,
    section?.name,
    stem?.instrument,
    block?.startBar
  );

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  function handleSend() {
    if (!input.trim() || !project) return;
    const userMsg: AiChatMessage = {
      id: crypto.randomUUID(),
      projectId: project.id,
      role: 'user',
      content: input.trim(),
      scope,
      scopeTarget: target ?? null,
      createdAt: new Date().toISOString(),
    };
    addChatMessage(userMsg);
    setInput('');

    // MVP placeholder response
    setTimeout(() => {
      const reply: AiChatMessage = {
        id: crypto.randomUUID(),
        projectId: project.id,
        role: 'assistant',
        content: 'AI-powered suggestions are coming soon. For now, use the controls on the left to adjust your arrangement.',
        scope,
        scopeTarget: target ?? null,
        createdAt: new Date().toISOString(),
      };
      addChatMessage(reply);
    }, 400);
  }

  const placeholder = generationState === 'idle'
    ? "Try: 'Jazz standard in Bb' or 'Kind of Blue vibe'"
    : "Ask about your arrangement...";

  return (
    <div className="flex flex-col border-t border-base-300 pt-3 mt-3 gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">AI Assistant</span>
        <ScopeBadge scope={scope} target={target} />
      </div>

      {/* Chat history */}
      <div
        ref={listRef}
        className="flex flex-col gap-2 max-h-36 overflow-y-auto px-1"
      >
        {chatMessages.length === 0 && (
          <p className="text-xs text-base-content/25 italic px-1">{placeholder}</p>
        )}
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`rounded-lg px-2.5 py-1.5 text-xs max-w-[85%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary/20 text-base-content'
                  : 'bg-base-300 text-base-content/70'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 px-1">
        <input
          type="text"
          className="input input-xs input-bordered flex-1 text-xs"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
        />
        <button
          className="btn btn-xs btn-accent"
          onClick={handleSend}
          disabled={!input.trim()}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
