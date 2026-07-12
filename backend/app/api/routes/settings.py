from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.schemas.setting import CloudSettings
from app.services.settings import get_cloud_settings, update_cloud_settings
from app.models.setting import SystemSetting

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/cloud", response_model=CloudSettings)
def get_settings_route(db: Session = Depends(get_db)):
    return get_cloud_settings(db)


@router.put("/cloud", response_model=CloudSettings)
def update_settings_route(payload: CloudSettings, db: Session = Depends(get_db)):
    return update_cloud_settings(db, payload.model_dump())


@router.get("/connections")
def get_connections(db: Session = Depends(get_db)):
    from app.services.cloud import get_cloud_provider
    from app.models.resource import CloudResource
    import json

    c_settings = get_cloud_settings(db)
    providers = ["floci", "aws", "azure", "gcp"]
    result = []
    
    for p in providers:
        # Get provider connection status from DB (default connected for floci, disconnected others)
        status_stmt = select(SystemSetting).where(SystemSetting.key == f"provider_status_{p}")
        setting_val = db.scalar(status_stmt)
        status = setting_val.value if setting_val else ("connected" if p == "floci" else "disconnected")
        
        # Count cached resources in database
        res_count = 0
        try:
            stmt = select(CloudResource)
            all_res = db.scalars(stmt).all()
            for r in all_res:
                try:
                    details = json.loads(r.details_json)
                    discovery_prov = details.get("discovery_provider", "")
                    
                    if discovery_prov:
                        if discovery_prov.lower() == p.lower():
                            res_count += 1
                    else:
                        r_prov = details.get("provider", "").lower()
                        if p == "floci":
                            is_local = "4566" in c_settings.get("aws_endpoint_url", "")
                            if r_prov == "aws" and is_local:
                                res_count += 1
                        elif p == "aws":
                            is_local = "4566" in c_settings.get("aws_endpoint_url", "")
                            if r_prov == "aws" and not is_local:
                                res_count += 1
                        elif p == "azure" and r_prov == "azure":
                            res_count += 1
                        elif p == "gcp" and r_prov == "gcp":
                            res_count += 1
                except Exception:
                    pass
        except Exception:
            pass

        # Determine health
        health_info = {
            "status": status,
            "auth_method": "—",
            "account": "—",
            "project": "—",
            "region": "—",
            "health": "Disconnected",
            "resources": res_count,
            "monitoring": "Suspended" if status == "disconnected" else "Active"
        }
        
        if status == "connected":
            provider_inst = get_cloud_provider(p)
            h = provider_inst.health(c_settings)
            health_info.update(h)
            if h.get("status") == "error":
                health_info["status"] = "error"
                health_info["monitoring"] = "Error"
            health_info["resources"] = res_count

        result.append({
            "provider": p,
            **health_info
        })
        
    return result


@router.post("/connections/{provider}/test")
def test_connection(provider: str, db: Session = Depends(get_db)):
    from app.services.cloud import get_cloud_provider
    c_settings = get_cloud_settings(db)
    provider_inst = get_cloud_provider(provider)
    return provider_inst.health(c_settings)


@router.post("/connections/{provider}/disconnect")
def disconnect_provider(provider: str, db: Session = Depends(get_db)):
    stmt = select(SystemSetting).where(SystemSetting.key == f"provider_status_{provider}")
    existing = db.scalar(stmt)
    if existing:
        existing.value = "disconnected"
    else:
        db.add(SystemSetting(key=f"provider_status_{provider}", value="disconnected"))
    db.commit()
    return {"success": True}


@router.post("/connections/{provider}/connect")
def connect_provider(provider: str, db: Session = Depends(get_db)):
    stmt = select(SystemSetting).where(SystemSetting.key == f"provider_status_{provider}")
    existing = db.scalar(stmt)
    if existing:
        existing.value = "connected"
    else:
        db.add(SystemSetting(key=f"provider_status_{provider}", value="connected"))
    db.commit()
    return {"success": True}


@router.post("/connections/{provider}/sync")
def sync_provider(provider: str, db: Session = Depends(get_db)):
    from app.services.discovery import discover_all_resources
    discover_all_resources(db, provider_name=provider)
    return {"success": True}
