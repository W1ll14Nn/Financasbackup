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
from datetime import datetime, timezone
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
    
    # Calculate totals
    total_receitas = sum(t.valor for t in trans_objects if t.tipo == "receita")
    total_despesas = sum(t.valor for t in trans_objects if t.tipo == "despesa")
    saldo = total_receitas - total_despesas
    
    # Check alert configuration
    alert_config = await db.alerts.find_one({"mes": mes, "ano": ano, "ativo": True})
    limite_excedido = False
    limite_configurado = None
    
    if alert_config:
        limite_configurado = alert_config["limite_mensal"]
        limite_excedido = total_despesas > limite_configurado
    
    return MonthlyReport(
        mes=mes,
        ano=ano,
        total_receitas=total_receitas,
        total_despesas=total_despesas,
        saldo=saldo,
        transacoes=trans_objects,
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
            "despesas": report.total_despesas,
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