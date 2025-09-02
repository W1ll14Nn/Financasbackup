from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date
from decimal import Decimal

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: str  # "receita" or "despesa"
    valor: float
    descricao: str
    data: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    mes: int
    ano: int

class TransactionCreate(BaseModel):
    tipo: str
    valor: float
    descricao: str
    data: Optional[datetime] = None

class FixedExpense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    valor: float
    data_vencimento: int  # dia do mês (1-31)
    pago: bool = False
    mes: int
    ano: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FixedExpenseCreate(BaseModel):
    nome: str
    valor: float
    data_vencimento: int
    mes: int
    ano: int

class FixedExpenseUpdate(BaseModel):
    pago: bool

class AlertConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    limite_mensal: float
    mes: int
    ano: int
    ativo: bool = True

class AlertConfigCreate(BaseModel):
    limite_mensal: float
    mes: int
    ano: int

class MonthlyReport(BaseModel):
    mes: int
    ano: int
    total_receitas: float
    total_despesas: float
    saldo: float
    transacoes: List[Transaction]
    despesas_fixas: List[FixedExpense]
    total_despesas_fixas: float
    despesas_fixas_pagas: float
    despesas_fixas_pendentes: float
    limite_excedido: bool = False
    limite_configurado: Optional[float] = None

# Helper functions
def prepare_for_mongo(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    if isinstance(item.get('data'), str):
        item['data'] = datetime.fromisoformat(item['data'])
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    return item

# Transaction endpoints
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate):
    transaction_dict = transaction.dict()
    
    # Set date if not provided
    if not transaction_dict.get('data'):
        transaction_dict['data'] = datetime.now(timezone.utc)
    
    # Extract month and year
    data = transaction_dict['data']
    transaction_dict['mes'] = data.month
    transaction_dict['ano'] = data.year
    
    # Create transaction object
    trans_obj = Transaction(**transaction_dict)
    
    # Prepare for MongoDB
    trans_dict = prepare_for_mongo(trans_obj.dict())
    
    # Insert into database
    await db.transactions.insert_one(trans_dict)
    
    return trans_obj

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(mes: Optional[int] = None, ano: Optional[int] = None):
    query = {}
    if mes and ano:
        query = {"mes": mes, "ano": ano}
    elif ano:
        query = {"ano": ano}
    
    transactions = await db.transactions.find(query).sort("data", -1).to_list(1000)
    
    # Parse from MongoDB
    parsed_transactions = [parse_from_mongo(trans) for trans in transactions]
    
    return [Transaction(**trans) for trans in parsed_transactions]

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"id": transaction_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted successfully"}

# Fixed Expenses endpoints
@api_router.post("/fixed-expenses", response_model=FixedExpense)
async def create_fixed_expense(expense: FixedExpenseCreate):
    expense_dict = expense.dict()
    expense_obj = FixedExpense(**expense_dict)
    
    # Prepare for MongoDB
    expense_dict = prepare_for_mongo(expense_obj.dict())
    
    # Insert into database
    await db.fixed_expenses.insert_one(expense_dict)
    
    return expense_obj

@api_router.get("/fixed-expenses", response_model=List[FixedExpense])
async def get_fixed_expenses(mes: Optional[int] = None, ano: Optional[int] = None):
    query = {}
    if mes and ano:
        query = {"mes": mes, "ano": ano}
    elif ano:
        query = {"ano": ano}
    
    expenses = await db.fixed_expenses.find(query).sort("data_vencimento", 1).to_list(1000)
    
    # Parse from MongoDB
    parsed_expenses = [parse_from_mongo(expense) for expense in expenses]
    
    return [FixedExpense(**expense) for expense in parsed_expenses]

