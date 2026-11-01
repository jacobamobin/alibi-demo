"use client";
import { useId, useState } from "react";
import { Send } from "lucide-react";
export function CallMessage({ enabled, send }: { enabled: boolean; send: (text: string) => boolean }) {
  const [text, setText] = useState("");
  const id = useId();
  return <form className="call-message" onSubmit={e => { e.preventDefault(); if (send(text)) setText(""); }}>
    <label htmlFor={id}>Message the call</label>
    <div><input id={id} value={text} onChange={e => setText(e.target.value)} maxLength={1000} disabled={!enabled} placeholder={enabled ? "Type a line for the conversation…" : "Available during a live call"} /><button aria-label="Send to call" disabled={!enabled || !text.trim()}><Send size={17} /></button></div>
    <p>Use text when you can’t use the microphone. Typed lines are labeled in the transcript.</p>
  </form>;
}
