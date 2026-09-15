# tiZDemos shader visual patch

Copy `src/` over the repo version that already contains the earlier Visual Debug + labeled geometry patches.

Then run:

```powershell
npm run lint
npm run dev
```

Open **Templates → Shader Visuals**.

Try:

```text
lineMask((0.5, 0.4), (-2, -1), (2, 0.5), 0.35, 0.2)
circleMask((1.55, 0.3), (0, 0), 1.5, 0.25)
patchPoint((-2, 1.5), (2, 1.2), (-1.5, -1.5), (2.5, -1), 0.35, 0.65)
drawLine((0.5, 0.4), (-2, -1), (2, 0.5), 0.35, 0.2)
```

The point arguments are draggable in the graph. Edit scalar arguments in the function field to compare `width`, `aa`, `radius`, `u`, and `v`.
