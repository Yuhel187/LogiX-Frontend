# Features

Create one folder per frontend business capability. A feature may add only the
subfolders it needs:

```text
<domain>/
  api/          endpoint-specific queries, commands, and DTO mapping
  components/   domain-aware UI
  hooks/        client-only feature behavior
  schemas/      boundary validation
  types/        feature and view-model types
  index.ts      optional neutral public API
  client.ts     optional client-safe public API
  server.ts     optional server-only public API
```

Use names aligned with accepted LogiX capabilities. Do not import another
feature's internals; compose features in `src/app` or use an explicitly reviewed
root public entrypoint.
