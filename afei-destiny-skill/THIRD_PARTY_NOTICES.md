# Third-party notices

The project's MIT license covers its own code and documentation. It does not
relicense third-party code, artwork, fonts, models, audio, video, or screenshots
containing those materials. The notices below apply to the relevant components.

## lunar_python

The deterministic chart calculator vendors `lunar_python` version 1.4.8.

- Project: <https://github.com/6tail/lunar-python>
- License: MIT
- Bundled license: [LICENSE](scripts/vendor/lunar_python-1.4.8.dist-info/licenses/LICENSE)

## Three.js in the historical immersive renderer

- Project: <https://threejs.org/>
- License: MIT
- Bundled license: [THREE-LICENSE.txt](assets/cihou/quiet/immersive/THREE-LICENSE.txt)
- Scope: `assets/cihou/quiet/immersive/three.min.js` and historical reports
  embedding that copy. This notice is not a license for the Wayfinder bundle.

## Historical GameArt2D character

- Asset: Cute Girl — Free Sprites, by pzUH / GameArt2D
- License recorded at acquisition: CC0-1.0
- Source and attribution record: [CHARACTER-LICENSE.txt](assets/cihou/quiet/CHARACTER-LICENSE.txt)
- Scope: the historical `girl-walk.png` atlas; it does not cover the current
  Wayfinder character or other illustrations.

## Wayfinder

- Work: [Wayfinder](https://wayfinder.nfb.ca/), by Matt DesLauriers and the
  National Film Board of Canada; illustrations by Tiffany Beucher, animation
  and 3D by Guillaume Le Roux. See the original work for full credits.
- Local provenance, hashes, modifications, and asset manifest:
  [PROVENANCE.md](assets/cihou/quiet/wayfinder/PROVENANCE.md).
- Scope: the original client runtime and its fonts, illustrations, models,
  audio and video; historical mirrors and self-contained HTML reports embed
  copies of these materials.
- The maintainer has confirmed lawful acquisition of these materials and
  requested their inclusion in the repository. This project does not assert a
  separate open-source license for the complete Wayfinder client or sublicense
  its third-party materials under MIT. Original rights and applicable terms
  remain with their holders; see the original work and the
  [NFB terms](https://help.nfb.ca/terms/).

## Architectural references

No code or text was copied from the other BaZi repositories reviewed during design research. Their high-level separation of calculation and knowledge layers was considered as an architectural reference only.
