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


def build_playbook_actions(incident):
    baseline_actions = ACTION_MAP.get(
        incident.attack_type,
        ["session_suspension", "parameter_filtering", "rate_limiting"],
    )
    return [
        {
            "action_type": action_name,
            "action_status": "applied",
            "details": {
                "reason": f"Automated response for {incident.attack_type}",
                "severity": incident.severity,
            },
        }
        for action_name in baseline_actions
    ]
