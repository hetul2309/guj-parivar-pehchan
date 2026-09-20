import logging
from collections import defaultdict
from typing import Callable, Dict, List
from backend.app.core.db import SessionLocal
from backend.app.core.models import Events

logger = logging.getLogger("events")

_subscribers: Dict[str, List[Callable[[dict], None]]] = defaultdict(list)

def subscribe(event_name: str):
    """Decorator to register a synchronous/in-process event listener."""
    def decorator(func: Callable[[dict], None]):
        _subscribers[event_name].append(func)
        return func
    return decorator

def publish(name: str, payload: dict) -> None:
    """
    Persists event to events table and executes all in-process registered subscribers.
    """
    logger.info(f"[EVENT PUBLISH] {name}: {payload}")
    
    # 1. Persist to database
    db = SessionLocal()
    try:
        event_row = Events(name=name, payload=payload)
        db.add(event_row)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to persist event {name}: {e}")
        db.rollback()
    finally:
        db.close()

    # 2. Dispatch to registered subscribers
    handlers = _subscribers.get(name, [])
    for handler in handlers:
        try:
            handler(payload)
        except Exception as e:
            logger.error(f"Error in event handler for {name}: {e}")
