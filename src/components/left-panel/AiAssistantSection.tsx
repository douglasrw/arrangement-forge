import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ArrowUp } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

type ScopeBadge = {
  label: string
  color: string
}

type Message = {
  id: string
  role: "user" | "ai"
  text: string
  scope?: ScopeBadge
}

const SCOPE_COLORS: Record<string, string> = {
  Song: "#0891b2",
  "Verse 1": "#06b6d4",
  "Guitar bar 13": "#a78bfa",
  Drums: "#06b6d4",
  Bass: "#34d399",
  Piano: "#fbbf24",
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "user",
    text: "Make the verse groove more laid back, like a late-night trio.",
    scope: { label: "Verse 1", color: SCOPE_COLORS["Verse 1"] },
  },
  {
    id: "2",
    role: "ai",
    text: "I've pulled back the energy on the drums and added more space between bass notes. The piano now uses rootless voicings with a gentler attack. Want me to adjust the swing percentage too?",
    scope: { label: "Song", color: SCOPE_COLORS["Song"] },
  },
  {
    id: "3",
    role: "user",
    text: "Yes, push swing to about 70% and add a ghost note fill on the guitar at bar 13.",
    scope: { label: "Guitar bar 13", color: SCOPE_COLORS["Guitar bar 13"] },
  },
  {
    id: "4",
    role: "ai",
    text: "Done. Swing is at 70% now and I added a subtle hammer-on ghost fill for the guitar at bar 13. The dynamics are set to mp to keep the intimate feel.",
  },
]

export function AiAssistantSection() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function handleSend() {
    if (!input.trim()) return
    const newMsg: Message = {
      id: String(Date.now()),
      role: "user",
      text: input.trim(),
    }
    setMessages((prev) => [...prev, newMsg])
    setInput("")
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden">
      {/* Chat thread */}
      <ScrollArea className="flex-1 pr-1" style={{ maxHeight: 260 }}>
        <div className="flex flex-col gap-2.5 py-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-1",
                msg.role === "user" ? "items-end" : "items-start"
              )}
            >
              {/* Scope badge */}
              {msg.scope && (
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-none"
                  style={{
                    color: msg.scope.color,
                    backgroundColor: `${msg.scope.color}1a`,
                    border: `1px solid ${msg.scope.color}33`,
                  }}
                >
                  {msg.scope.label}
                </span>
              )}
              {/* Bubble */}
              <div
                className={cn(
                  "max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                  msg.role === "user"
                    ? "bg-ring/15 text-foreground border border-ring/20"
                    : "bg-card text-card-foreground border border-border"
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary px-2.5 py-1.5">
        <label htmlFor="ai-input" className="sr-only">Ask the AI assistant</label>
        <input
          id="ai-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Ask the AI assistant..."
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim()}
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
            input.trim()
              ? "bg-ring text-foreground hover:bg-ring/80"
              : "bg-secondary text-muted-foreground"
          )}
        >
          <ArrowUp className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
