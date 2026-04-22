from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import db, migrate
from .routes_alerts import alerts_api
from .routes_auth import auth_api
from .routes_dashboard import dashboard_api
from .routes_incidents import incidents_api
from .routes_playbooks import playbooks_api
from .routes import api


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)

    app.register_blueprint(api, url_prefix="/api")
    app.register_blueprint(auth_api, url_prefix="/api/auth")
    app.register_blueprint(alerts_api, url_prefix="/api/alerts")
    app.register_blueprint(playbooks_api, url_prefix="/api/playbooks")
    app.register_blueprint(incidents_api, url_prefix="/api/incidents")
    app.register_blueprint(dashboard_api, url_prefix="/api/dashboard")

    return app
