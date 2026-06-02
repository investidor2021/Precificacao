from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.services.sheets import sheets_db

# Import routers
from app.api.endpoints import products, costs, marketplaces, simulations, dashboard

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API de precificação profissional integrada ao Google Sheets",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(products.router, prefix="/api/products", tags=["Produtos"])
app.include_router(costs.router, prefix="/api/costs", tags=["Custos"])
app.include_router(marketplaces.router, prefix="/api/marketplaces", tags=["Configurações de Marketplaces"])
app.include_router(simulations.router, prefix="/api/simulations", tags=["Simulações"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])

@app.on_event("startup")
async def on_startup():
    try:
        # Establish connection to Google Sheets and auto-initialize structure
        sheets_db.connect()
        print(f"Planilha conectada e inicializada com sucesso: '{settings.SPREADSHEET_NAME}'")
    except Exception as e:
        print(f"ALERTA: Falha ao inicializar planilha no startup. O backend continuará ativo mas requer credentials: {e}")

@app.get("/")
def read_root():
    return {"message": "API de Precificação integrada ao Google Sheets ativa. Acesse /docs para documentação Swagger."}
