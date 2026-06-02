from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base, async_session
from app.core.seed import seed_database

# Import routers
from app.api.endpoints import products, costs, marketplaces, simulations, dashboard

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API de precificação profissional para Mercado Livre e Shopee",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Set up CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(products.router, prefix="/api/products", tags=["Produtos"])
app.include_router(costs.router, prefix="/api/costs", tags=["Custos"])
app.include_router(marketplaces.router, prefix="/api/marketplaces", tags=["Configurações de Marketplaces"])
app.include_router(simulations.router, prefix="/api/simulations", tags=["Simulações e Comparador"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])

@app.on_event("startup")
async def on_startup():
    # Automatically create tables in development environment
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # Seed default configs and shipping fee tables
    async with async_session() as session:
        await seed_database(session)

@app.get("/")
def read_root():
    return {"message": "API de Precificação de Marketplaces online. Acesse /docs para documentação Swagger."}
