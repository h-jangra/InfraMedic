from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.discovery import (
    discover_all_resources,
    provision_demo_infrastructure_and_persist,
    teardown_infrastructure_and_persist,
)

router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("")
def get_discovered_resources(db: Session = Depends(get_db)):
    """Discovers and lists compute, storage, databases, secrets, and networking components."""
    try:
        return discover_all_resources(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")


@router.post("/provision")
def provision_demo_infrastructure_route(db: Session = Depends(get_db)):
    """Triggers the provisioning of demo infrastructure into the cloud environment."""
    success = provision_demo_infrastructure_and_persist(db)
    if not success:
        raise HTTPException(status_code=500, detail="Provisioning failed.")
    return {"status": "success", "message": "Demo infrastructure provisioned successfully."}


@router.post("/teardown")
def teardown_infrastructure_route(db: Session = Depends(get_db)):
    """Destroys all active provisioned demo infrastructure."""
    success = teardown_infrastructure_and_persist(db)
    if not success:
        raise HTTPException(status_code=500, detail="Teardown failed.")
    return {"status": "success", "message": "Demo infrastructure destroyed successfully."}
