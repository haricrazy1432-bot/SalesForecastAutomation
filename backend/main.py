from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from typing import Optional
from datetime import datetime
import pandas as pd
from sklearn.linear_model import LinearRegression
import numpy as np

DB_PATH = "northwind.db"

app = FastAPI(title="NLQ→SQL + Forecast Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def row_factory(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = row_factory
    return conn

class SQLRequest(BaseModel):
    sql: str

class ForecastRequest(BaseModel):
    periods: int = 6
    date_from: Optional[str] = None
    date_to: Optional[str] = None

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/schema")
def schema():
    """Return basic schema info to help the LLM craft SQL on the frontend."""
    try:
        conn = get_conn()
        cur = conn.cursor()

        tables = []
        tcur = cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        table_names = [r['name'] for r in tcur.fetchall()]

        for t in table_names:
            ccur = cur.execute(f"PRAGMA table_info({t})")
            cols = [{"name": r['name'], "type": r['type']} for r in ccur.fetchall()]
            tables.append({"table": t, "columns": cols})

        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/execute_sql")
def execute_sql(req: SQLRequest):
    """Execute arbitrary read-only SQL and return rows."""
    sql = req.sql.strip().rstrip(";")
    lowered = sql.lower()
    forbidden = ["update ", "delete ", "insert ", "drop ", "alter ", "create ", "attach ", "pragma "]
    if any(tok in lowered for tok in forbidden):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed.")
    if not lowered.startswith("select"):
        raise HTTPException(status_code=400, detail="Query must start with SELECT.")
    try:
        conn = get_conn()
        cur = conn.cursor()
        rows = cur.execute(sql).fetchall()
        return {"rows": rows}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
def monthly_sales_dataframe(conn: sqlite3.Connection) -> pd.DataFrame:
    """
    Build a monthly sales history using Orders + OrderDetails + Products.
    Matches your current Northwind schema (no UnitPrice/Discount in OrderDetails).
    """
    q = """
    SELECT 
        substr(Orders.OrderDate, 1, 7) AS year_month,
        SUM(CAST(Products.Price AS REAL) * OrderDetails.Quantity) AS sales
    FROM Orders
    JOIN OrderDetails ON Orders.OrderID = OrderDetails.OrderID
    JOIN Products ON OrderDetails.ProductID = Products.ProductID
    GROUP BY year_month
    ORDER BY year_month
    """

    # ⚡ Use a new connection WITHOUT row_factory for pandas
    raw_conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(q, raw_conn)
    raw_conn.close()

    # Normalize column names
    df.columns = [c.strip().lower() for c in df.columns]

    # Ensure numeric
    df["sales"] = pd.to_numeric(df["sales"], errors="coerce").fillna(0)

    print("DEBUG monthly_sales_dataframe:\n", df.head())  # Debug log
    return df



@app.get("/sales_history")
def sales_history():
    """
    Debug endpoint: return raw monthly sales history as JSON.
    Helps verify data before forecasting.
    """
    try:
        conn = get_conn()
        df = monthly_sales_dataframe(conn)
        return {"rows": df.to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/forecast")
def forecast(req: ForecastRequest):
    """
    Forecast future monthly sales using a simple linear regression on time index.
    Return history + forecast in tidy format for charts.
    """
    try:
        conn = get_conn()
        df = monthly_sales_dataframe(conn)

        if df is None or df.empty:
            raise HTTPException(status_code=400, detail="No sales history available. Load Northwind first.")

        def yymm_to_datetime(s: str) -> datetime:
            try:
                return datetime.strptime(s, "%Y-%m")
            except Exception:
                raise HTTPException(status_code=400, detail=f"Bad year_month value: {s}")

        if req.date_from:
            df = df[df['year_month'] >= req.date_from]
        if req.date_to:
            df = df[df['year_month'] <= req.date_to]

        # make continuous monthly index
        df['ds'] = df['year_month'].apply(yymm_to_datetime)
        df = df.sort_values('ds')
        df['t'] = np.arange(len(df))  # time index

        # Fit a simple trend model
        X = df[['t']].values
        y = df['sales'].values
        model = LinearRegression()
        model.fit(X, y)

        # Forecast next N months
        last_t = df['t'].iloc[-1]
        future_rows = []
        last_date = df['ds'].iloc[-1]
        for i in range(1, req.periods + 1):
            next_t = last_t + i
            year = last_date.year + (last_date.month + i - 1) // 12
            month = (last_date.month + i - 1) % 12 + 1
            next_date = datetime(year, month, 1)
            yhat = float(model.predict(np.array([[next_t]]))[0])
            future_rows.append({"year_month": next_date.strftime("%Y-%m"), "sales": yhat, "kind": "forecast"})

        hist_rows = [
            {"year_month": r['year_month'], "sales": float(r['sales']), "kind": "history"}
            for _, r in df.iterrows()
        ]
        all_rows = hist_rows + future_rows

        return {
            "history": hist_rows,
            "forecast": future_rows,
            "all": all_rows,
            "model": "LinearRegression",
            "periods": req.periods
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
