// Minimal Groq client using fetch to the OpenAI-compatible endpoint
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

if (!GROQ_API_KEY) {
  console.warn('VITE_GROQ_API_KEY is not set. The NLQ and description features will not work until you set it.')
}

export async function chatToSQL(nlq: string, schema: any): Promise<string> {
  const system = `You are a senior SQL engineer. Given the SQLite schema, return a single SELECT SQL query only. Use valid SQLite syntax. Do not include explanations. If aggregation is implied, include it.`
  const schemaText = JSON.stringify(schema)
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: `SCHEMA:\n${schemaText}\n\nTASK: Convert the NLQ to SQLite SQL. NLQ: ${nlq}` }
  ]
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.1,
      response_format: { type: 'text' }
    })
  })
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content?.trim() || ''
  // try to extract between code fences if any
  const match = text.match(/```sql([\s\S]*?)```/i)
  return match ? match[1].trim() : text
}

export async function describeResults(rows: any[], context: string): Promise<string> {
  if (!GROQ_API_KEY) return 'Set GROQ credentials to generate summaries.'
  const messages = [
    { role: 'system', content: 'You are a data analyst. Write a crisp, executive summary (under 120 words). Use plain language.' },
    { role: 'user', content: `Context: ${context}\n\nHere are JSON rows:\n${JSON.stringify(rows).slice(0, 12000)}` }
  ]
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.3,
      response_format: { type: 'text' }
    })
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}
