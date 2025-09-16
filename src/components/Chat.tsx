import React, { useState } from 'react'

export default function Chat({ onSend, placeholder }:{ onSend: (text:string)=>void, placeholder?: string }) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<{role:'user'|'assistant', content:string}[]>([])

  const send = async () => {
    if (!input.trim()) return
    const text = input.trim()
    setHistory(h => [...h, { role: 'user', content: text }])
    setInput('')
    try {
      await onSend(text)
      setHistory(h => [...h, { role: 'assistant', content: 'Done. See charts and summary below.' }])
    } catch (e:any) {
      setHistory(h => [...h, { role: 'assistant', content: 'Sorry, I could not process that.' }])
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') send()
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'grid', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
          {history.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 600, width: 80 }}>{m.role === 'user' ? 'You' : 'Assistant'}</div>
              <div style={{ flex: 1 }}>{m.content}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={placeholder}
            style={{ flex: 1, padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 10 }}
          />
          <button onClick={send} style={{ padding: '10px 16px', borderRadius: 10, background: '#111', color: 'white', border: 0 }}>Send</button>
        </div>
      </div>
    </div>
  )
}
