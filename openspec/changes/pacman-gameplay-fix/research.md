schema: gentle-ai.sdd-research/v1
revision: 2
project: 05-open-pacman
change: pacman-gameplay-fix
requested_change_name: "tiene muchos errres el juego el pacma no come todo a su paso los fantasmas se pierden fueran de los carriles por donde tienen que ir pacma y los fantasmas el fantaspa pasa al lado de pacma y no lo mata revisa toda la logica del juego que funcione a la perfeccion"
status: done
outcome: done

questions:
  - "What externally supported guidance applies to reliable dot collection during continuous grid movement?"
  - "What externally supported guidance applies to collision geometry and collision sampling between Pac-Man and ghosts?"
  - "What externally supported guidance applies to constraining ghost movement to valid lanes while accounting for door and tunnel rules?"

admission:
  capability_envelope: gentle-ai.sdd-research-capability/v1
  requested_source_classes:
    - open-web
  selected_source_class: open-web
  selection_token: open-web
  exact_declared_grants:
    open-web:
      - webfetch
    documentation: []
  result: admitted
  verified_at: "2026-09-08"
  evidence_access: "Only webfetch was used for external evidence."

sources:
  - id: OW-001
    class: open-web
    title: "Window: requestAnimationFrame() method"
    publisher: "MDN Web Docs / Mozilla"
    URL: "https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame"
    accessed_at: "2026-09-08"
    excerpt: |
      The callback frequency generally matches the display refresh rate. MDN warns that animation code should use the callback timestamp or another current-time method to calculate frame progress; otherwise animation runs faster on high-refresh-rate screens.

  - id: OW-002
    class: open-web
    title: "2D collision detection"
    publisher: "MDN Web Docs / Mozilla"
    URL: "https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection"
    accessed_at: "2026-09-08"
    excerpt: |
      2D collision algorithms depend on the shapes involved and commonly use a generic hitbox. For circles, collision is determined from the distance between center points being less than the sum of the radii; axis-aligned boxes use overlap tests on their four sides.

  - id: OW-003
    class: open-web
    title: "Tiles and tilemaps overview"
    publisher: "MDN Web Docs / Mozilla"
    URL: "https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps"
    accessed_at: "2026-09-08"
    excerpt: |
      Tilemaps can be mapped to a logical grid used for game logic such as collision handling and path-finding. The overview distinguishes the visual grid from a logic grid, including collision and path-finding grids; it also identifies Pacman as a common static tilemap example.

  - id: OW-004
    class: open-web
    title: "The Pac-Man Dossier"
    publisher: "Jamey Pittman"
    URL: "https://pacman.holenet.info/"
    accessed_at: "2026-09-08"
    excerpt: |
      Version 1.0.27 (August 11, 2015). The dossier states that its technical information was extracted from or verified against disassembly of the original Pac-Man ROMs and gameplay testing. It describes dots as being at tile centers, actor occupancy as determined by the actor's center point despite pixel-level movement, and the original same-tile collision test's pass-through case when Pac-Man and a ghost swap tiles between frames. It also describes legal-space tiles, intersection decisions, ghosts not voluntarily reversing, the ghost-house door used for entering and exiting, and special side-tunnel behavior.

validated_claims:
  - id: claim-001
    question: 1
    statement: "Frame-driven movement should derive progress from elapsed time rather than assuming every animation callback represents the same amount of time."
    source_ids: [OW-001]
    source_urls:
      - "https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame"
    confidence: high
    scope: "Animation timing guidance; it does not prescribe Pac-Man's game-speed values."

  - id: claim-002
    question: 1
    statement: "A tile-based game can keep collectible and traversal semantics in a logical grid, separate from rendering, and use the grid for collision and path-finding decisions."
    source_ids: [OW-003]
    source_urls:
      - "https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps"
    confidence: high
    scope: "General tilemap architecture; the source does not define this project's tile values."

  - id: claim-003
    question: 1
    statement: "For Pac-Man-like continuous movement, dot collection must account for the actor's center crossing tile centers or tile boundaries instead of depending only on an exact floating-point alignment event."
    source_ids: [OW-003, OW-004]
    source_urls:
      - "https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps"
      - "https://pacman.holenet.info/"
    confidence: medium
    scope: "This is an implementation inference from the logical-grid and tile-center descriptions, not a verbatim algorithm from either source."

  - id: claim-004
    question: 2
    statement: "Collision geometry should use an explicit hitbox model appropriate to the rendered shapes; circle-circle collision compares center distance with the sum of radii, while axis-aligned rectangles use side-overlap tests."
    source_ids: [OW-002]
    source_urls:
      - "https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection"
    confidence: high
    scope: "Generic 2D collision guidance; the final margin remains a product and rendering decision."

  - id: claim-005
    question: 2
    statement: "Sampling only current tile occupancy can miss a collision when two actors exchange tiles between frames; a robust gameplay fix must account for motion between samples or use a sufficiently conservative hitbox check."
    source_ids: [OW-002, OW-004]
    source_urls:
      - "https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection"
      - "https://pacman.holenet.info/"
    confidence: medium
    scope: "The pass-through observation is historical Pac-Man evidence; the recommendation to handle the between-sample interval is an engineering inference."

  - id: claim-006
    question: 3
    statement: "Ghost movement in the original Pac-Man model is constrained by legal maze tiles, makes decisions at intersections, avoids voluntary reversals, and treats the ghost-house door and side tunnel as explicit special rules."
    source_ids: [OW-003, OW-004]
    source_urls:
      - "https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps"
      - "https://pacman.holenet.info/"
    confidence: high
    scope: "Guidance for a Pac-Man-style maze; exact lane, door, and tunnel semantics for this MVP remain product decisions."

contradictions:
  - ids: [OW-002, OW-004]
    finding: "The sources describe different collision goals rather than a factual contradiction: MDN presents geometric hitboxes for robust 2D collision, while the historical dossier documents original Pac-Man's same-tile rule and its known pass-through case."
    resolution: "Treat geometric collision and authentic historical behavior as separate choices; do not present the historical bug as the desired MVP behavior."

uncertainty:
  - "OW-004 is a historical reverse-engineering source published in 2015. It is strong evidence for original arcade behavior, but it does not decide the intended behavior of this custom browser MVP."
  - "No admitted open-web source confirms this repository's exact tile encoding, tunnel row, door value, sprite radius, or desired collision margin. Those remain implementation and product decisions for later SDD phases."
  - "The sources support detecting logical tile transitions and using explicit hitboxes, but they do not prescribe one exact swept-collision algorithm or one exact dot-sweep implementation."

freshness:
  status: assessed
  assessed_at: "2026-09-08"
  notes:
    - "OW-001 was marked modified Aug 21, 2026 by MDN."
    - "OW-002 was marked modified May 4, 2026 by MDN."
    - "OW-003 was marked modified Sep 5, 2026 by MDN."
    - "OW-004 identifies itself as version 1.0.27 from Aug 11, 2015; it is retained as historical technical evidence, not as current browser-platform guidance."

product_choices:
  authoritative: false
  status: none
  items: []

recovery:
  required: false
  action: "Resolved after the declared open-web grant admitted webfetch."

proposal_ready: true
