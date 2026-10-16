(function () {
  'use strict';

  // This renderer is deliberately specific to the first, fictional loop case.
  // A plate is a visual metaphor for an arriving task, not a measured unit.
  // The proposed return edge and every future route remain conditional.
  const running = new WeakMap();
  const poses = new WeakMap();
  const SELECTIONS = ['overview', 'past', 'relation', 'present', 'action', 'future-a', 'future-b'];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = value => Math.round(value * 100) / 100;
  const clamp = value => Math.max(0, Math.min(1, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - clamp(t), 3);
  const selectedFor = value => SELECTIONS.includes(value) ? value : 'overview';

  function layout(model, options = {}) {
    return options.mobile ? {
      width: 400, height: 490,
      anchors: { past: [93, 75], relation: [307, 75], present: [248, 243], action: [80, 330], 'future-a': [80, 430], 'future-b': [318, 430] }
    } : {
      width: 1000, height: 370,
      anchors: { past: [160, 84], relation: [520, 84], present: [421, 286], action: [668, 250], 'future-a': [900, 72], 'future-b': [900, 325] }
    };
  }

  function geometry(mobile) {
    const result = mobile ? {
      width: 400, height: 530, cx: 200, cy: 183, rx: 140, ry: 106, bandX: 35, bandY: 29, depth: 17,
      source: [93, 115], pile: [248, 276], gate: [80, 370], waiting: [205, 367],
      futureA: [80, 470], futureB: [318, 470], question: [102, 249],
      route: [[248, 283], [241, 333], [119, 310], [80, 370], [108, 396], [162, 370], [205, 367]],
      futurePaths: [
        [[205, 423], [171, 423], [123, 436], [80, 470]],
        [[205, 423], [245, 422], [283, 444], [318, 470]]
      ],
      gapLabel: [205, 410], card: 58, pileWidth: 76, pileStep: 7
    } : {
      width: 1000, height: 500, cx: 340, cy: 236, rx: 235, ry: 128, bandX: 55, bandY: 32, depth: 24,
      source: [160, 154], pile: [421, 348], gate: [668, 320], waiting: [759, 292],
      futureA: [900, 142], futureB: [900, 395], question: [206, 323],
      route: [[421, 356], [504, 396], [588, 371], [668, 320], [695, 306], [725, 292], [759, 292]],
      futurePaths: [
        [[833, 292], [856, 271], [854, 180], [900, 142]],
        [[833, 292], [856, 310], [854, 367], [900, 395]]
      ],
      gapLabel: [803, 264], card: 82, pileWidth: 104, pileStep: 10
    };
    result.mobile = mobile;
    return result;
  }

  function ellipsePoint(g, degrees, inset = 0) {
    const rad = degrees * Math.PI / 180;
    return [g.cx + (g.rx - inset) * Math.cos(rad), g.cy + (g.ry - inset * .55) * Math.sin(rad)];
  }

  function ellipse(cx, cy, rx, ry) {
    return `M${n(cx - rx)},${n(cy)}a${n(rx)},${n(ry)} 0 1 0 ${n(rx * 2)},0a${n(rx)},${n(ry)} 0 1 0 ${n(-rx * 2)},0Z`;
  }

  function arc(g, start, end, inset = 0, offsetY = 0) {
    const points = [];
    for (let i = 0; i <= 52; i++) {
      const point = ellipsePoint(g, mix(start, end, i / 52), inset);
      points.push(`${i ? 'L' : 'M'}${n(point[0])},${n(point[1] + offsetY)}`);
    }
    return points.join('');
  }

  function cubic(points) {
    return `M${points[0].map(n).join(',')}C${points.slice(1, 4).map(p => p.map(n).join(',')).join(' ')}${points.length > 4 ? `C${points.slice(4).map(p => p.map(n).join(',')).join(' ')}` : ''}`;
  }

  function bezier(points, t) {
    const u = 1 - t;
    return [0, 1].map(axis => u * u * u * points[0][axis] + 3 * u * u * t * points[1][axis] + 3 * u * t * t * points[2][axis] + t * t * t * points[3][axis]);
  }

  function routePoint(g, t) {
    return t < .72 ? bezier(g.route.slice(0, 4), t / .72) : bezier([g.route[3], ...g.route.slice(4)], (t - .72) / .28);
  }

  function plate(width, depth, height, fill, edge, options = {}) {
    const x = width / 2, y = depth / 2;
    return `<path d="M${n(-x)},0L0,${n(y)}L${n(x)},0V${n(height)}L0,${n(y + height)}L${n(-x)},${n(height)}Z" fill="${edge}"/>
      <path d="M${n(-x)},0L0,${n(-y)}L${n(x)},0L0,${n(y)}Z" fill="${fill}" stroke="${options.stroke || '#ffffff'}" stroke-opacity="${options.strokeOpacity == null ? '.58' : options.strokeOpacity}" stroke-width=".8"/>
      ${options.lines ? `<path d="M${n(-x * .48)},${n(-y * .04)}l${n(x * .53)},${n(-y * .53)}M${n(-x * .25)},${n(y * .2)}l${n(x * .53)},${n(-y * .53)}" stroke="${options.lineColor || '#6c80b3'}" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>` : ''}`;
  }

  function target(selected) {
    const values = {
      source: .16, sourceLift: 0, stack: 3.3, loop: .35, action: .12, gate: -63,
      waiting: .18, future: .23, aLift: 0, bLift: 0, aLight: .36, bLight: .36,
      ringLight: .18, underGlow: .15, sourceGlow: .08, currentGlow: .18
    };
    if (selected === 'past') Object.assign(values, { source: 1, sourceLift: 17, stack: 1, loop: .2, action: .055, waiting: .1, future: .17, ringLight: .02, sourceGlow: 1, currentGlow: 0 });
    if (selected === 'relation') Object.assign(values, { source: .38, stack: 4.3, loop: 1, action: .06, waiting: .1, future: .17, ringLight: .12, underGlow: .7, sourceGlow: .35, currentGlow: .25 });
    if (selected === 'present') Object.assign(values, { source: .08, stack: 7.8, loop: .6, action: .17, waiting: .18, ringLight: .42, underGlow: 1, currentGlow: 1 });
    if (['action', 'future-a', 'future-b'].includes(selected)) Object.assign(values, { source: .08, stack: 7.8, loop: .24, action: 1, gate: 8, waiting: 1, future: .7, ringLight: .28, underGlow: .5, currentGlow: .45 });
    if (selected === 'future-a') Object.assign(values, { aLift: 20, aLight: 1, bLight: .43 });
    if (selected === 'future-b') Object.assign(values, { bLift: 20, bLight: 1, aLight: .43 });
    return values;
  }

  function render(model, options = {}) {
    const mobile = Boolean(options.mobile), g = geometry(mobile), selected = selectedFor(options.selected);
    const prefix = String(options.idPrefix || 'cihou-kinetic').replace(/[^a-zA-Z0-9_-]/g, '-');
    const id = name => `${prefix}-${name}`;
    const outer = ellipse(g.cx, g.cy, g.rx, g.ry);
    const inner = ellipse(g.cx, g.cy, g.rx - g.bandX, g.ry - g.bandY);
    const side = `${arc(g, 0, 180)}L${n(g.cx - g.rx)},${n(g.cy + g.depth)}${arc(g, 180, 0, 0, g.depth).replace(/^M/, 'L')}Z`;
    const innerGeometry = { ...g, rx: g.rx - g.bandX, ry: g.ry - g.bandY };
    const innerSide = `${arc(innerGeometry, 180, 360)}L${n(g.cx + g.rx - g.bandX)},${n(g.cy + g.depth * .7)}${arc(innerGeometry, 360, 180, 0, g.depth * .7).replace(/^M/, 'L')}Z`;
    const path = cubic(g.route);
    const arrows = [262, 348, 112].map((angle, index) => {
      const p = ellipsePoint(g, angle, g.bandX * .48);
      const r = angle + 90;
      return `<g transform="translate(${n(p[0])} ${n(p[1])}) rotate(${r})" opacity="${index === 2 ? '.57' : '.85'}"><path d="M-6,-5L1,0L-6,5M2,-5L9,0L2,5" fill="none" stroke="#eef3ff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }).join('');
    const initial = target(selected);
    const sourceCards = [0, 1, 2].map(index => {
      const side = index - 1;
      const x = g.source[0] + side * (mobile ? 22 : 32) * initial.source;
      const y = g.source[1] - 9 - index * (mobile ? 6 : 8) - initial.sourceLift - Math.abs(side) * 14 * initial.source;
      return `<g data-kinetic-source="${index}" transform="translate(${n(x)} ${n(y)}) rotate(${n(side * -9 * initial.source)})" opacity="${n(index === 2 ? 1 : mix(.4, 1, initial.source))}" filter="url(#${id('card-shadow')})">${plate(g.card, g.card * .43, mobile ? 5 : 7, index === 2 ? '#fbfcff' : '#e8eefb', '#96a9d2', { lines: true })}</g>`;
    }).join('');
    const stackCards = Array.from({ length: 8 }, (_, index) => `<g data-kinetic-layer="${index}" transform="translate(${g.pile[0]} ${g.pile[1] - index * g.pileStep})" opacity="${n(clamp(initial.stack - index))}" filter="${index === 0 ? `url(#${id('card-shadow')})` : ''}">${plate(g.pileWidth, g.pileWidth * .4, mobile ? 5.5 : 8, index === 7 ? `url(#${id('card-top')})` : index % 2 ? '#d7e0f6' : '#ecf1fc', index === 7 ? '#224a9f' : '#8da3d0', { lines: index === 7, lineColor: '#dce8ff' })}</g>`).join('');
    const future = (name, location) => `<g data-kinetic-future="${name}" opacity="${initial[name === 'a' ? 'aLight' : 'bLight']}">
      <ellipse cx="${location[0]}" cy="${location[1] + 20}" rx="${mobile ? 42 : 56}" ry="${mobile ? 10 : 12}" fill="#536899" opacity=".1"/>
      <g data-kinetic-future-plate="${name}" transform="translate(${location[0]} ${location[1] - initial[name === 'a' ? 'aLift' : 'bLift']})">${plate(mobile ? 78 : 104, mobile ? 33 : 42, mobile ? 8 : 11, `url(#${id('future-top')})`, '#a0acc1', { stroke: '#fff' })}
        <path d="M-11,-3L0,-8L11,-3L0,2Z" fill="#5276bf" opacity=".3"/>
      </g></g>`;
    const token = `<g data-kinetic-token-face>${plate(mobile ? 34 : 44, mobile ? 17 : 21, 4, '#fffbf4', '#b0bee0', { lines: true })}</g>`;
    const markup = `<svg xmlns="http://www.w3.org/2000/svg" class="editorial-scene kinetic-scene" viewBox="0 ${mobile ? 40 : 70} ${g.width} ${mobile ? 490 : 370}" role="img" aria-labelledby="${id('title')} ${id('desc')}" data-kinetic="loop" data-focus="${selected}" data-mobile="${mobile}">
      <title id="${id('title')}">临时补位、持续承接与任务叠加的条件性回环</title>
      <desc id="${id('desc')}">宽环与方向箭头呈现重复承接的解释假设；前方的薄片叠层表示任务累积，不代表具体数量。橙色拨片把下一项任务引到讨论台，既有任务仍然保留。两条未来路径在待回应处断开，都需要现实反馈确认。</desc>
      <defs>
        <linearGradient id="${id('track')}" x1="12%" y1="0%" x2="80%" y2="100%"><stop offset="0" stop-color="#d6e0ff"/><stop offset=".27" stop-color="#98b1e8"/><stop offset=".6" stop-color="#527bc9"/><stop offset="1" stop-color="#315eaf"/></linearGradient>
        <linearGradient id="${id('edge')}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#204984"/><stop offset=".48" stop-color="#456bb0"/><stop offset="1" stop-color="#163b7b"/></linearGradient>
        <linearGradient id="${id('inner-edge')}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#718ec7"/><stop offset="1" stop-color="#2b5096"/></linearGradient>
        <linearGradient id="${id('card-top')}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7397e1"/><stop offset="1" stop-color="#315aaa"/></linearGradient>
        <linearGradient id="${id('future-top')}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8f9fc"/><stop offset="1" stop-color="#d1dbef"/></linearGradient>
        <linearGradient id="${id('copper')}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0b88f"/><stop offset=".42" stop-color="#d9784f"/><stop offset="1" stop-color="#ad4b32"/></linearGradient>
        <radialGradient id="${id('floor')}" cx="50%" cy="50%" r="50%"><stop stop-color="#6581b8" stop-opacity=".16"/><stop offset="1" stop-color="#6581b8" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id('glow')}"><stop stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <filter id="${id('shadow')}" x="-30%" y="-90%" width="160%" height="280%"><feGaussianBlur stdDeviation="${mobile ? 8 : 12}"/></filter>
        <filter id="${id('card-shadow')}" x="-45%" y="-130%" width="190%" height="400%"><feDropShadow dx="0" dy="${mobile ? 5 : 7}" stdDeviation="${mobile ? 3 : 4}" flood-color="#1d3767" flood-opacity=".2"/></filter>
      </defs>
      <ellipse cx="${g.cx + 14}" cy="${g.cy + 82}" rx="${g.rx + 63}" ry="${g.ry + 42}" fill="url(#${id('floor')})"/>
      <ellipse cx="${g.cx + 12}" cy="${g.cy + g.depth + 25}" rx="${g.rx - 9}" ry="${g.ry - 1}" fill="#183e77" opacity=".13" filter="url(#${id('shadow')})"/>
      <ellipse data-kinetic-glow="under" opacity="${initial.underGlow}" cx="${g.cx}" cy="${g.cy + 50}" rx="${g.rx + 30}" ry="${g.ry + 18}" fill="url(#${id('floor')})"/>
      <g data-kinetic-branches="true" opacity="${initial.future}" fill="none" stroke="#7e93b5" stroke-width="${mobile ? 2 : 2.5}" stroke-linecap="round" stroke-dasharray="2 8">
        <path data-kinetic-branch="a" d="${cubic(g.futurePaths[0])}"/>
        <path data-kinetic-branch="b" d="${cubic(g.futurePaths[1])}"/>
      </g>
      ${future('a', g.futureA)}${future('b', g.futureB)}
      <g data-kinetic-route="true" opacity="${initial.action}">
        <path d="${path}" fill="none" stroke="#8b5039" stroke-width="${mobile ? 14 : 19}" stroke-linecap="round" transform="translate(0 ${mobile ? 8 : 12})" opacity=".24"/>
        <path data-kinetic-route-top="true" d="${path}" fill="none" stroke="url(#${id('copper')})" stroke-width="${mobile ? 13 : 18}" stroke-linecap="round"/>
        <path d="${path}" fill="none" stroke="#ffe4cd" stroke-width="1" stroke-linecap="round" opacity=".9"/>
      </g>
      <g data-kinetic-wait="true" opacity="${initial.waiting}" transform="translate(${g.waiting.join(' ')})" filter="url(#${id('card-shadow')})">
        ${plate(mobile ? 76 : 94, mobile ? 33 : 41, 10, '#f3e3d3', '#b58d76', { stroke: '#fff9ef' })}
        <path d="M-12,-4L-2,-9L8,-4L-2,1ZM-2,1L8,-4L18,1L8,6Z" fill="#c27955" opacity=".6"/>
      </g>
      <g data-kinetic-gap="true"><text x="${g.gapLabel[0]}" y="${g.gapLabel[1]}" fill="#765f51" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="${mobile ? 15 : 16}" text-anchor="middle" letter-spacing="1">待回应</text></g>
      <path d="${side}" fill="url(#${id('edge')})"/>
      <path d="${innerSide}" fill="url(#${id('inner-edge')})"/>
      <path d="${outer}${inner}" fill="url(#${id('track')})" fill-rule="evenodd"/>
      <path data-kinetic-ring-light="true" opacity="${initial.ringLight}" d="${outer}${inner}" fill="#274e97" fill-rule="evenodd"/>
      <path d="${outer}" fill="none" stroke="#eaf0ff" stroke-opacity=".82" stroke-width="1.4"/>
      <path d="${inner}" fill="none" stroke="#204680" stroke-opacity=".32" stroke-width="1.1"/>
      <path d="${arc(g, 190, 350, g.bandX * .27)}" fill="none" stroke="#f5f7ff" stroke-opacity=".45" stroke-width="1"/>
      <path d="${arc(g, 350, 537, g.bandX * .7)}" fill="none" stroke="#f0f5ff" stroke-opacity=".24" stroke-width="1"/>
      ${arrows}
      <g data-kinetic-return="true">
        <path data-kinetic-return-track="true" opacity="${Math.max(.4, initial.loop)}" d="${arc(g, 77, 214, g.bandX * .5)}" fill="none" stroke="#e9f0ff" stroke-width="${mobile ? 3 : 3.5}" stroke-dasharray="3 7" stroke-linecap="round"/>
        <rect x="${g.question[0] - (mobile ? 51 : 59)}" y="${g.question[1] - (mobile ? 19 : 22)}" width="${mobile ? 102 : 118}" height="${mobile ? 27 : 32}" rx="${mobile ? 13.5 : 16}" fill="#f6f4ee" stroke="#bac9e0" stroke-width=".8"/>
        <text x="${g.question[0]}" y="${g.question[1]}" fill="#244779" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="${mobile ? 15 : 17}" text-anchor="middle">再次承接？</text>
      </g>
      <ellipse data-kinetic-glow="source" opacity="${initial.sourceGlow}" cx="${g.source[0]}" cy="${g.source[1] - 7}" rx="${mobile ? 55 : 78}" ry="${mobile ? 44 : 54}" fill="url(#${id('glow')})"/>
      <g data-kinetic-sources="true">${sourceCards}</g>
      <g data-kinetic-flow="0" opacity="0" filter="url(#${id('card-shadow')})">${token}</g>
      <g data-kinetic-flow="1" opacity="0" filter="url(#${id('card-shadow')})">${token}</g>
      <g data-kinetic-flow="2" opacity="0" filter="url(#${id('card-shadow')})">${token}</g>
      <ellipse data-kinetic-glow="current" opacity="${initial.currentGlow}" cx="${g.pile[0]}" cy="${g.pile[1] + 6}" rx="${mobile ? 69 : 98}" ry="${mobile ? 32 : 39}" fill="url(#${id('floor')})"/>
      <g data-kinetic-pile="true">${stackCards}</g>
      <g data-kinetic-gate-base="true" transform="translate(${g.gate.join(' ')})">
        <ellipse cy="13" rx="${mobile ? 27 : 35}" ry="${mobile ? 11 : 14}" fill="#614d48" opacity=".13"/>
        <ellipse cy="4" rx="${mobile ? 23 : 29}" ry="${mobile ? 12 : 15}" fill="#985a3f"/>
        <ellipse rx="${mobile ? 23 : 29}" ry="${mobile ? 12 : 15}" fill="url(#${id('copper')})" stroke="#f3c8a7" stroke-width="1"/>
        <g data-kinetic-gate="true" transform="rotate(${initial.gate})">
          <path d="M-5,-7L${mobile ? 47 : 63},-7Q${mobile ? 54 : 70},-7 ${mobile ? 54 : 70},0V5Q${mobile ? 54 : 70},10 ${mobile ? 47 : 63},10H-5Z" fill="#99492f"/>
          <path d="M-5,-11H${mobile ? 47 : 63}Q${mobile ? 54 : 70},-11 ${mobile ? 54 : 70},-4Q${mobile ? 54 : 70},3 ${mobile ? 47 : 63},3H-5Z" fill="url(#${id('copper')})" stroke="#f5c7a2" stroke-width=".8"/>
          <path d="M9,-5H${mobile ? 42 : 56}" stroke="#ffddc2" stroke-width="1.3" stroke-linecap="round" opacity=".9"/>
        </g>
        <ellipse cy="-4" rx="7" ry="4" fill="#f2c4a2"/>
      </g>
      <g data-kinetic-action-token="true" opacity="0" filter="url(#${id('card-shadow')})">${token}</g>
      <g data-kinetic-waiting-card="true" transform="translate(${g.waiting[0]} ${g.waiting[1] - 8})" opacity="${initial.action > .95 ? .95 : 0}">${plate(mobile ? 40 : 51, mobile ? 18 : 23, 4, '#fff8e9', '#c19473', { lines: true, lineColor: '#a96a43' })}</g>
    </svg>`;
    // render() is also legible without motion; transition() keeps this SVG DOM
    // and only updates its presentational attributes.
    return markup;
  }

  function elements(svg) {
    return {
      sources: Array.from(svg.querySelectorAll('[data-kinetic-source]')),
      layers: Array.from(svg.querySelectorAll('[data-kinetic-layer]')),
      flow: Array.from(svg.querySelectorAll('[data-kinetic-flow]')),
      route: svg.querySelector('[data-kinetic-route]'),
      routeTop: svg.querySelector('[data-kinetic-route-top]'),
      gate: svg.querySelector('[data-kinetic-gate]'),
      gateBase: svg.querySelector('[data-kinetic-gate-base]'),
      wait: svg.querySelector('[data-kinetic-wait]'),
      gap: svg.querySelector('[data-kinetic-gap]'),
      branches: svg.querySelector('[data-kinetic-branches]'),
      branchA: svg.querySelector('[data-kinetic-branch="a"]'),
      branchB: svg.querySelector('[data-kinetic-branch="b"]'),
      futureA: svg.querySelector('[data-kinetic-future="a"]'),
      futureB: svg.querySelector('[data-kinetic-future="b"]'),
      plateA: svg.querySelector('[data-kinetic-future-plate="a"]'),
      plateB: svg.querySelector('[data-kinetic-future-plate="b"]'),
      return: svg.querySelector('[data-kinetic-return]'),
      returnTrack: svg.querySelector('[data-kinetic-return-track]'),
      light: svg.querySelector('[data-kinetic-ring-light]'),
      glowUnder: svg.querySelector('[data-kinetic-glow="under"]'),
      glowSource: svg.querySelector('[data-kinetic-glow="source"]'),
      glowCurrent: svg.querySelector('[data-kinetic-glow="current"]'),
      actionToken: svg.querySelector('[data-kinetic-action-token]'),
      waitingCard: svg.querySelector('[data-kinetic-waiting-card]')
    };
  }

  function applyPose(svg, el, g, pose) {
    el.sources.forEach((element, index) => {
      const side = index - 1;
      const spread = pose.source;
      const x = g.source[0] + side * (g.mobile ? 22 : 32) * spread;
      const y = g.source[1] - 9 - index * (g.mobile ? 6 : 8) - pose.sourceLift - Math.abs(side) * 14 * spread;
      element.setAttribute('transform', `translate(${n(x)} ${n(y)}) rotate(${n(side * -9 * spread)})`);
      element.setAttribute('opacity', n(index === 2 ? 1 : mix(.4, 1, spread)));
    });
    el.layers.forEach((element, index) => {
      const amount = clamp(pose.stack - index);
      const offset = index % 2 ? (g.mobile ? 3 : 4) : -2;
      element.setAttribute('transform', `translate(${n(g.pile[0] + offset)} ${n(g.pile[1] - index * g.pileStep + (1 - amount) * 12)})`);
      element.setAttribute('opacity', n(amount));
    });
    el.route.setAttribute('opacity', n(pose.action));
    el.gate.setAttribute('transform', `rotate(${n(pose.gate)})`);
    el.gateBase.setAttribute('opacity', n(mix(.6, 1, pose.action)));
    el.wait.setAttribute('opacity', n(pose.waiting));
    el.gap.setAttribute('opacity', n(Math.max(.4, pose.waiting)));
    el.branches.setAttribute('opacity', n(pose.future));
    el.branchA.setAttribute('stroke', pose.aLight > .9 ? '#395e9f' : '#7e93b5');
    el.branchB.setAttribute('stroke', pose.bLight > .9 ? '#395e9f' : '#7e93b5');
    el.futureA.setAttribute('opacity', n(pose.aLight));
    el.futureB.setAttribute('opacity', n(pose.bLight));
    el.plateA.setAttribute('transform', `translate(${g.futureA[0]} ${n(g.futureA[1] - pose.aLift)})`);
    el.plateB.setAttribute('transform', `translate(${g.futureB[0]} ${n(g.futureB[1] - pose.bLift)})`);
    el.returnTrack.setAttribute('opacity', n(Math.max(.4, pose.loop)));
    el.light.setAttribute('opacity', n(pose.ringLight));
    el.glowUnder.setAttribute('opacity', n(pose.underGlow));
    el.glowSource.setAttribute('opacity', n(pose.sourceGlow));
    el.glowCurrent.setAttribute('opacity', n(pose.currentGlow));
    const waitingCard = pose.action > .95 ? .95 : 0;
    el.waitingCard.setAttribute('transform', `translate(${g.waiting[0]} ${g.waiting[1] - 8})`);
    el.waitingCard.setAttribute('opacity', n(waitingCard));
    poses.set(svg, { ...pose });
  }

  function hideFlow(el) {
    el.flow.forEach(element => element.setAttribute('opacity', '0'));
    el.actionToken.setAttribute('opacity', '0');
  }

  function animateFlow(el, g, selected, progress) {
    hideFlow(el);
    if (selected === 'past' || selected === 'present' || selected === 'relation') {
      const count = selected === 'relation' ? 3 : selected === 'present' ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const start = selected === 'relation' ? .06 + i * .11 : .1 + i * .12;
        const phase = clamp((progress - start) / (selected === 'relation' ? .68 : .58));
        if (progress <= start || phase >= 1) continue;
        // The relation state crosses the conditional return edge before a
        // second arrival; every other state stops at the present-day pile.
        const angle = selected === 'relation' ? 220 + phase * 570 : 220 + phase * 210;
        const point = ellipsePoint(g, angle, g.bandX * .35);
        const element = el.flow[i];
        element.setAttribute('transform', `translate(${n(point[0])} ${n(point[1] - 11)})`);
        element.setAttribute('opacity', n(Math.min(1, phase * 10, (1 - phase) * 12)));
      }
    }
    if (selected === 'action') {
      const phase = clamp((progress - .2) / .65);
      if (progress > .2 && phase < 1) {
        const point = routePoint(g, ease(phase));
        el.actionToken.setAttribute('transform', `translate(${n(point[0])} ${n(point[1] - 11)})`);
        el.actionToken.setAttribute('opacity', n(Math.min(1, phase * 9, (1 - phase) * 12)));
        el.waitingCard.setAttribute('opacity', '0');
      }
    }
  }

  function transition(svg, model, options = {}) {
    if (!svg || !svg.querySelector('[data-kinetic-pile]')) return { cancel() {}, finish() {} };
    const previous = running.get(svg);
    if (previous) previous.cancel();
    const g = geometry(Boolean(options.mobile)), el = elements(svg), selected = selectedFor(options.selected);
    const destination = target(selected);
    const origin = poses.get(svg) || target(selectedFor(svg.getAttribute('data-focus')));
    let frame = null, finished = false, paused = false, start = null, elapsed = 0;
    const duration = selected === 'relation' ? 2900 : selected === 'action' ? 2450 : 2200;
    svg.setAttribute('data-focus', selected);
    svg.setAttribute('data-kinetic-playing', options.reduced ? 'false' : 'true');
    const stop = () => {
      if (frame != null) cancelAnimationFrame(frame);
      frame = null;
      hideFlow(el);
      svg.setAttribute('data-kinetic-playing', 'false');
      if (running.get(svg) === controller) running.delete(svg);
    };
    const controller = {
      cancel() { if (finished) return; finished = true; stop(); },
      finish() { if (finished) return; finished = true; applyPose(svg, el, g, destination); stop(); },
      pause() {
        if (finished || paused) return;
        paused = true;
        if (frame != null) cancelAnimationFrame(frame);
        frame = null;
        start = null;
        svg.setAttribute('data-kinetic-playing', 'false');
      },
      resume() {
        if (finished || !paused) return;
        paused = false;
        svg.setAttribute('data-kinetic-playing', 'true');
        frame = requestAnimationFrame(tick);
      }
    };
    running.set(svg, controller);
    applyPose(svg, el, g, origin);
    if (options.reduced) { controller.finish(); return controller; }
    const tick = now => {
      if (finished || paused) return;
      if (start == null) start = now - elapsed;
      elapsed = now - start;
      const progress = clamp(elapsed / duration);
      const transformProgress = ease(progress / .63);
      const pose = Object.keys(destination).reduce((result, key) => {
        result[key] = mix(origin[key], destination[key], transformProgress);
        return result;
      }, {});
      // New layers appear at successive arrivals, rather than popping in as
      // an unrelated chart. Their number deliberately has no numeric label.
      if ((selected === 'relation' || selected === 'present') && destination.stack > origin.stack) {
        const arrivals = selected === 'relation' ? [.29, .4, .73, .84] : [.56, .68];
        const deposited = arrivals.reduce((total, arrival) => total + ease(clamp((progress - arrival) / .12)), 0) / arrivals.length;
        pose.stack = mix(origin.stack, destination.stack, deposited);
      }
      applyPose(svg, el, g, pose);
      animateFlow(el, g, selected, progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else controller.finish();
    };
    frame = requestAnimationFrame(tick);
    return controller;
  }

  window.CihouKineticScene = Object.freeze({ render, layout, transition });
})();
