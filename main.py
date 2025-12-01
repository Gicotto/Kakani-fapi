from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import auth, users, messages, invites

app = FastAPI(title="Messaging API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(messages.router)
app.include_router(invites.router)

@app.get("/")
async def root():
    return {"message": "Messaging API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
