# API Infrastructure

This directory owns endpoint-agnostic HTTP mechanics such as server/browser
transport, request headers, serialization, cancellation, and normalized
transport errors. It must not contain endpoint paths or business rules.

Endpoint-specific queries and commands belong to
`src/features/<domain>/api`. Do not implement server or browser transports until
the authentication/BFF decision is accepted.
