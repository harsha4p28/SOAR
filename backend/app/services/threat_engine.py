SEVERITY_BY_ATTACK = {
    "SQL_INJECTION": "critical",
    "REMOTE_CODE_EXECUTION": "critical",
    "SERVER_SIDE_REQUEST_FORGERY": "high",
    "INSECURE_DIRECT_OBJECT_REFERENCES": "high",
    "CROSS_SITE_SCRIPTING": "medium",
    "CROSS_SITE_REQUEST_FORGERY": "medium",
}

ROOT_CAUSE_BY_ATTACK = {
    "SQL_INJECTION": ["parameterized_queries", "strict_input_validation"],
    "REMOTE_CODE_EXECUTION": ["safe_command_execution", "library_patching"],
    "SERVER_SIDE_REQUEST_FORGERY": ["outbound_allowlist", "url_validation"],
    "INSECURE_DIRECT_OBJECT_REFERENCES": ["object_level_access_control"],
    "CROSS_SITE_SCRIPTING": ["output_encoding", "content_security_policy"],
    "CROSS_SITE_REQUEST_FORGERY": ["csrf_tokens", "same_site_cookies"],
}


def normalize_attack_type(raw_attack_type):
    if not raw_attack_type:
        return "UNKNOWN"
    return raw_attack_type.strip().upper().replace(" ", "_")


def calculate_exploitability_score(data):
    scanner_confidence = float(data.get("scanner_confidence", 0.0))
    waf_confidence = float(data.get("waf_confidence", 0.0))
    has_payload = 1.0 if data.get("payload") else 0.0
    is_authenticated = 1.0 if data.get("auth_state") == "authenticated" else 0.0

    score = (
        scanner_confidence * 0.40
        + waf_confidence * 0.30
        + has_payload * 0.20
        + is_authenticated * 0.10
    )
    return round(min(score, 1.0), 2)


def classify_attack_context(data):
    return {
        "auth_state": data.get("auth_state", "unknown"),
        "target_component": data.get("target_component", "web_application"),
        "environment": data.get("environment", "production"),
    }


def build_recommended_response(attack_type):
    severity = SEVERITY_BY_ATTACK.get(attack_type, "low")
    controls = ["session_suspension", "parameter_filtering", "rate_limiting"]
    root_cause_fixes = ROOT_CAUSE_BY_ATTACK.get(
        attack_type, ["input_validation", "access_control_enforcement"]
    )
    return {
        "severity": severity,
        "controls": controls,
        "root_cause_fixes": root_cause_fixes,
    }
