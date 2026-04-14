# Roadmap de Mejoras — serverlm (Server LM)

> Basado en: `Analisis_Mejoras_CAB_Seguridad.md` + revisión del código fuente real  
> Fecha: abril 2026

---

## Diagnóstico real vs. análisis (contrastado con el código)

Antes del plan, algunos ajustes al diagnóstico original:

| Punto del análisis | Estado real |
|--------------------|-------------|
| Rate limiting ausente | **Parcialmente incorrecto** — `slowapi` ya está instalado y configurado en `main.py`. Lo que falta es aplicarlo a endpoints específicos |
| N+1 queries en auth | **Correcto** — `_cargar_contexto` hace 12+ queries secuenciales, sin ningún cache |
| RLS ausente | **Correcto** — confirmado: ninguna migración tiene `ENABLE ROW LEVEL SECURITY` |
| Credenciales LLM sin cifrar | **Correcto** — `llm_credenciales` guarda API keys en texto plano |
| Polling de 3s es problemático | **Parcialmente** — 3s es razonable; el problema real es escala, no el intervalo |
| Migrar a ORM (SQLAlchemy) | **Opinable** — el sistema usa Supabase client con propósito; migrar sería alto riesgo y bajo beneficio neto |

---

## Plan de mejoras por prioridad

### Prioridad 1 — Seguridad crítica
### Prioridad 2 — Rendimiento observable  
### Prioridad 3 — Calidad de código  
### Prioridad 4 — Largo plazo / según escala

---

## PRIORIDAD 1 — Seguridad crítica

### 1.1 Rate limiting por endpoint sensible

**Estado**: SlowAPI instalado y registrado en `main.py` — pero **ningún endpoint tiene límite aplicado**.  
**Riesgo**: Un usuario malintencionado puede automatizar requests al chat o al pipeline LLM y agotar créditos de API sin restricción.

**Esfuerzo**: 1 día  
**Impacto**: Alto — protege directamente el costo operativo

**Implementación**:
```python
# En cada router con llamadas LLM, agregar el decorador:
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/conversaciones/{id}/mensajes/stream")
@limiter.limit("20/minute")          # por IP
@limiter.limit("100/hour")           # por IP
async def enviar_mensaje(request: Request, ...):
    ...
```

**Endpoints a proteger primero**:
- `POST /chat/conversaciones/{id}/mensajes/stream` — streaming LLM
- `POST /cola-estados-docs/ejecutar` — dispara worker LLM
- `POST /documentos/{id}/buscar-semantico` — vectorización query
- `POST /auth/login` — fuerza bruta de credenciales

**Límites sugeridos por endpoint**:
| Endpoint | Límite |
|----------|--------|
| Chat (stream) | 30/minuto por usuario |
| Cola ejecutar | 10/minuto por grupo |
| Login | 10/minuto por IP |
| Búsqueda semántica | 20/minuto por usuario |

---

### 1.2 Cifrado de API keys de proveedores LLM

**Estado**: Tabla `llm_credenciales` guarda API keys en texto plano en Supabase.  
**Riesgo**: Si alguien accede a la BD (dump, misconfigured RLS, leak de service_role key), obtiene todas las keys de todos los grupos.

**Esfuerzo**: 2-3 días  
**Impacto**: Alto — datos sensibles de clientes

**Implementación usando `pgcrypto` (ya disponible en Supabase)**:

```sql
-- Habilitar extensión (Supabase ya la tiene disponible)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Al insertar: cifrar con clave simétrica de la app
UPDATE llm_credenciales 
SET api_key = encode(
  pgp_sym_encrypt(api_key, current_setting('app.encryption_key')), 
  'base64'
);

-- Al leer: descifrar
SELECT pgp_sym_decrypt(
  decode(api_key, 'base64'),
  current_setting('app.encryption_key')
)::text AS api_key
FROM llm_credenciales
WHERE id = $1;
```

**Alternativa más simple** (sin pgcrypto, más portátil):  
Cifrar/descifrar en Python con `cryptography.fernet` antes de enviar a BD. La clave de cifrado va en variable de entorno Railway.

```python
# app/helpers/crypto.py
from cryptography.fernet import Fernet
import os

_fernet = Fernet(os.environ["ENCRYPTION_KEY"].encode())

def cifrar(texto: str) -> str:
    return _fernet.encrypt(texto.encode()).decode()

def descifrar(texto: str) -> str:
    return _fernet.decrypt(texto.encode()).decode()
```

**Recomendación**: usar la opción Python (Fernet) — más fácil de rotar la clave, más independiente de Supabase.

**Migración de datos existentes**: script que lee, cifra y reescribe todas las rows.

---

### 1.3 Row Level Security (RLS) como red de seguridad

**Estado**: Sin RLS. El multi-tenancy se basa exclusivamente en el backend Python.  
**Riesgo**: Un bug en cualquier endpoint puede filtrar datos entre grupos.

