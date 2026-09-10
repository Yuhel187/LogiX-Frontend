# Shared Components

This directory contains composed UI that is reusable across routes or features
and does not know a LogiX business domain. It may import `components/ui`, other
shared components, and `lib` helpers.

Domain-aware UI remains in `src/features/<domain>/components`; route-private UI
remains beside the route in `_components`.
