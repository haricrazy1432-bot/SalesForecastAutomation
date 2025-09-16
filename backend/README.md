# Backend (FastAPI)

## Setup

1. Put `northwind.sqlite` in this `backend/` folder (same level as `main.py`).  
   - You can get a ready-made Northwind for SQLite here: https://github.com/jpwhite3/northwind-SQLite3

2. Create a virtual env and install deps:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

3. Run the API:

```bash
uvicorn main:app --reload --port 8000
```

## Endpoints

- `GET /schema` — returns tables/columns for prompting the LLM.
- `POST /execute_sql` — body `{ "sql": "SELECT ..." }`. Only read-only `SELECT` is allowed.
- `POST /forecast` — body `{ "periods": 6 }`. Returns monthly sales history + forecasts using scikit-learn `LinearRegression`.

Make sure your Northwind database has tables `Orders` and `OrderDetails`. If they differ, adjust the SQL inside `monthly_sales_dataframe()`.
