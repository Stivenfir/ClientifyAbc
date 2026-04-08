# API Corporativa Interna - Integración Clientify

API intermedia para consumo interno (ABC Mudanzas y futuras apps internas):

`Apps internas -> API corporativa -> Clientify`

## 1) Requisitos

- Node.js 20+
- npm 10+

## 2) Configuración

Copia `.env.example` a `.env` y completa valores reales:

```bash
cp .env.example .env
```

Variables clave:

- `INTERNAL_API_KEY`: clave interna del header `x-api-key`
- `CLIENTIFY_BASE_URL`: ejemplo `https://app.clientify.net/api/v2`
- `CLIENTIFY_TOKEN`: token real de Clientify (solo backend)

## 3) Ejecutar

```bash
npm install
npm run start:dev
```

- Base URL local: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/docs`

## 4) Seguridad

Todas las peticiones requieren:

```http
x-api-key: <INTERNAL_API_KEY>
```

La API interna nunca expone `CLIENTIFY_TOKEN` en responses.

---

## 5) Endpoints disponibles para pruebas

> Todos cuelgan de `/api/clientify`.

### Base

- `GET /health`
- `GET /me`
- `GET /users`

### Contactos

- `GET /contacts`
- `GET /search/contacts?query=...`
- `GET /contacts/:id`
- `POST /contacts`
- `PUT /contacts/:id`
- `GET /contacts/:id/deals`
- `GET /contacts/:id/tasks`
- `GET /contacts/:id/custom-fields`
- `GET /contacts-with-deals`
- `GET /clients/open-opportunities?pipeline=mudanzas&stage=estimado`

### Empresas

- `GET /companies`
- `GET /companies/:id`
- `POST /companies`
- `PUT /companies/:id`
- `GET /companies/sectors`
- `GET /companies/tags`

### Deals / Oportunidades

- `GET /deals`
- `GET /deals/:id`
- `POST /deals`
- `PUT /deals/:id`
- `GET /deals/:id/tasks`
- `GET /deals/:id/contacts`
- `GET /deals/pipelines`
- `GET /deals/pipelines/:id`
- `POST /deals/pipelines`
- `GET /deals/tags`

### Catálogos

- `GET /custom-fields`
- `GET /pipelines`
- `GET /tags`

---

## 6) Parámetros de listado soportados

Se pueden usar (según endpoint):

- `fields`
- `page`
- `pageSize` o `page_size`
- `orderBy` o `order_by`
- `query`
- `created`
- `createdStart` o `created_start`
- `createdEnd` o `created_end`
- `isFilter` o `is_filter`

La API mapea formato interno a formato Clientify automáticamente.

---

## 7) Ejemplos de peticiones (cURL)

> Reemplaza `<API_KEY>` y usa IDs reales.

### 7.1 Health

```bash
curl --location 'http://localhost:3000/api/clientify/health' \
--header 'x-api-key: <API_KEY>'
```

### 7.2 Me

```bash
curl --location 'http://localhost:3000/api/clientify/me' \
--header 'x-api-key: <API_KEY>'
```

### 7.3 Listar contactos

```bash
curl --location 'http://localhost:3000/api/clientify/contacts?page=1&pageSize=25&query=juan&orderBy=-created' \
--header 'x-api-key: <API_KEY>'
```

### 7.4 Buscar contactos

```bash
curl --location 'http://localhost:3000/api/clientify/search/contacts?query=mudanzas' \
--header 'x-api-key: <API_KEY>'
```

### 7.5 Detalle contacto

```bash
curl --location 'http://localhost:3000/api/clientify/contacts/2829' \
--header 'x-api-key: <API_KEY>'
```

### 7.6 Crear contacto

```bash
curl --location 'http://localhost:3000/api/clientify/contacts' \
--header 'x-api-key: <API_KEY>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "first_name": "Manley",
  "last_name": "Lueilwitz",
  "email": "Kale84@yahoo.com",
  "phone": "47-737-738-2387",
  "status": "warm-lead",
  "title": "National Research Agent",
  "company": "Cormier - Abshire",
  "remarks": "Just remarks",
  "summary": "Summary for the contact",
  "tags": ["test"],
  "gdpr_accept": true
}'
```

### 7.7 Actualizar contacto

```bash
curl --location --request PUT 'http://localhost:3000/api/clientify/contacts/2829' \
--header 'x-api-key: <API_KEY>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "title": "Senior Agent",
  "status": "customer"
}'
```

### 7.8 Deals por contacto

```bash
curl --location 'http://localhost:3000/api/clientify/contacts/2829/deals' \
--header 'x-api-key: <API_KEY>'
```

### 7.9 Crear deal

```bash
curl --location 'http://localhost:3000/api/clientify/deals' \
--header 'x-api-key: <API_KEY>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "owner": 1,
  "name": "Nuevo deal corporativo",
  "amount": "22.33",
  "currency": "COP",
  "pipeline_id": 12,
  "pipeline_stage_desc": "New Stage after update",
  "expected_closed_date": "2026-04-01",
  "contact_id": 2829,
  "company_id": 34,
  "deal_source": "10",
  "involved_contacts_ids": [2833, 2828, 2829],
  "involved_companies_ids": [403, 401, 402],
  "probability": 85
}'
```

### 7.10 Actualizar deal

```bash
curl --location --request PUT 'http://localhost:3000/api/clientify/deals/1001' \
--header 'x-api-key: <API_KEY>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "amount": "35000",
  "probability": 90
}'
```

### 7.11 Pipelines de deals

```bash
curl --location 'http://localhost:3000/api/clientify/deals/pipelines' \
--header 'x-api-key: <API_KEY>'
```

### 7.12 Crear pipeline

```bash
curl --location 'http://localhost:3000/api/clientify/deals/pipelines' \
--header 'x-api-key: <API_KEY>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "Pipeline de Postman3",
  "stages": [
    {
      "name": "stage 1",
      "position": 1,
      "probability": 5
    }
  ],
  "is_default": true,
  "user_default": false
}'
```

### 7.13 Empresas

```bash
curl --location 'http://localhost:3000/api/clientify/companies?query=abc' \
--header 'x-api-key: <API_KEY>'
```

### 7.14 Catálogos

```bash
curl --location 'http://localhost:3000/api/clientify/custom-fields' --header 'x-api-key: <API_KEY>'
curl --location 'http://localhost:3000/api/clientify/pipelines' --header 'x-api-key: <API_KEY>'
curl --location 'http://localhost:3000/api/clientify/tags' --header 'x-api-key: <API_KEY>'
```

### 7.15 Clientes con oportunidad abierta (Pipeline Mudanzas + Etapa Estimado)

```bash
curl --location 'http://localhost:3000/api/clientify/clients/open-opportunities?pipeline=mudanzas&stage=estimado&pageSize=100' \
--header 'x-api-key: <API_KEY>'
```

> Este endpoint resuelve primero `pipeline` y `stage` por nombre en `/deals/pipelines` y luego filtra deals por IDs reales + `status = 1` (abierta) + `contactId` no nulo.

---

## 8) Ejemplos de response normalizada

### Contactos list

```json
{
  "success": true,
  "timestamp": "2026-04-01T12:00:00.000Z",
  "data": {
    "total": 1,
    "next": null,
    "previous": null,
    "results": [
      {
        "id": 2829,
        "firstName": "Manley",
        "lastName": "Lueilwitz",
        "fullName": "Manley Lueilwitz",
        "email": "Kale84@yahoo.com",
        "phone": "47-737-738-2387",
        "companyId": 34,
        "companyName": "Cormier - Abshire",
        "status": "warm-lead",
        "title": "National Research Agent",
        "created": "2026-04-01",
        "remarks": "Just remarks",
        "summary": "Summary for the contact"
      }
    ]
  }
}
```

### Error encapsulado del proveedor

```json
{
  "success": false,
  "statusCode": 502,
  "path": "/api/clientify/me",
  "timestamp": "2026-04-01T12:00:00.000Z",
  "error": {
    "message": "Error del proveedor Clientify",
    "provider": "clientify",
    "providerStatus": 401,
    "providerError": {
      "detail": "Invalid token"
    }
  }
}
```

---

## 9) Postman

También puedes importar el archivo `postman_collection.json` incluido en el repo.
