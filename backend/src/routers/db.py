from fastapi import APIRouter

router = APIRouter()


@router.get("/rules")
async def get_rules():
    return {"message": "Hello, World!"}
