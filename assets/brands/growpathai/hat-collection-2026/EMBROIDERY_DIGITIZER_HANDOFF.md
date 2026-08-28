# GrowPathAI Hat Embroidery Digitizer Handoff

Status: source artwork and stitch plan prepared; machine files and physical sew-outs pending.

## Required returned files

The decorator/digitizer must return, for every approved placement and size:

- a Tajima `DST` production file;
- the editable native source used by the shop (`EMB`, `PXF`, `OFM`, or equivalent);
- a color-change/thread chart;
- a stitch simulator image and stitch count;
- machine, needle, backing, topping, speed, hoop and design-size settings; and
- a photo of the physical sew-out on the exact selected blank.

The SVG files in `source-art/` are clean design sources, not machine stitch files. A
renamed SVG, raster trace or untested auto-digitized file must never be labeled as the
production `DST`.

## Standard placement envelopes

| Placement | Finished design envelope | Construction intent |
|---|---:|---|
| Heritage front | maximum 65 x 60 mm | centered across the two front panels; preserve center-seam clearance |
| Gramps pinch front | maximum 60 x 56 mm | center on pinch-front face above rope |
| Wordmark front | maximum 112 x 32 mm | keep the cap center seam from splitting narrow letters where possible |
| Right side monogram | maximum 38 x 18 mm | 16–20 mm above lower seam, optically centered |
| Left side path mark | maximum 34 x 18 mm | mirror the right-side optical height |
| Rear wordmark | target 42 x 7 mm; maximum 48 x 9 mm | one small line centered 13–18 mm above opening |
| Grow Together patch | target 88 x 52 mm | embroidered patch or direct embroidery only after a clean sew-out |
| Prism Terrain patch | target 58 x 51 mm | woven patch preferred if the fine grid does not survive embroidery |

The physical sample controls final placement. Measurements must be confirmed against the
actual crown seams and the decorator's hoop before `DST` approval.

## Digitizing rules

- Preserve a finished minimum line/column width of 1.2 mm for circuit traces.
- Preserve circuit nodes at no less than 2.2 mm outside diameter with an open center when
  shown; do not allow nodes to fill solid during the sew-out.
- Use satin columns for clean borders and strokes that remain within the shop's tested
  satin width. Use tatami/fill only for larger closed areas.
- Use center-run plus edge-run underlay for ordinary satin. Add zigzag underlay only where
  the blank and column width need it.
- Start test density near 0.40 mm for satin and 0.45 mm for fill, then let the physical
  sew-out determine the production value. Do not treat these starting values as universal.
- Use short running stitches only for geometry that remains legible. Redraw rather than
  forcing sub-millimeter detail into thread.
- Minimize jumps across the visible face; trim between separated nodes/letters when a
  connecting travel stitch would show.
- Flat embroidery is the default. Only `GP-01 Circuit Crimson` may test a shallow 2 mm
  foam treatment on the outer leaf border; the internal circuit traces and nodes remain flat.
- Corduroy requires a water-soluble topper and tested underlay so the mark does not sink
  between wales. Nylon must be hooped without stretching or heat distortion. Wool-blend
  blanks require backing that controls puckering without making the crown rigid.
- The final sample must show no puckering, loose tails, distorted leaf outline, closed
  nodes, buried corduroy detail, crooked placement or rear text larger than the envelope.

## Thread palette to quote and swatch

These are digital starting targets, not an instruction to substitute unreviewed thread:

| Name | Digital target | Use |
|---|---|---|
| Circuit lime | `#8EEA36` | circuit leaf/high-energy accents |
| GrowPath blue | `#2587FF` | `AI`, path and prism accents |
| Forest | `#166534` | dark-green brand and tonal work |
| Antique gold | `#D6A83C` | crimson/loden premium treatments |
| Burgundy | `#7A2030` | burgundy concepts and trim coordination |
| Signal red | `#D83A3A` | navy/red and community patch accents |
| Violet | `#7B3FC6` | Royal Current circuit-frond accent |
| Stone | `#D8D0BF` | prism/patch neutral |
| White | `#FFFFFF` | high-contrast wordmarks |
| Black | `#111111` | blackout and keylines |

The owner must approve actual thread cards/swatches beside the physical blank under neutral
light before sample production.

## Machine-file naming

Use `{concept-id}_{placement}_{width-mm}x{height-mm}_v{revision}.{ext}`. Example:
`GP-01_front_58x56_v1.dst`. Never overwrite an approved revision; supersede it in the
machine-file register with the sew-out disposition and reason.

## Approval gate

Each concept advances only when its exact blank/color is in hand, the decorator returns the
machine files above, the sew-out passes the construction checks, unit/sample cost and lead
time are recorded, and the owner approves that photographed sample. Until then every image
remains `CONCEPT REVIEW — NOT FOR SALE`, inventory is zero and checkout is disabled.
