import React, { useState, useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line
} from "recharts"

interface Props {
  rows: any[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"]

export default function Charts({ rows }: Props) {
  const [chartType, setChartType] = useState<"bar" | "pie" | "line">("bar")

  // detect if visualization is meaningful
  const { data, xKey, yKey, showChart } = useMemo(() => {
    if (!rows || rows.length === 0) return { data: [], xKey: "", yKey: "", showChart: false }

    const sample = rows[0]
    const keys = Object.keys(sample)

    const numericKeys = keys.filter(k => typeof sample[k] === "number")
    const stringKeys = keys.filter(k => typeof sample[k] === "string")

    // 🛑 Prevent visualization for detail-type queries
    const detailColumns = ["EmployeeID", "FirstName", "LastName", "CustomerID", "ContactName", "CompanyName"]
    if (keys.some(k => detailColumns.includes(k))) {
      return { data: [], xKey: "", yKey: "", showChart: false }
    }

    // ✅ Only allow charts if there’s at least 1 number + 1 category
    if (numericKeys.length === 0 || stringKeys.length === 0) {
      return { data: [], xKey: "", yKey: "", showChart: false }
    }

    return { data: rows, xKey: stringKeys[0], yKey: numericKeys[0], showChart: true }
  }, [rows])

  if (!showChart) {
    return <p style={{ color: "#666" }}>No chart available for this type of query.</p>
  }

  return (
    <div>
      {/* Toggle buttons */}
      <div style={{ marginBottom: 8 }}>
        <button
          onClick={() => setChartType("bar")}
          style={{
            marginRight: 8,
            padding: "4px 12px",
            borderRadius: 6,
            border: chartType === "bar" ? "2px solid #0088FE" : "1px solid #ccc",
            background: chartType === "bar" ? "#e6f3ff" : "#fff",
            cursor: "pointer"
          }}
        >
          Bar
        </button>
        <button
          onClick={() => setChartType("pie")}
          style={{
            marginRight: 8,
            padding: "4px 12px",
            borderRadius: 6,
            border: chartType === "pie" ? "2px solid #FF8042" : "1px solid #ccc",
            background: chartType === "pie" ? "#fff2e6" : "#fff",
            cursor: "pointer"
          }}
        >
          Pie
        </button>
        <button
          onClick={() => setChartType("line")}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            border: chartType === "line" ? "2px solid #82ca9d" : "1px solid #ccc",
            background: chartType === "line" ? "#f0fff0" : "#fff",
            cursor: "pointer"
          }}
        >
          Line
        </button>
      </div>

      {/* Chart rendering */}
      {chartType === "bar" && (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={yKey} fill="#0088FE" />
          </BarChart>
        </ResponsiveContainer>
      )}

      {chartType === "pie" && (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={data}
              dataKey={yKey}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={140}
              label
            >
              {data.map((_: any, idx: number) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}

      {chartType === "line" && (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke="#82ca9d" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
