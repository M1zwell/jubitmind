"""
Extraction schemas for AI interaction auditing.

Each schema defines a prompt_description, few-shot ExampleData objects,
and optional additional_context that LangExtract uses to extract structured
entities from conversation text with source grounding.

Schema design follows LangExtract best practices:
  - extraction_text must be EXACT quotes from example text
  - attributes use consistent key names within each schema
  - prompt_description specifies entity types, ordering, and attribute requirements
  - additional_context provides domain-specific guidance
"""

import langextract as lx


def _ex(text: str, extractions: list[dict]) -> lx.data.ExampleData:
    """Shorthand to build an ExampleData with proper Extraction objects."""
    return lx.data.ExampleData(
        text=text,
        extractions=[
            lx.data.Extraction(
                extraction_class=e["cls"],
                extraction_text=e["text"],
                attributes=e.get("attrs"),
            )
            for e in extractions
        ],
    )


# ---------------------------------------------------------------------------
# Schema definitions
# ---------------------------------------------------------------------------

SCHEMAS: dict[str, dict] = {
    "permission-grant": {
        "description": "Tool permission escalations — when an AI assistant is granted new capabilities or executes tools requiring elevated access.",
        "entity_types": ["permission-grant"],
        "prompt_description": (
            "Extract every instance where a tool permission is granted, requested, or escalated "
            "in order of appearance. Use exact text for extractions. Do not paraphrase or overlap entities. "
            "Include the tool name, the permission scope (e.g. file write, shell execution, network access), "
            "and whether it was user-initiated or auto-approved. "
            "Provide meaningful attributes for each entity to add context."
        ),
        "additional_context": (
            "This is an AI coding assistant conversation transcript. "
            "Tool permissions include: Bash/shell commands, file Write/Read, "
            "MCP server tools, web fetch, git operations, and code execution."
        ),
        "examples": [
            _ex(
                "The user approved Bash(rm -rf /tmp/build) with full shell access. "
                "Later, Write tool was allowed for /src/config.ts. "
                "The assistant also used the Read tool to view /etc/hosts without explicit permission.",
                [
                    {
                        "cls": "permission-grant",
                        "text": "approved Bash(rm -rf /tmp/build) with full shell access",
                        "attrs": {"tool": "Bash", "scope": "shell-execution", "initiated_by": "user", "risk": "high"},
                    },
                    {
                        "cls": "permission-grant",
                        "text": "Write tool was allowed for /src/config.ts",
                        "attrs": {"tool": "Write", "scope": "file-write", "initiated_by": "user", "risk": "medium"},
                    },
                    {
                        "cls": "permission-grant",
                        "text": "used the Read tool to view /etc/hosts without explicit permission",
                        "attrs": {"tool": "Read", "scope": "file-read", "initiated_by": "auto", "risk": "low"},
                    },
                ],
            ),
        ],
    },

    "risk-event": {
        "description": "Security-relevant actions — file deletions, environment variable access, network calls, credential handling.",
        "entity_types": ["risk-event"],
        "prompt_description": (
            "Extract every security-relevant action in order of appearance. "
            "Use exact text for extractions. Do not paraphrase or overlap entities. "
            "Include: file deletions, environment variable reads, credential access, "
            "network requests to external services, database mutations, git force operations, "
            "or any action that could have destructive or sensitive consequences. "
            "Provide severity (critical/high/medium/low), action category, and target."
        ),
        "additional_context": (
            "This is an AI coding assistant conversation. "
            "High-risk actions include: rm -rf, DROP TABLE, git push --force, "
            "accessing .env files, reading API keys, connecting to production databases, "
            "modifying CI/CD pipelines, and executing network requests to unknown hosts."
        ),
        "examples": [
            _ex(
                "The assistant ran rm -rf node_modules/ and then accessed process.env.DATABASE_URL "
                "to connect to the production database. It also executed curl https://unknown-api.com/data "
                "to fetch external data.",
                [
                    {
                        "cls": "risk-event",
                        "text": "ran rm -rf node_modules/",
                        "attrs": {"action": "file-deletion", "severity": "medium", "target": "node_modules/"},
                    },
                    {
                        "cls": "risk-event",
                        "text": "accessed process.env.DATABASE_URL to connect to the production database",
                        "attrs": {"action": "env-access", "severity": "high", "target": "DATABASE_URL"},
                    },
                    {
                        "cls": "risk-event",
                        "text": "executed curl https://unknown-api.com/data to fetch external data",
                        "attrs": {"action": "network-request", "severity": "medium", "target": "unknown-api.com"},
                    },
                ],
            ),
        ],
    },

    "code-artifact": {
        "description": "Generated code — functions, classes, config files with language, purpose, and file paths.",
        "entity_types": ["code-artifact"],
        "prompt_description": (
            "Extract every distinct piece of code that was generated or modified "
            "in order of appearance. Use exact text for extractions. Do not paraphrase. "
            "Include the programming language, the purpose/intent, the target file path if mentioned, "
            "and whether it was a new creation or modification of existing code. "
            "Provide meaningful attributes for each entity."
        ),
        "additional_context": (
            "This is an AI coding assistant conversation. Code artifacts include: "
            "new files, functions, classes, components, configuration files, "
            "database migrations, test files, and build scripts."
        ),
        "examples": [
            _ex(
                "I created a new React component in src/Button.tsx that renders a primary button "
                "with onClick handler. Then I updated the CSS in styles/button.css to add hover styles. "
                "Finally, I wrote a test in tests/Button.test.tsx.",
                [
                    {
                        "cls": "code-artifact",
                        "text": "created a new React component in src/Button.tsx",
                        "attrs": {"language": "tsx", "purpose": "UI component", "file": "src/Button.tsx", "action": "create"},
                    },
                    {
                        "cls": "code-artifact",
                        "text": "updated the CSS in styles/button.css to add hover styles",
                        "attrs": {"language": "css", "purpose": "styling", "file": "styles/button.css", "action": "modify"},
                    },
                    {
                        "cls": "code-artifact",
                        "text": "wrote a test in tests/Button.test.tsx",
                        "attrs": {"language": "tsx", "purpose": "testing", "file": "tests/Button.test.tsx", "action": "create"},
                    },
                ],
            ),
        ],
    },

    "intent-shift": {
        "description": "Topic or goal changes within a session — when the conversation pivots to a new objective.",
        "entity_types": ["intent-shift"],
        "prompt_description": (
            "Extract every point where the user's intent or topic shifts significantly "
            "in order of appearance. Use exact text for extractions. Do not paraphrase. "
            "This includes switching from one task to another, changing requirements mid-conversation, "
            "pivoting from planning to implementation, or abandoning a direction. "
            "Provide the from_topic, to_topic, and reason for the shift."
        ),
        "additional_context": (
            "This is an AI coding assistant conversation. Intent shifts often occur when: "
            "a user says 'actually', 'wait', 'let me think', 'instead', 'forget that', "
            "or pivots from one feature to another, from debugging to refactoring, "
            "or from implementation to testing."
        ),
        "examples": [
            _ex(
                "We were discussing the database schema but then the user said 'actually, let's focus on "
                "the authentication flow first'. After completing auth, they asked to switch to writing tests "
                "instead of continuing with the API endpoints.",
                [
                    {
                        "cls": "intent-shift",
                        "text": "actually, let's focus on the authentication flow first",
                        "attrs": {"from_topic": "database schema", "to_topic": "authentication flow", "reason": "reprioritization"},
                    },
                    {
                        "cls": "intent-shift",
                        "text": "asked to switch to writing tests instead of continuing with the API endpoints",
                        "attrs": {"from_topic": "API endpoints", "to_topic": "testing", "reason": "task completion"},
                    },
                ],
            ),
        ],
    },

    "architecture-decision": {
        "description": "Design choices with rationale — technology selections, pattern choices, trade-off evaluations.",
        "entity_types": ["architecture-decision"],
        "prompt_description": (
            "Extract every architectural or design decision made during the conversation "
            "in order of appearance. Use exact text for extractions. Do not paraphrase. "
            "Include what was decided, the alternatives considered, the rationale, "
            "and any trade-offs mentioned. "
            "Provide meaningful attributes for each entity."
        ),
        "additional_context": (
            "This is an AI coding assistant conversation. Architecture decisions include: "
            "framework/library choices, database design, API design patterns, "
            "state management approaches, deployment strategies, authentication methods, "
            "and infrastructure decisions."
        ),
        "examples": [
            _ex(
                "We decided to use FastAPI instead of Flask because we need async support and "
                "automatic OpenAPI docs. The trade-off is slightly more complexity in the codebase. "
                "For the database, we chose PostgreSQL with Prisma ORM over MongoDB for relational integrity.",
                [
                    {
                        "cls": "architecture-decision",
                        "text": "decided to use FastAPI instead of Flask",
                        "attrs": {
                            "decision": "FastAPI over Flask",
                            "rationale": "async support and automatic OpenAPI docs",
                            "alternatives": "Flask",
                            "tradeoff": "slightly more complexity",
                        },
                    },
                    {
                        "cls": "architecture-decision",
                        "text": "chose PostgreSQL with Prisma ORM over MongoDB for relational integrity",
                        "attrs": {
                            "decision": "PostgreSQL + Prisma",
                            "rationale": "relational integrity",
                            "alternatives": "MongoDB",
                            "tradeoff": "less schema flexibility",
                        },
                    },
                ],
            ),
        ],
    },

    "all": {
        "description": "Combined extraction — permissions, risk events, code artifacts, intent shifts, and architecture decisions in a single pass.",
        "entity_types": ["permission-grant", "risk-event", "code-artifact", "intent-shift", "architecture-decision"],
        "prompt_description": (
            "Extract all significant entities from this AI conversation transcript in order of appearance. "
            "Use exact text for extractions. Do not paraphrase or overlap entities. "
            "Entity types to extract:\n"
            "- permission-grant: Tool permissions granted, requested, or escalated\n"
            "- risk-event: Security-relevant actions (file deletions, env access, network calls, credential handling)\n"
            "- code-artifact: Generated or modified code (files, functions, components)\n"
            "- intent-shift: Topic or goal changes within the conversation\n"
            "- architecture-decision: Design choices with rationale and trade-offs\n"
            "Provide meaningful attributes for each entity to add context."
        ),
        "additional_context": (
            "This is an AI coding assistant conversation transcript from tools like Claude Code, "
            "GitHub Copilot, Cursor, or similar AI development tools. "
            "Extract entities across all categories to build a comprehensive audit trail."
        ),
        "examples": [
            _ex(
                "The user approved Bash access for the assistant. It ran git push --force to main, "
                "which overwrote the remote history. Then the user said 'wait, let's roll that back "
                "and use a proper PR workflow instead'. The assistant created a new branch feature/auth "
                "and wrote src/auth/login.ts with JWT token validation.",
                [
                    {
                        "cls": "permission-grant",
                        "text": "approved Bash access for the assistant",
                        "attrs": {"tool": "Bash", "scope": "shell-execution", "initiated_by": "user"},
                    },
                    {
                        "cls": "risk-event",
                        "text": "ran git push --force to main, which overwrote the remote history",
                        "attrs": {"action": "git-force-push", "severity": "critical", "target": "main branch"},
                    },
                    {
                        "cls": "intent-shift",
                        "text": "wait, let's roll that back and use a proper PR workflow instead",
                        "attrs": {"from_topic": "direct push", "to_topic": "PR workflow", "reason": "safety concern"},
                    },
                    {
                        "cls": "architecture-decision",
                        "text": "use a proper PR workflow instead",
                        "attrs": {"decision": "PR workflow over direct push", "rationale": "safety and review"},
                    },
                    {
                        "cls": "code-artifact",
                        "text": "wrote src/auth/login.ts with JWT token validation",
                        "attrs": {"language": "ts", "purpose": "authentication", "file": "src/auth/login.ts", "action": "create"},
                    },
                ],
            ),
        ],
    },
}


def get_schema(name: str) -> dict | None:
    """Return a schema definition by name, or None if not found."""
    return SCHEMAS.get(name)


def list_schemas() -> list[dict]:
    """Return summary info for all available schemas."""
    return [
        {
            "name": name,
            "description": s["description"],
            "entityTypes": s["entity_types"],
            "examples": len(s["examples"]),
        }
        for name, s in SCHEMAS.items()
    ]
