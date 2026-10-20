(function () {
  'use strict';
  function showFallback() {
    const loader = document.getElementById('story-loader');
    const error = document.getElementById('story-error');
    if (loader) loader.hidden = true;
    if (error) error.hidden = false;
  }
  window.addEventListener('error', showFallback);
  window.addEventListener('unhandledrejection', showFallback);
  const packed = JSON.parse(document.getElementById('wayfinder-assets').textContent);
  const urls = {};
  // Blob URLs allow fetch, audio, GLTF and MP4 byte ranges from a single offline file.
  for (const [path, [type, encoded]] of Object.entries(packed)) {
    const raw = atob(encoded), data = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i);
    // The published AssetManager selects loaders from the URL suffix.
    // A fragment preserves that suffix while fetching the same in-memory Blob.
    urls[path] = URL.createObjectURL(new Blob([data], {type})) + '#' + path.slice(1);
  }
  document.getElementById('wayfinder-assets').remove();
  window.CIHOU_STORY_DATA = JSON.parse(document.getElementById('report-data').textContent);
  window.WAYFINDER_TEMPLATE = {
    language: 'en', header: false, muted: true, haikusPerBiome: 2,
    engine: {deterministic: true, nolanding: true, nointro: true, nointroseq: true, nocard: true},
    copy: {tutorialTapHold: '', tutorialFindTokens: '', tutorialFindTree: '', tutorialReturnToTree: ''},
  };
  window[Symbol.for('wayfinder.config')] = {lang: 'en', nfbHeader: false, autoInit: false};
  window.WayfinderTemplate = {
    config: window.WAYFINDER_TEMPLATE,
    asset(path) {
      if (!urls[path]) throw new Error('Missing bundled Wayfinder asset: ' + path);
      return urls[path];
    },
    async connect() {
      const engine = window[Symbol.for('wayfinder.config')];
      const audio = window.parcelRequire('G9ej').audioState;
      audio.update(value => ({...value, muted: true}));
      this.setMuted = muted => audio.update(value => ({...value, muted: !!muted}));
      const nfb = window.parcelRequire('XMOu');
      ['sendAnalytics', 'sendTrackingPixel', 'startButtonTracking', 'revealHeader', 'hideHeader']
        .forEach(key => { nfb[key] = () => {}; });
      window.revealHeader = () => {};
      await engine.init();
      Object.assign(this, {world: engine.world, tags: engine.Tags, engine});
      document.dispatchEvent(new CustomEvent('wayfinder-ready', {detail: this}));
    },
  };
})();
