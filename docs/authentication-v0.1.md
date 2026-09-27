# OHO 2.0 — Autenticación v0.1

## Alcance

El módulo de autenticación local permite:

- Registrar clientes.
- Iniciar sesión.
- Renovar sesiones.
- Cerrar sesión.
- Consultar al usuario autenticado.
- Proteger rutas mediante access tokens.
- Limitar intentos por dirección IP.

## Endpoints

Base:

```text
/api/v1/auth
```

### Registrar una cuenta

```text
POST /register
```

Cuerpo:

```json
{
  "name": "Cliente OHO",
  "email": "cliente@example.com",
  "password": "Password-seguro-2026"
}
```

Respuesta exitosa:

```json
{
  "user": {
    "id": "identificador",
    "name": "Cliente OHO",
    "email": "cliente@example.com",
    "role": "customer",
    "createdAt": "fecha ISO"
  },
  "accessToken": "token"
}
```

También establece el refresh token mediante una cookie `httpOnly`.

### Iniciar sesión

```text
POST /login
```

Cuerpo:

```json
{
  "email": "cliente@example.com",
  "password": "Password-seguro-2026"
}
```

Devuelve el usuario público, un access token y una cookie renovable.

Las credenciales incorrectas utilizan una respuesta genérica para no revelar si
el correo está registrado.

### Renovar la sesión

```text
POST /refresh
```

Utiliza la cookie renovable y devuelve:

- Un access token nuevo.
- Una cookie renovable nueva.
- Los datos públicos del usuario.

Cada refresh token puede utilizarse una sola vez. La sesión anterior queda
revocada y relacionada con su reemplazo.

### Cerrar sesión

```text
POST /logout
```

Revoca la sesión renovable y elimina la cookie. La operación es idempotente:
también responde correctamente cuando la cookie ya no existe.

### Consultar al usuario actual

```text
GET /me
Authorization: Bearer <access-token>
```

Devuelve:

```json
{
  "user": {
    "id": "identificador",
    "name": "Cliente OHO",
    "email": "cliente@example.com",
    "role": "customer",
    "createdAt": "fecha ISO"
  }
}
```

## Sesiones

### Access token

- Formato JWT.
- Algoritmo `HS256`.
- Vigencia local predeterminada de 15 minutos.
- Incluye el identificador y rol del usuario.
- Se envía mediante `Authorization: Bearer`.
- No se persiste en MongoDB.

Después del logout, un access token ya emitido conserva validez hasta expirar.
Las operaciones sensibles deberán volver a consultar el estado activo de la
cuenta, como ya sucede en `/auth/me`.

### Refresh token

- Es un valor aleatorio de 48 bytes.
- Se entrega mediante cookie `httpOnly`.
- Solamente su hash SHA-256 se almacena en MongoDB.
- Tiene una vigencia local predeterminada de 30 días.
- Se rota después de cada renovación.
- Se revoca durante el logout.
- No forma parte de las respuestas JSON públicas.

La cookie utiliza:

- `httpOnly`.
- `SameSite=Lax` en desarrollo.
- `SameSite=None` y `Secure` en producción.
- Ruta `/api/v1/auth`.

## Contraseñas

- Se cifran mediante bcrypt.
- Se utilizan 12 rondas.
- No se almacenan ni devuelven en texto plano.
- Se rechazan contraseñas que bcrypt truncaría después de 72 bytes.
- `passwordHash` está excluido de las consultas normales.

## Rate limiting local

| Endpoint    | Ventana    | Límite |
| ----------- | ---------- | ------ |
| `/register` | 60 minutos | 20     |
| `/login`    | 15 minutos | 10     |
| `/refresh`  | 15 minutos | 60     |

Los logins exitosos no consumen el límite de intentos fallidos.

Actualmente los contadores viven en la memoria del proceso. Antes de ejecutar
varias instancias en producción deberá configurarse un almacén compartido, por
ejemplo Redis.

## Variables de entorno

```text
AUTH_ACCESS_TOKEN_SECRET
AUTH_ACCESS_TOKEN_TTL_MINUTES
AUTH_REFRESH_TOKEN_TTL_DAYS
AUTH_REFRESH_COOKIE_NAME
```

`AUTH_ACCESS_TOKEN_SECRET` debe tener al menos 32 caracteres y utilizar un valor
aleatorio diferente en cada entorno.

## Códigos de error

```text
VALIDATION_ERROR
EMAIL_ALREADY_REGISTERED
INVALID_CREDENTIALS
REFRESH_TOKEN_REQUIRED
INVALID_REFRESH_TOKEN
UNAUTHORIZED
RATE_LIMIT_EXCEEDED
INTERNAL_SERVER_ERROR
```

## Persistencia

Colecciones utilizadas:

```text
users
refreshsessions
```

Los índices TTL eliminan automáticamente las sesiones renovables vencidas.

## Pruebas cubiertas

- Validación de registro y login.
- Hash y verificación de contraseñas.
- Registro y correo duplicado.
- Login correcto e incorrecto.
- Creación y rotación de sesiones.
- Reutilización de refresh tokens.
- Logout idempotente.
- Access tokens válidos e inválidos.
- Consulta del usuario actual.
- Rate limiting.
- Contratos HTTP de autenticación.

## Integración pendiente

La conexión del frontend Next.js con estos endpoints pertenece al paso de
integración del frontend. Hasta entonces, el frontend conserva temporalmente su
implementación mock.
