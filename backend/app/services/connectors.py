from datetime import datetime


CONNECTOR_HEALTH_RULES = {
    "WAF": "healthy",
    "SIEM": "healthy",
    "EDR": "healthy",
    "IAM": "healthy",
}


def normalize_connector_category(category):
    if not category:
        return "UNKNOWN"
    return category.strip().upper()


def assess_connector_health(connector):
    if not connector.base_url.startswith(("http://", "https://")):
        return "degraded"
    if connector.category not in CONNECTOR_HEALTH_RULES:
        return "unknown"
    return CONNECTOR_HEALTH_RULES[connector.category]


def build_connector_summary(connector):
    return {
        "id": connector.id,
        "name": connector.name,
        "category": connector.category,
        "base_url": connector.base_url,
        "auth_type": connector.auth_type,
        "status": connector.status,
        "last_checked_at": connector.last_checked_at.isoformat() if connector.last_checked_at else None,
        "config": connector.config,
    }


def stamp_check_time(connector):
    connector.last_checked_at = datetime.utcnow()
    connector.status = assess_connector_health(connector)
