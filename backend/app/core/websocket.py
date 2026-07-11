import asyncio
import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket client connections grouped by Incident ID."""

    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, incident_id: int, websocket: WebSocket):
        await websocket.accept()
        if incident_id not in self.active_connections:
            self.active_connections[incident_id] = []
        self.active_connections[incident_id].append(websocket)
        logger.info(f"WebSocket connected for incident {incident_id}")

    def disconnect(self, incident_id: int, websocket: WebSocket):
        if incident_id in self.active_connections:
            if websocket in self.active_connections[incident_id]:
                self.active_connections[incident_id].remove(websocket)
            if not self.active_connections[incident_id]:
                del self.active_connections[incident_id]
        logger.info(f"WebSocket disconnected for incident {incident_id}")

    async def broadcast(self, incident_id: int, message: dict):
        if incident_id in self.active_connections:
            for connection in self.active_connections[incident_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.debug(f"Failed to send JSON over WebSocket: {e}")


websocket_manager = ConnectionManager()


def broadcast_incident_event(incident_id: int, event_data: dict):
    """Broadcasts event data to all clients subscribed to a specific incident ID.
    Supports running from either the main event loop thread or background threads.
    """
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(websocket_manager.broadcast(incident_id, event_data))
    except RuntimeError:
        # Fallback for background thread executions
        try:
            asyncio.run(websocket_manager.broadcast(incident_id, event_data))
        except Exception as e:
            logger.warning(f"Failed to run websocket broadcast in fallback loop: {e}")