**Esfuerzo**: 2-3 semanas (diseño + testing exhaustivo)  
**Impacto**: Muy alto — defensa en profundidad para multi-tenancy

> ⚠️ **Complejidad importante**: el sistema usa la `service_role` key de Supabase, que **bypass RLS por diseño**. Para que RLS funcione, los endpoints tendrían que:
> 1. Usar la `anon` key + JWT del usuario, O
> 2. Setear `app.codigo_grupo` en cada conexión y usar `SET LOCAL` antes de cada query, como ya se hace en el chat SQL (`_cargar_contexto` ya tiene parte de este patrón), O
> 3. Crear un rol Postgres específico (como `chat_readonly`) para acceso restringido

**Enfoque recomendado** (incremental, sin romper lo existente):
- **Fase a**: Habilitar RLS en las tablas más sensibles: `usuarios`, `documentos`, `chat_conversaciones`, `embeddings_chunks`
- **Fase b**: Crear políticas que usen `current_setting('app.codigo_grupo')` — la misma variable que ya se setea para el chat
- **Fase c**: En los endpoints de alto riesgo, usar `SET LOCAL app.codigo_grupo = $1` antes de la query en psycopg (ya se hace en `llm_tools.py`)

```sql
-- Ejemplo de política para documentos:
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY documentos_por_grupo ON documentos
  USING (codigo_grupo = current_setting('app.codigo_grupo', true));
```

**Cuándo atacarlo**: cuando haya un segundo cliente real en producción. La urgencia sube dramáticamente con el primer cliente pagador.

---

## PRIORIDAD 2 — Rendimiento observable

### 2.1 Cache del contexto de usuario

**Estado**: `_cargar_contexto` ejecuta 12+ queries a BD en cada request autenticado. Sin cache.  
**Impacto**: Cada request HTTP (incluyendo polling cada 3s de procesar-documentos) hace un viaje completo a BD.

**Esfuerzo**: 3-4 días  
**Impacto**: Alto — reduce carga de BD en >80% para usuarios activos

**Opción A — Cache en memoria (sin Redis, para empezar)**:

```python
# app/services/context_cache.py
import asyncio, time
from typing import Optional

_cache: dict[str, tuple[dict, float]] = {}  # {usuario_key: (contexto, timestamp)}
TTL = 30  # segundos

def get_cached(key: str) -> Optional[dict]:
    if key in _cache:
        ctx, ts = _cache[key]
        if time.time() - ts < TTL:
            return ctx
    return None

def set_cached(key: str, ctx: dict):
    _cache[key] = (ctx, time.time())

def invalidate(codigo_usuario: str):
    keys_a_borrar = [k for k in _cache if k.startswith(codigo_usuario)]
    for k in keys_a_borrar:
        del _cache[k]
```

Cache key: `f"{codigo_usuario}:{grupo_activo}:{entidad_activa}:{aplicacion_activa}"`  
Invalida cuando: el usuario cambia grupo/entidad/app, o cuando un mantenedor modifica sus roles/permisos.

**Opción B — Redis** (para escala real, múltiples instancias Railway):  
Requiere agregar Redis como servicio en Railway (~$10/mes) y `redis-py` en requirements.  
Recomendado solo cuando haya >50 usuarios concurrentes.

**Recomendación**: empezar con Opción A. Si Railway escala a múltiples instancias en el futuro, migrar a Redis.

---

### 2.2 Reducir agresividad del polling en procesamiento de documentos

**Estado**: El frontend hace una request HTTP cada 3 segundos mientras procesa documentos.  
**Impacto real**: Con pocos usuarios simultáneos, el impacto es mínimo. Con 20+ usuarios procesando a la vez, son 400+ requests/minuto solo de polling.

**Esfuerzo**: 1 semana (frontend + backend)  
**Impacto**: Medio — solo relevante con muchos usuarios concurrentes

**Opción A — Backoff exponencial** (cambio mínimo, sin infraestructura nueva):
```typescript
// Empezar en 2s, duplicar hasta máximo 10s cuando no hay cambios
let pollingInterval = 2000
const MAX_INTERVAL = 10000

// Si el estado no cambió en el último poll:
pollingInterval = Math.min(pollingInterval * 1.5, MAX_INTERVAL)

// Si el estado cambió:
pollingInterval = 2000  // reset
```

**Opción B — Supabase Realtime** (solución óptima):  
Supabase tiene canales Realtime sobre cambios en tablas Postgres. El frontend se suscribe a cambios en `cola_estados_docs` y recibe push cuando cambia el estado — sin ningún polling.

```typescript
// frontend: suscripción Realtime a cambios en cola
const channel = supabase
  .channel('cola-progreso')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'cola_estados_docs',
    filter: `codigo_grupo=eq.${grupoActivo}`
  }, (payload) => {
    actualizarProgreso(payload.new)
  })
  .subscribe()
```

