# xai-business

Aplicación full-stack para generar reportes XAI justificativos en decisiones críticas (p. ej. crédito) con enfoque de cumplimiento EU AI Act.

## Qué mejora esta versión

- Interfaz moderna tipo workspace (sidebar + panel principal).
- Gestión por usuario: cada persona puede tener sus modelos y sus casos.
- Registro de casos por persona evaluada, incluyendo inputs concretos usados para justificar la decisión.
- Generación de reporte centrado en decisión individual (persona/caso) con trazabilidad.

## Funcionalidades

- `GET /api/techniques`: catálogo de técnicas XAI.
- `GET/POST /api/users`: gestión de usuarios propietarios de modelos/casos.
- `GET/POST /api/models`: modelos por usuario.
- `GET/POST /api/cases`: decisiones por persona evaluada.
- `POST /api/report`: genera el reporte justificativo para un caso específico.

## Ejecutar

```bash
npm start
```

Abrir `http://localhost:3000`.

## Tests

```bash
npm test
```
