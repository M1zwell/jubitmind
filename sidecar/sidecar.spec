# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for JubitMind LangExtract Sidecar.

Bundles the FastAPI sidecar + LangExtract into a standalone binary.
Uses --onedir mode for faster startup (~2-3s vs ~10s for --onefile).

Build:
    cd sidecar
    pip install pyinstaller
    pyinstaller sidecar.spec

Output: dist/sidecar/sidecar (macOS/Linux) or dist/sidecar/sidecar.exe (Windows)
"""

import sys
import os

block_cipher = None

# Platform-specific hidden imports
hidden_imports = [
    # Core app
    'schemas',
    # FastAPI + Uvicorn
    'fastapi',
    'fastapi.middleware',
    'fastapi.middleware.cors',
    'fastapi.responses',
    'uvicorn',
    'uvicorn.config',
    'uvicorn.main',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.http.httptools_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'uvicorn.lifespan.off',
    'uvicorn.logging',
    'httptools',
    'httptools.parser',
    'httptools.parser.parser',
    # Pydantic v2
    'pydantic',
    'pydantic.deprecated',
    'pydantic.deprecated.decorator',
    'pydantic._internal',
    'pydantic._internal._core_utils',
    'pydantic._internal._validators',
    'pydantic._internal._generate_schema',
    'pydantic_core',
    # Starlette (FastAPI dependency)
    'starlette',
    'starlette.routing',
    'starlette.responses',
    'starlette.middleware',
    'starlette.exceptions',
    'starlette.concurrency',
    'starlette.status',
    # LangExtract
    'langextract',
    'langextract.data',
    'langextract.io',
    'langextract.extraction',
    'langextract.providers',
    'langextract.providers.openai',
    'langextract.providers.gemini',
    'langextract.providers.ollama',
    # HTTP
    'httpx',
    'httpcore',
    'anyio',
    'anyio._backends',
    'anyio._backends._asyncio',
    'sniffio',
    'h11',
    'certifi',
    'idna',
    # JSON
    'json',
    'uuid',
    # Email validator (pydantic dependency)
    'email_validator',
    # Multipart (FastAPI file upload support)
    'multipart',
    'python_multipart',
    # Pandas (used by langextract.io)
    'pandas',
    'pandas.io',
    'pandas.io.formats',
    'pandas.io.formats.format',
    # Numpy (pandas dependency)
    'numpy',
    'numpy._core',
    'numpy._core._methods',
    # Google AI (langextract providers)
    'google',
    'google.genai',
    'google.auth',
    'google.api_core',
    'proto',
    'grpc',
]

# uvloop only on macOS/Linux (not available on Windows)
if sys.platform != 'win32':
    hidden_imports.extend([
        'uvloop',
        'uvloop._noop',
    ])

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('schemas.py', '.'),
    ],
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'scipy',
        'PIL',
        'cv2',
        'torch',
        'tensorflow',
        'IPython',
        'jupyter',
        'notebook',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='sidecar',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # No console window (runs as background service)
    disable_windowed_traceback=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='sidecar',
)
