# xai-business

Aplicación full-stack para generar reportes XAI justificativos en decisiones críticas (crédito) con experiencia multi-página y salida en documento Word legible.

## Flujo de producto

1. **Login / registro** (`/login.html`).
2. **Gestión de modelos** (`/models.html`): alta de modelo, tipo de modelo y selección de técnicas XAI.
3. **Casos y reportes** (`/cases.html`): registrar decisión por persona e inputs concretos, generar reporte y descargar `.doc`.

## Catálogo XAI incorporado

- SHAP
- LIME
- Counterfactual Explanations
- PDP/ICE
- Permutation Feature Importance
- Anchors

## Backend API

- `POST /api/login`
- `POST /api/users`
- `GET/POST /api/models?userId=...`
- `GET/POST /api/cases?userId=...`
- `GET /api/xai-models`
- `POST /api/report` (genera narrativa + documento)
- `GET /api/reports/:reportId/doc` (descarga Word)

## Nota sobre IA generativa

El backend deja una función preparada para narrativa asistida por IA (`composeReportNarrative`).
Sin `OPENAI_API_KEY`, usa una plantilla robusta y legible automáticamente.

## Ejecutar

```bash
npm start
```

## Tests

```bash
npm test
```
