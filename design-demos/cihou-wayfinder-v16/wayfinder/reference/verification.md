# Verification — 2026-10-19

## Provenance and inspection

- Target: https://wayfinder.nfb.ca/
- Downloaded original HTML, published Parcel JavaScript bundle, three CSS files and its publicly available JavaScript source map.
- Source map contains 358 entries with source contents. First-party application entries are included under `recovered-source/`; dependency code remains in the runtime bundle.
- REA parent evidence: `ev_69f05eb77ee05f550f4052a6b4d872e99cb06bbc7d028b51f5aadb9cb0f65d40`.
- REA parsed the published JavaScript with no parse failures, but its semantic analysis exhausted the default worker heap. Its graph is partial and is not evidence of complete behavioral recovery.
- Configuration and initialization changes were subsequently located in the published code and source map. Original render and game systems are reused, not independently reimplemented.

## Checks performed

- Integrity: 444 local asset files compared against download SHA-256 digests, zero mismatches.
- JavaScript syntax: runtime bundle and added template adapter pass `node --check`.
- Python server source compiles successfully.
- Video HTTP range request: `bytes=0-1023` returned HTTP 206, the correct Content-Range and 1024-byte content length.
- Actual browser: intro logo, landing title, forest scene and start button rendered.
- Actual browser: start played the locally served intro movie; skip entered the real-time world.
- Actual browser: holding the mouse moved the character and camera through the scene.
- Actual browser: mute button changed its state to Enable sound.
- Final default screenshot captured separately as wayfinder-preview.png.
- Actual browser: configuration editor changed page title, brand, subtitle copy and start button label; its iframe rendered the custom heading, Chinese subtitle copy and start label.

## Explicit limits

- Top navigation is a new local replacement and has intentional destination changes documented in README.
- Random world layout is not a pixel-identical comparison against an identical original seed and animation time.
- All three biome asset sets were downloaded and checked; full progression through every biome and the ending was not played through.
- No claim of compatibility with every desktop GPU or browser; mobile support was not a target.
- A recovered source map is not the full original project/build toolchain.
