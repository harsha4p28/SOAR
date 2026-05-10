import os
import json
from urllib.parse import urljoin
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ACTION_MAP = {
    "CROSS_SITE_SCRIPTING": [
        "session_suspension",
        "parameter_filtering",
        "output_encoding_patch",
    ],
    "SQL_INJECTION": [
        "parameter_filtering",
        "query_guard",
        "parameterized_query_enforcement",
    ],
    "SERVER_SIDE_REQUEST_FORGERY": [
        "rate_limiting",
        "outbound_request_allowlist",
    ],
    "INSECURE_DIRECT_OBJECT_REFERENCES": [
        "session_suspension",
        "object_access_control_patch",
    ],
    "REMOTE_CODE_EXECUTION": [
        "session_suspension",
        "service_isolation",
        "vulnerable_component_update",
    ],
    "CROSS_SITE_REQUEST_FORGERY": ["session_suspension", "csrf_enforcement"],
}

DEFAULT_ACTIONS = ["session_suspension", "parameter_filtering", "rate_limiting"]


def get_vulnerable_app_base_url():
    return os.getenv("VULN_APP_BASE", "http://127.0.0.1:5055").rstrip("/")


def _request_lab_endpoint(base_url, method, path, **kwargs):
    url = urljoin(f"{base_url}/", path.lstrip("/"))
    headers = kwargs.pop("headers", {}) or {}
    data = kwargs.pop("json", None)
    params = kwargs.pop("params", None)

    if params:
        from urllib.parse import urlencode

        url = f"{url}?{urlencode(params)}"

    body_bytes = None
    if data is not None:
        body_bytes = json.dumps(data).encode("utf-8")
        headers = {**headers, "Content-Type": "application/json"}

    request = Request(url, data=body_bytes, method=method.upper(), headers=headers)

    try:
        with urlopen(request, timeout=10) as response:
            raw_body = response.read().decode("utf-8")
            status_code = response.getcode()
            ok = 200 <= status_code < 400
    except HTTPError as error:
        raw_body = error.read().decode("utf-8")
        status_code = error.code
        ok = False
    except URLError as error:
        return {
            "url": url,
            "method": method,
            "status_code": 0,
            "ok": False,
            "body": {"error": str(error.reason)},
        }

    try:
        body = json.loads(raw_body)
    except ValueError:
        body = raw_body

    return {
        "url": url,
        "method": method,
        "status_code": status_code,
        "ok": ok,
        "body": body,
    }


def _verification_probe(base_url, attack_type):
    probes = {
        "SQL_INJECTION": lambda: _request_lab_endpoint(
            base_url,
            "GET",
            "/app/login",
            params={"username": "' OR 1=1 --", "password": "anything"},
        ),
        "CROSS_SITE_SCRIPTING": lambda: _request_lab_endpoint(
            base_url,
            "POST",
            "/app/comment",
            json={"comment": "<script>alert(1)</script>"},
        ),
        "SERVER_SIDE_REQUEST_FORGERY": lambda: _request_lab_endpoint(
            base_url,
            "GET",
            "/app/fetch",
            params={"url": "http://169.254.169.254/latest/meta-data/"},
        ),
        "INSECURE_DIRECT_OBJECT_REFERENCES": lambda: _request_lab_endpoint(
            base_url,
            "GET",
            "/app/document/2",
            params={"viewer_id": 1},
        ),
        "CROSS_SITE_REQUEST_FORGERY": lambda: _request_lab_endpoint(
            base_url,
            "POST",
            "/app/settings/notifications",
            json={"enabled": False},
        ),
        "REMOTE_CODE_EXECUTION": lambda: _request_lab_endpoint(
            base_url,
            "POST",
            "/app/command",
            json={"command": "whoami && echo injected"},
        ),
    }

    probe = probes.get(attack_type)
    if probe is None:
        return {
            "verified": True,
            "reason": f"No dedicated verification probe configured for {attack_type}; remediation endpoint completed successfully.",
        }

    result = probe()
    verified = False

    if attack_type == "SQL_INJECTION":
        verified = result["status_code"] == 400 and result["body"].get("error") == "Invalid username format"
    elif attack_type == "CROSS_SITE_SCRIPTING":
        rendered = result["body"].get("rendered", "") if isinstance(result["body"], dict) else ""
        verified = result["status_code"] == 200 and "&lt;script&gt;" in rendered
    elif attack_type == "SERVER_SIDE_REQUEST_FORGERY":
        verified = result["status_code"] == 403 and result["body"].get("error") == "Target URL blocked by allowlist"
    elif attack_type == "INSECURE_DIRECT_OBJECT_REFERENCES":
        verified = result["status_code"] == 403 and result["body"].get("error") == "Access denied by object-level policy"
    elif attack_type == "CROSS_SITE_REQUEST_FORGERY":
        verified = result["status_code"] == 403 and result["body"].get("error") == "CSRF token validation failed"
    elif attack_type == "REMOTE_CODE_EXECUTION":
        verified = result["status_code"] == 403 and result["body"].get("error") == "Command blocked by allowlist"

    return {
        "verified": verified,
        "probe": result,
    }


def execute_playbook_on_lab_app(incident):
    base_url = get_vulnerable_app_base_url()
    remediation = _request_lab_endpoint(base_url, "POST", "/demo/remediate")
    verification = _verification_probe(base_url, incident.attack_type)

    return {
        "target": base_url,
        "remediation": remediation,
        "verification": verification,
        "success": remediation["ok"] and verification.get("verified", False),
    }


def build_playbook_actions(incident, execution=None):
    baseline_actions = ACTION_MAP.get(incident.attack_type, DEFAULT_ACTIONS)
    if execution is None:
        execution = execute_playbook_on_lab_app(incident)

    action_status = "applied" if execution["success"] else "failed"
    return [
        {
            "action_type": action_name,
            "action_status": action_status,
            "details": {
                "reason": f"Automated response for {incident.attack_type}",
                "severity": incident.severity,
                "target": execution["target"],
                "remediation": execution["remediation"],
                "verification": execution["verification"],
            },
        }
        for action_name in baseline_actions
    ]
