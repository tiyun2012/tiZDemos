# Shader visualization patch

Adds reusable visual-debug support for the GLSL helpers discussed in chat.

## New visualization expressions

- `lineMask(P, A, B, width, aa)`
  - draggable P, A, B
  - finite-segment closest point and distance
  - solid `width` boundary
  - `width + aa` falloff boundary
  - live mask value
- `circleMask(P, C, radius, aa)`
  - draggable P and center
  - radius and AA ring
  - live radial distance and mask
- `patchPoint(p00, p10, p01, p11, u, v)`
  - draggable patch corners
  - visualizes `top = mix(p00,p10,u)` and `bottom = mix(p01,p11,u)`
  - visualizes final `mix(top,bottom,v)` point
- `drawLine(P, A, B, width, aa)`
  - teaching alias focused on the mask `m` that drives `mix(color, lineColor, m)`

## Renderer extension

The existing visual-debug layer now supports reusable circle/ellipse primitives in graph coordinates. This keeps these GLSL demos on the same graph renderer rather than creating a separate UI.

## Notes

`width`, `aa`, `radius`, `u`, and `v` are edited directly in the function field for now. Draggable scalar handles/sliders can be added later without changing the visualization definitions.