**Recomendación**: Opción A como mejora inmediata. Opción B cuando haya >20 usuarios procesando en simultáneo.

---

## PRIORIDAD 3 — Calidad de código

### 3.1 Refactorizar `dependencies.py`

**Estado**: 573 líneas con lógica mezclada — resolución de grupos, temas visuales, menú dinámico, parámetros de sesión, auditoría.  
**Riesgo**: Alto costo de mantenimiento. Difícil de testear unitariamente.

**Esfuerzo**: 1 semana  
**Impacto**: Calidad de código, no funcionalidad

**Estructura propuesta**:
```
backend/app/services/
├── context_loader.py      # Lógica de _cargar_contexto (queries Q1-Q12)
├── theme_resolver.py      # Mueve lógica de paleta/logo (ya está en theme_utils.py, ampliar)
├── menu_builder.py        # Construcción del menú dinámico desde roles/funciones
└── session_params.py      # Resolución de parámetros de sesión (URL inicio, etc.)
```

`dependencies.py` queda como orquestador delgado que llama a estos servicios.

**Cuándo atacarlo**: cuando haya un bug difícil de localizar en `dependencies.py` o cuando se necesite escribir tests unitarios de autenticación.

---

### 3.2 Fragmentación SQL/Python (ORM)

**Evaluación**: El análisis recomienda migrar a SQLAlchemy. **No recomendamos esto** por las siguientes razones:

- El sistema usa Supabase client deliberadamente — PostgREST + RPC + Realtime son ventajas que SQLAlchemy no puede reemplazar
- `fn_carga_masiva_documentos` en SQL es intencionalmente rápida (2-4s para 1500 docs) — un ORM Python no iguala ese rendimiento en batch
- Migrar implicaría reescribir ~3000 líneas de queries, con alto riesgo de regresiones

**Recomendación**: Mantener el patrón actual. Lo que sí se puede mejorar es documentar claramente qué lógica va en SQL (operaciones batch, búsquedas complejas) y qué en Python (orquestación, validación de negocio, llamadas LLM).

---

## PRIORIDAD 4 — Largo plazo

### 4.1 Tests automatizados

Actualmente no hay tests. Antes de cualquier refactorización mayor, es necesario tener tests de regresión.

**Por dónde empezar**:
- Tests de integración para `GET /auth/me` — el endpoint más crítico
- Tests para los 5-6 endpoints del pipeline de documentos
- Mock del Supabase client para tests rápidos

**Esfuerzo**: 2 semanas para cobertura básica  
**Herramienta**: `pytest` + `httpx` (ya compatible con FastAPI)

---

### 4.2 Observabilidad

Sin métricas es imposible saber si las mejoras de rendimiento funcionaron.

**Mínimo viable**:
- Agregar tiempo de ejecución de `_cargar_contexto` en headers de respuesta (`X-Context-Time`)
- Log estructurado (JSON) con `structlog` para Railway
- Endpoint `GET /metrics` con contadores básicos (requests/min, errores, cache hits)

---

## Resumen ejecutivo y orden de implementación

| # | Mejora | Esfuerzo | Impacto | Cuándo |
|---|--------|----------|---------|--------|
| 1 | Rate limiting por endpoint (SlowAPI ya instalado) | 1 día | Alto | **Ahora** |
| 2 | Cifrado API keys LLM (Fernet) | 3 días | Alto | **Antes del primer cliente** |
| 3 | Cache contexto usuario (in-memory) | 4 días | Alto | Cuando haya >10 usuarios |
| 4 | Polling con backoff exponencial | 1 día | Medio | Cuando haya >10 usuarios procesando simultáneo |
| 5 | Refactor dependencies.py en servicios | 1 semana | Medio | Próximo sprint tranquilo |
| 6 | RLS en tablas sensibles | 2-3 semanas | Muy alto | Antes de segundo cliente en producción |
| 7 | Supabase Realtime (reemplaza polling) | 1 semana | Medio | Cuando haya >20 usuarios concurrentes |
| 8 | Tests automatizados básicos | 2 semanas | Alto (largo plazo) | Antes de cualquier refactoring mayor |
| 9 | Redis (cache distribuido) | 3 días | Alto | Cuando Railway escale a múltiples instancias |
| 10 | Observabilidad / métricas | 1 semana | Medio | Cuando haya clientes en producción |

### Criterio de priorización

```
Seguridad del cliente (credenciales, datos) > Costo operativo (rate limit, cache) 
> Calidad de código > Escalabilidad futura
```

No atacar ítems de escala (Redis, WebSockets, RLS completo) antes de tener el problema real.  
El sistema actual es correcto y funcional — las mejoras son de endurecimiento, no de corrección de bugs.
