"""
JubitMind LangExtract Sidecar — FastAPI service wrapping Google's LangExtract library.

Provides structured entity extraction from AI conversation text with source grounding.
Supports multiple LLM providers: Gemini, OpenAI, DeepSeek, Qwen, Ollama, or any
OpenAI-compatible endpoint (e.g. LiteLLM proxy).

Configuration is persisted to config.json and can be updated via the /config endpoint.

Usage:
    pip install -r requirements.txt
    python main.py                                      # Port 3100
    SIDECAR_PORT=3200 python main.py                    # Custom port
    GEMINI_API_KEY=xxx python main.py                    # With Gemini
    OPENAI_API_KEY=xxx python main.py                    # With OpenAI
"""

import json
import os
import sys
import tempfile
import time
import traceback
import uuid
from pathlib import Path
from typing import Any

import httpx
import langextract as lx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

# PyInstaller frozen app support: resolve resource path
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    _BUNDLE_DIR = Path(sys._MEIPASS)
else:
    _BUNDLE_DIR = Path(__file__).parent

# Import schemas from the correct location (bundled or source)
sys.path.insert(0, str(_BUNDLE_DIR))
from schemas import get_schema, list_schemas

app = FastAPI(title="JubitMind LangExtract Sidecar", version="0.78.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Persistent configuration
# ---------------------------------------------------------------------------

# For frozen apps, use a writable directory (not the bundle dir)
if getattr(sys, 'frozen', False):
    # In packaged Electron app: use the directory containing the binary
    _APP_DATA_DIR = Path(os.environ.get('JUBITMIND_DATA_DIR', Path(sys.executable).parent))
else:
    _APP_DATA_DIR = Path(__file__).parent

CONFIG_PATH = _APP_DATA_DIR / "config.json"
DATA_DIR = _APP_DATA_DIR / "data"

DEFAULT_CONFIG = {
    "provider": "gemini",
    "model_id": "gemini-2.5-flash",
    "api_key": "",
    "api_base": "",
    "ollama_url": "http://localhost:11434",
    # Extraction quality parameters
    "max_char_buffer": 2000,       # Larger for conversation context (default 1000 too small)
    "extraction_passes": 1,        # 1 = fast, 2-3 = higher recall for auditing
    "max_workers": 10,             # Parallel chunk processing
    "temperature": 0.0,            # Deterministic for audit reproducibility
    "batch_length": 10,            # Chunks per batch
}

# Map provider names to env var for API key auto-detection
API_KEY_ENV_VARS: dict[str, list[str]] = {
    "gemini": ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    "openai": ["OPENAI_API_KEY"],
    "deepseek": ["DEEPSEEK_API_KEY"],
    "qwen": ["QWEN_API_KEY", "DASHSCOPE_API_KEY"],
    "mistral": ["MISTRAL_API_KEY"],
    "xai": ["XAI_API_KEY"],
}

# Provider presets for the UI
PROVIDER_PRESETS = [
    {"id": "gemini", "name": "Google Gemini", "defaultModel": "gemini-2.5-flash", "needsKey": True, "keyEnvVars": ["GEMINI_API_KEY", "GOOGLE_API_KEY"]},
    {"id": "openai", "name": "OpenAI", "defaultModel": "gpt-4o-mini", "needsKey": True, "keyEnvVars": ["OPENAI_API_KEY"]},
    {"id": "deepseek", "name": "DeepSeek", "defaultModel": "deepseek-chat", "needsKey": True, "keyEnvVars": ["DEEPSEEK_API_KEY"], "defaultApiBase": "https://api.deepseek.com/v1"},
    {"id": "qwen", "name": "Qwen (DashScope)", "defaultModel": "qwen-plus", "needsKey": True, "keyEnvVars": ["QWEN_API_KEY"], "defaultApiBase": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"},
    {"id": "ollama", "name": "Ollama (Local)", "defaultModel": "gemma2:2b", "needsKey": False, "keyEnvVars": []},
    {"id": "openai-compatible", "name": "OpenAI-Compatible (LiteLLM / Custom)", "defaultModel": "gpt-4o-mini", "needsKey": False, "keyEnvVars": []},
]

# Alignment status → confidence score mapping
ALIGNMENT_CONFIDENCE: dict[str, float] = {
    "match_exact": 1.0,
    "match_greater": 0.85,
    "match_lesser": 0.75,
    "match_fuzzy": 0.6,
}


def _load_config() -> dict:
    """Load config from disk, merging with defaults."""
    config = {**DEFAULT_CONFIG}
    try:
        if CONFIG_PATH.exists():
            saved = json.loads(CONFIG_PATH.read_text())
            config.update(saved)
    except Exception:
        pass
    return config


def _save_config(config: dict) -> None:
    """Persist config to disk."""
    try:
        CONFIG_PATH.write_text(json.dumps(config, indent=2))
    except Exception:
        pass


def _get_api_key(config: dict) -> str:
    """Resolve API key: config value > env var > empty."""
    if config.get("api_key"):
        return config["api_key"]
    provider = config.get("provider", "")
    for env_var in API_KEY_ENV_VARS.get(provider, []):
        val = os.environ.get(env_var, "")
        if val:
            return val
    return ""


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class ExtractRequest(BaseModel):
    text: str
    schema_name: str
    model_id: str | None = None
    api_key: str | None = None
    api_base: str | None = None
    provider: str | None = None
    extraction_passes: int | None = None
    max_char_buffer: int | None = None


class ConfigUpdate(BaseModel):
    provider: str | None = None
    model_id: str | None = None
    api_key: str | None = None
    api_base: str | None = None
    ollama_url: str | None = None
    max_char_buffer: int | None = None
    extraction_passes: int | None = None
    max_workers: int | None = None
    temperature: float | None = None
    batch_length: int | None = None


class ExtractionEntity(BaseModel):
    type: str
    value: str
    confidence: float
    source_start: int
    source_end: int
    source_text: str
    alignment: str | None = None
    metadata: dict[str, Any] | None = None


class ExtractResponse(BaseModel):
    id: str
    schema_name: str
    timestamp: str
    duration_ms: int
    entities: list[ExtractionEntity]
    model_used: str
    provider: str
    total_entities: int
    text_length: int


# ---------------------------------------------------------------------------
# Provider detection and extraction
# ---------------------------------------------------------------------------


def _resolve_provider(model_id: str, provider_hint: str | None = None) -> str:
    """Determine provider from model_id or explicit hint."""
    if provider_hint and provider_hint != "auto":
        return provider_hint
    if model_id.startswith("gemini"):
        return "gemini"
    if model_id.startswith(("gpt-", "o1", "o3", "o4")):
        return "openai"
    if model_id.startswith("deepseek"):
        return "deepseek"
    if model_id.startswith("qwen"):
        return "qwen"
    if model_id.startswith("mistral"):
        return "mistral"
    return "ollama"


def _check_ollama(url: str) -> bool:
    try:
        r = httpx.get(f"{url}/api/tags", timeout=3.0)
        return r.status_code == 200
    except Exception:
        return False


def _check_endpoint(url: str) -> bool:
    """Check if an OpenAI-compatible endpoint is reachable."""
    try:
        r = httpx.get(f"{url.rstrip('/')}/models", timeout=3.0)
        return r.status_code == 200
    except Exception:
        try:
            r = httpx.get(url.rstrip("/"), timeout=3.0)
            return r.status_code in (200, 404)
        except Exception:
            return False


def _build_model_instance(
    model_id: str,
    provider: str,
    api_key: str,
    api_base: str | None,
    ollama_url: str,
) -> Any | None:
    """
    Build a pre-configured model instance for providers that don't match
    LangExtract's built-in routing (DeepSeek, Qwen, Mistral, OpenAI-compatible).

    Returns None for providers that LangExtract can route natively (Gemini, OpenAI, Ollama).
    """
    # Gemini routes natively via ^gemini pattern
    if provider == "gemini":
        return None

    # Native OpenAI models route via ^gpt- pattern
    if provider == "openai" and model_id.startswith(("gpt-", "o1", "o3", "o4")):
        return None

    # Ollama routes natively via fallback pattern
    if provider == "ollama":
        return None

    # For everything else (DeepSeek, Qwen, Mistral, openai-compatible, non-gpt OpenAI):
    # Create an OpenAI-compatible model instance with base_url to bypass routing.
    try:
        from langextract.providers.openai import OpenAILanguageModel
        base_url = api_base or None
        return OpenAILanguageModel(
            model_id=model_id,
            api_key=api_key or None,
            base_url=base_url,
        )
    except Exception as e:
        print(f"[warn] Could not create OpenAI model instance: {e}")
        return None


def _run_extraction(
    text: str,
    schema: dict,
    model_id: str,
    provider: str,
    api_key: str,
    api_base: str | None,
    ollama_url: str,
    config: dict,
) -> tuple[list[ExtractionEntity], Any]:
    """
    Run LangExtract and convert results to our entity format.
    Returns (entities, raw_annotated_document) for visualization support.
    """
    kwargs: dict[str, Any] = {
        "text_or_documents": text,
        "prompt_description": schema["prompt_description"],
        "examples": schema["examples"],
        "model_id": model_id,
        "show_progress": False,
        # Quality parameters from config
        "max_char_buffer": config.get("max_char_buffer", 2000),
        "extraction_passes": config.get("extraction_passes", 1),
        "max_workers": config.get("max_workers", 10),
        "batch_length": config.get("batch_length", 10),
        "temperature": config.get("temperature", 0.0),
        # Batch resilience — don't crash on single chunk parse errors
        "resolver_params": {"suppress_parse_errors": True},
    }

    # Add additional_context if schema has it
    if schema.get("additional_context"):
        kwargs["additional_context"] = schema["additional_context"]

    # Try to build a pre-configured model instance for non-native providers
    model_instance = _build_model_instance(model_id, provider, api_key, api_base, ollama_url)

    if model_instance is not None:
        # Bypass LangExtract's routing entirely — use our pre-built model
        kwargs["model"] = model_instance
        kwargs["fence_output"] = True
        kwargs["use_schema_constraints"] = False
    elif provider == "ollama":
        kwargs["model_url"] = ollama_url
        kwargs["fence_output"] = False
        kwargs["use_schema_constraints"] = False
    elif provider == "gemini":
        if api_key:
            kwargs["api_key"] = api_key
        # Gemini supports schema constraints natively
        kwargs["use_schema_constraints"] = True
    elif provider == "openai":
        if api_key:
            kwargs["api_key"] = api_key
        if api_base:
            kwargs["language_model_params"] = {"base_url": api_base}
        kwargs["fence_output"] = True
        kwargs["use_schema_constraints"] = False

    result = lx.extract(**kwargs)

    entities: list[ExtractionEntity] = []
    if result is None:
        return entities, None

    # Handle both single AnnotatedDocument and list[AnnotatedDocument]
    extractions = []
    if hasattr(result, "extractions") and result.extractions:
        extractions = result.extractions
    elif isinstance(result, list):
        for doc in result:
            if hasattr(doc, "extractions") and doc.extractions:
                extractions.extend(doc.extractions)

    for ext in extractions:
        # Source grounding — use char_interval (the key LangExtract feature)
        start_pos = 0
        end_pos = 0
        if ext.char_interval is not None:
            start_pos = ext.char_interval.start_pos or 0
            end_pos = ext.char_interval.end_pos or 0

        # Confidence from alignment status
        alignment_str = ""
        confidence = 0.5  # default for no alignment info
        if ext.alignment_status is not None:
            alignment_str = ext.alignment_status.value
            confidence = ALIGNMENT_CONFIDENCE.get(alignment_str, 0.5)

        # Source text — extract actual span from source using char_interval
        source_text = ext.extraction_text or ""
        if start_pos > 0 or end_pos > 0:
            try:
                source_text = text[start_pos:end_pos]
            except (IndexError, TypeError):
                source_text = ext.extraction_text or ""

        entity = ExtractionEntity(
            type=ext.extraction_class or "unknown",
            value=ext.extraction_text or "",
            confidence=confidence,
            source_start=start_pos,
            source_end=end_pos,
            source_text=source_text,
            alignment=alignment_str or None,
            metadata=ext.attributes,
        )
        entities.append(entity)

    return entities, result


# Store last raw result for visualization
_last_results: dict[str, Any] = {}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    return {"ok": True, "service": "langextract-sidecar", "version": "1.1.0"}


@app.get("/schemas")
async def schemas():
    return {"schemas": list_schemas()}


@app.get("/providers")
async def providers():
    """List available provider presets with auto-detected key status."""
    config = _load_config()
    result = []
    for preset in PROVIDER_PRESETS:
        has_key = False
        for env_var in preset.get("keyEnvVars", []):
            if os.environ.get(env_var, ""):
                has_key = True
                break
        if config.get("provider") == preset["id"] and config.get("api_key"):
            has_key = True

        result.append({
            **preset,
            "hasKey": has_key,
            "isActive": config.get("provider") == preset["id"],
        })
    return {"providers": result}


@app.get("/status")
async def status():
    """Check current provider configuration and availability."""
    config = _load_config()
    api_key = _get_api_key(config)
    provider = config.get("provider", "gemini")
    ollama_url = config.get("ollama_url", "http://localhost:11434")
    api_base = config.get("api_base", "")

    provider_status = {
        "ollama": {"available": _check_ollama(ollama_url), "url": ollama_url},
        "gemini": {
            "available": bool(api_key) if provider == "gemini" else any(os.environ.get(v) for v in ["GEMINI_API_KEY", "GOOGLE_API_KEY"]),
            "hasKey": bool(api_key) if provider == "gemini" else any(bool(os.environ.get(v)) for v in ["GEMINI_API_KEY", "GOOGLE_API_KEY"]),
        },
        "openai": {
            "available": bool(api_key) if provider == "openai" else bool(os.environ.get("OPENAI_API_KEY")),
            "hasKey": bool(api_key) if provider == "openai" else bool(os.environ.get("OPENAI_API_KEY")),
        },
        "openai-compatible": {"available": _check_endpoint(api_base) if api_base else False, "url": api_base},
    }

    return {
        "available": True,
        "version": "1.1.0",
        "providers": provider_status,
        "activeProvider": provider,
        "activeModel": config.get("model_id", ""),
        "hasApiKey": bool(api_key),
        "apiBase": api_base,
    }


@app.get("/config")
async def get_config():
    """Get current configuration (API key masked)."""
    config = _load_config()
    masked = {**config}
    if masked.get("api_key"):
        key = masked["api_key"]
        masked["api_key"] = key[:4] + "..." + key[-4:] if len(key) > 8 else "***"
    masked["hasApiKey"] = bool(_get_api_key(config))
    return masked


@app.post("/config")
async def update_config(update: ConfigUpdate):
    """Update configuration."""
    config = _load_config()
    for field in ("provider", "model_id", "api_key", "api_base", "ollama_url",
                  "max_char_buffer", "extraction_passes", "max_workers", "temperature", "batch_length"):
        val = getattr(update, field, None)
        if val is not None:
            config[field] = val
    _save_config(config)
    return {"ok": True, "config": {**config, "api_key": "***" if config.get("api_key") else ""}}


@app.post("/extract", response_model=ExtractResponse)
async def extract(req: ExtractRequest):
    """Run structured extraction on text using a named schema."""
    schema = get_schema(req.schema_name)
    if not schema:
        available = [s["name"] for s in list_schemas()]
        raise HTTPException(status_code=400, detail=f"Unknown schema '{req.schema_name}'. Available: {available}")

    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text must not be empty")

    config = _load_config()

    # Request-level overrides > saved config > defaults
    model_id = req.model_id or config.get("model_id", "gemini-2.5-flash")
    provider = req.provider or config.get("provider", "gemini")
    api_key = req.api_key or _get_api_key(config)
    api_base = req.api_base or config.get("api_base", "")
    ollama_url = config.get("ollama_url", "http://localhost:11434")

    # Per-request quality overrides
    run_config = {**config}
    if req.extraction_passes is not None:
        run_config["extraction_passes"] = req.extraction_passes
    if req.max_char_buffer is not None:
        run_config["max_char_buffer"] = req.max_char_buffer

    resolved_provider = _resolve_provider(model_id, provider)

    start = time.time()
    try:
        entities, raw_result = _run_extraction(
            req.text, schema, model_id, resolved_provider,
            api_key, api_base, ollama_url, run_config,
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

    duration_ms = int((time.time() - start) * 1000)
    result_id = f"ext-{uuid.uuid4().hex[:12]}"

    # Cache raw result for visualization
    if raw_result is not None:
        _last_results[result_id] = raw_result

    # Persist to JSONL using LangExtract's native format
    if raw_result is not None:
        _save_result_jsonl(result_id, raw_result)

    return ExtractResponse(
        id=result_id,
        schema_name=req.schema_name,
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        duration_ms=duration_ms,
        entities=entities,
        model_used=model_id,
        provider=resolved_provider,
        total_entities=len(entities),
        text_length=len(req.text),
    )


def _save_result_jsonl(result_id: str, annotated_doc: Any) -> None:
    """Save extraction result as JSONL using LangExtract's native I/O."""
    try:
        output_dir = DATA_DIR / "results"
        output_dir.mkdir(parents=True, exist_ok=True)
        lx.io.save_annotated_documents(
            [annotated_doc] if not isinstance(annotated_doc, list) else annotated_doc,
            output_dir=str(output_dir),
            output_name=f"{result_id}.jsonl",
            show_progress=False,
        )
    except Exception as e:
        print(f"[warn] Could not save JSONL: {e}")


@app.get("/visualize/{result_id}", response_class=HTMLResponse)
async def visualize(result_id: str):
    """Generate interactive HTML visualization for an extraction result."""
    # Try from in-memory cache first
    raw = _last_results.get(result_id)
    if raw is not None:
        try:
            html = lx.visualize(raw)
            content = html.data if hasattr(html, "data") else str(html)
            return HTMLResponse(content=content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Visualization failed: {str(e)}")

    # Try from saved JSONL file
    jsonl_path = DATA_DIR / "results" / f"{result_id}.jsonl"
    if jsonl_path.exists():
        try:
            html = lx.visualize(str(jsonl_path))
            content = html.data if hasattr(html, "data") else str(html)
            return HTMLResponse(content=content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Visualization from file failed: {str(e)}")

    raise HTTPException(status_code=404, detail=f"No result found for id '{result_id}'")


@app.get("/results")
async def list_results():
    """List all saved extraction result files."""
    results_dir = DATA_DIR / "results"
    if not results_dir.exists():
        return {"results": [], "count": 0}

    files = sorted(results_dir.glob("ext-*.jsonl"), key=lambda f: f.stat().st_mtime, reverse=True)
    result_list = []
    for f in files[:100]:
        result_list.append({
            "id": f.stem,
            "filename": f.name,
            "size_bytes": f.stat().st_size,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(f.stat().st_mtime)),
        })
    return {"results": result_list, "count": len(files)}


if __name__ == "__main__":
    import uvicorn
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    port = int(os.environ.get("SIDECAR_PORT", "3100"))
    # PyInstaller frozen apps: must use workers=1 (multiprocessing breaks)
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        workers=1,
        log_level="info",
    )
