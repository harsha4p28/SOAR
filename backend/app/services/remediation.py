REMEDIATION_LIBRARY = {
    "SQL_INJECTION": {
        "code_fixes": [
            "Replace dynamic query concatenation with parameterized queries",
            "Validate numeric and string input schemas at API boundary",
        ],
        "verification": [
            "Run SQL injection regression test suite",
            "Review ORM query logs for unsafe patterns",
        ],
    },
    "CROSS_SITE_SCRIPTING": {
        "code_fixes": [
            "Apply output encoding for untrusted fields",
            "Enable strict Content Security Policy",
        ],
        "verification": [
            "Run browser payload test cases",
            "Validate escaped output in templates",
        ],
    },
    "SERVER_SIDE_REQUEST_FORGERY": {
        "code_fixes": [
            "Enforce outbound URL allowlist",
            "Reject private IP and loopback destinations",
        ],
        "verification": [
            "Run SSRF canary endpoint checks",
            "Confirm blocked metadata endpoint access",
        ],
    },
}


def remediation_plan_for(attack_type):
    default_plan = {
        "code_fixes": [
            "Enforce input validation and output encoding",
            "Apply object-level access controls",
        ],
        "verification": ["Run targeted security regression tests"],
    }
    return REMEDIATION_LIBRARY.get(attack_type, default_plan)
