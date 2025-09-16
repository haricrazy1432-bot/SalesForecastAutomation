import React, { useEffect, useState } from 'react'
import Chat from './components/Chat'
import Charts from './components/Charts'
import { chatToSQL, describeResults } from './lib/groq'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function App() {
  const [schema, setSchema] = useState<any>(null)
  const [rows, setRows] = useState<any[]>([])
  const [description, setDescription] = useState<string>('')
  const [mode, setMode] = useState<'regular' | 'forecast'>('regular')
  const [chartType, setChartType] = useState<'auto' | 'bar' | 'line' | 'pie'>('auto')

  useEffect(() => {
    axios
      .get(BACKEND_URL + '/schema')
      .then((res) => setSchema(res.data))
      .catch(() => {})
  }, [])

  const onUserMessage = async (text: string) => {
    // Detect chart type keywords
    if (/pie/i.test(text)) setChartType('pie')
    else if (/line/i.test(text)) setChartType('line')
    else if (/bar/i.test(text)) setChartType('bar')
    else setChartType('auto')

    // Detect forecast mode
    const isForecast = /predict|forecast/i.test(text)
    setMode(isForecast ? 'forecast' : 'regular')

    if (isForecast) {
      const f = await axios.post(BACKEND_URL + '/forecast', { periods: 6 })
      const data = f.data.all
      setRows(data)
      const desc = await describeResults(data, 'These are monthly sales (history + forecast).')
      setDescription(desc)
      return
    }

    // Regular NLQ -> SQL
    const sql = await chatToSQL(text, schema)
    console.log('🔎 Generated SQL:', sql)
    const resp = await axios.post(BACKEND_URL + '/execute_sql', { sql })
    const resultRows = resp.data.rows
    setRows(resultRows)
    const desc = await describeResults(resultRows, 'These are the query results.')
    setDescription(desc)
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16, fontFamily: 'Inter, system-ui, Arial' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Northwind Chat Analytics</h1>
        <span style={{ padding: '2px 8px', background: '#f2f2f2', borderRadius: 8, fontSize: 12 }}>
          {mode === 'regular' ? 'Explore' : 'Forecast'}
        </span>
      </header>

      <Chat
        onSend={onUserMessage}
        placeholder="Ask in plain English, e.g. 'total sales by category', or 'show me in pie chart', or 'forecast next 6 months'..."
      />

      <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 16 }}>
        <div style={{ background: 'white', padding: 16, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginTop: 0 }}>Visualizations</h2>
          <Charts rows={rows} chartType={chartType} />
        </div>

        <div style={{ background: 'white', padding: 16, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginTop: 0 }}>Text Summary</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{description || 'Ask a question to see the description.'}</p>
        </div>

        <div style={{ background: 'white', padding: 16, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginTop: 0 }}>Raw Table</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {rows[0] &&
                    Object.keys(rows[0]).map((k) => (
                      <th key={k} style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>
                        {k}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx}>
                    {Object.values(r).map((v, j) => (
                      <td key={j} style={{ borderBottom: '1px solid #f6f6f6', padding: 8 }}>{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
