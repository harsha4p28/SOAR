from datetime import datetime

from .extensions import db


class BaseModel(db.Model):
    __abstract__ = True

    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class User(BaseModel):
    __tablename__ = "users"

    username = db.Column(db.String(120), nullable=False, unique=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    role = db.Column(db.String(30), nullable=False, default="analyst")
    api_token_hash = db.Column(db.String(128), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)


class Alert(BaseModel):
    __tablename__ = "alerts"

    attack_type = db.Column(db.String(50), nullable=False)
    source = db.Column(db.String(80), nullable=False, default="unknown")
    source_ip = db.Column(db.String(64), nullable=True)
    endpoint = db.Column(db.String(255), nullable=False)
    http_method = db.Column(db.String(10), nullable=False, default="GET")
    payload = db.Column(db.Text, nullable=True)
    context = db.Column(db.JSON, nullable=False, default=dict)
    confidence_score = db.Column(db.Float, nullable=False, default=0.0)
    exploitability_score = db.Column(db.Float, nullable=False, default=0.0)
    status = db.Column(db.String(30), nullable=False, default="new")


class Incident(BaseModel):
    __tablename__ = "incidents"

    title = db.Column(db.String(255), nullable=False)
    attack_type = db.Column(db.String(50), nullable=False)
    severity = db.Column(db.String(20), nullable=False, default="medium")
    status = db.Column(db.String(30), nullable=False, default="open")
    context = db.Column(db.JSON, nullable=False, default=dict)
    recommended_response = db.Column(db.JSON, nullable=False, default=list)
    alert_id = db.Column(db.Integer, db.ForeignKey("alerts.id"), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    alert = db.relationship("Alert", backref="incidents")
    owner = db.relationship("User", backref="incidents")


class ResponseAction(BaseModel):
    __tablename__ = "response_actions"

    incident_id = db.Column(db.Integer, db.ForeignKey("incidents.id"), nullable=False)
    action_type = db.Column(db.String(60), nullable=False)
    action_status = db.Column(db.String(30), nullable=False, default="pending")
    details = db.Column(db.JSON, nullable=False, default=dict)

    incident = db.relationship("Incident", backref="response_actions")


class IncidentNote(BaseModel):
    __tablename__ = "incident_notes"

    incident_id = db.Column(db.Integer, db.ForeignKey("incidents.id"), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    note = db.Column(db.Text, nullable=False)

    incident = db.relationship("Incident", backref="notes")
    author = db.relationship("User", backref="incident_notes")