@api_router.put("/fixed-expenses/{expense_id}", response_model=FixedExpense)
async def update_fixed_expense(expense_id: str, update: FixedExpenseUpdate):
    result = await db.fixed_expenses.update_one(
        {"id": expense_id},
        {"$set": {"pago": update.pago}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fixed expense not found")
    
    # Get updated expense
    expense = await db.fixed_expenses.find_one({"id": expense_id})
    if expense:
        parsed_expense = parse_from_mongo(expense)
        return FixedExpense(**parsed_expense)
    
    raise HTTPException(status_code=404, detail="Fixed expense not found")

@api_router.delete("/fixed-expenses/{expense_id}")
async def delete_fixed_expense(expense_id: str):
    result = await db.fixed_expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fixed expense not found")
    return {"message": "Fixed expense deleted successfully"}

# Alert configuration endpoints
@api_router.post("/alerts", response_model=AlertConfig)
async def create_alert_config(alert: AlertConfigCreate):
    alert_dict = alert.dict()
    alert_obj = AlertConfig(**alert_dict)
    
    # Remove any existing alert for this month/year
    await db.alerts.delete_many({"mes": alert.mes, "ano": alert.ano})
    
    # Insert new alert
    await db.alerts.insert_one(alert_obj.dict())
    
    return alert_obj

@api_router.get("/alerts", response_model=List[AlertConfig])
async def get_alert_configs():
    alerts = await db.alerts.find().to_list(1000)
    return [AlertConfig(**alert) for alert in alerts]

@api_router.get("/alerts/{mes}/{ano}", response_model=Optional[AlertConfig])
async def get_alert_config(mes: int, ano: int):
    alert = await db.alerts.find_one({"mes": mes, "ano": ano})
    if alert:
        return AlertConfig(**alert)
    return None

# Reports endpoint
@api_router.get("/reports/{mes}/{ano}", response_model=MonthlyReport)
async def get_monthly_report(mes: int, ano: int):
    # Get transactions for the month
    transactions = await db.transactions.find({"mes": mes, "ano": ano}).to_list(1000)
    parsed_transactions = [parse_from_mongo(trans) for trans in transactions]
    trans_objects = [Transaction(**trans) for trans in parsed_transactions]
    
    # Get fixed expenses for the month
    fixed_expenses = await db.fixed_expenses.find({"mes": mes, "ano": ano}).to_list(1000)
    parsed_fixed_expenses = [parse_from_mongo(expense) for expense in fixed_expenses]
    fixed_expense_objects = [FixedExpense(**expense) for expense in parsed_fixed_expenses]
    
    # Calculate totals
    total_receitas = sum(t.valor for t in trans_objects if t.tipo == "receita")
    total_despesas = sum(t.valor for t in trans_objects if t.tipo == "despesa")
    
    # Calculate fixed expenses totals
    total_despesas_fixas = sum(e.valor for e in fixed_expense_objects)
    despesas_fixas_pagas = sum(e.valor for e in fixed_expense_objects if e.pago)
    despesas_fixas_pendentes = sum(e.valor for e in fixed_expense_objects if not e.pago)
    
    # Total including fixed expenses
    total_despesas_all = total_despesas + total_despesas_fixas
    saldo = total_receitas - total_despesas_all
    
    # Check alert configuration
    alert_config = await db.alerts.find_one({"mes": mes, "ano": ano, "ativo": True})
    limite_excedido = False
    limite_configurado = None
    
    if alert_config:
        limite_configurado = alert_config["limite_mensal"]
        limite_excedido = total_despesas_all > limite_configurado
    
    return MonthlyReport(
        mes=mes,
        ano=ano,
        total_receitas=total_receitas,
        total_despesas=total_despesas,
        saldo=saldo,
        transacoes=trans_objects,
        despesas_fixas=fixed_expense_objects,
        total_despesas_fixas=total_despesas_fixas,
        despesas_fixas_pagas=despesas_fixas_pagas,
        despesas_fixas_pendentes=despesas_fixas_pendentes,
        limite_excedido=limite_excedido,
        limite_configurado=limite_configurado
    )

# Dashboard data endpoint
@api_router.get("/dashboard/{ano}")
async def get_dashboard_data(ano: int):
    monthly_data = []
    
    for mes in range(1, 13):
        report = await get_monthly_report(mes, ano)
        monthly_data.append({
            "mes": mes,
            "receitas": report.total_receitas,
            "despesas": report.total_despesas + report.total_despesas_fixas,
            "despesas_variaveis": report.total_despesas,
            "despesas_fixas": report.total_despesas_fixas,
            "saldo": report.saldo
        })
    
    return {"ano": ano, "dados_mensais": monthly_data}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()