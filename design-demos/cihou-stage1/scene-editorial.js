(function () {
  'use strict';

  const PAPER = '#f6f4ee', BLUE = '#3559c7', DEEP = '#213f89', CORAL = '#d65b3e', GREY = '#929a9e';
  const STRUCTURES = ['loop', 'bridge', 'confluence', 'sparse'];
  const SELECTIONS = ['overview', 'past', 'relation', 'present', 'action', 'future-a', 'future-b'];
  const running = new WeakMap();
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const round = value => Math.round(value * 100) / 100;
  const clamp = value => Math.max(0, Math.min(1, value));
  const lerp = (from, to, progress) => from + (to - from) * progress;

  function modelFor(input, revised) {
    const model = revised && input?.revision ? { ...input, ...input.revision } : { ...(input || {}) };
    model.structure = STRUCTURES.includes(model.structure) ? model.structure : 'sparse';
    return model;
  }

  function selectionFor(options, structure) {
    const selected = SELECTIONS.includes(options.selected) ? options.selected : options.active ? 'action' : 'overview';
    return structure === 'sparse' && selected.startsWith('future-') ? 'overview' : selected;
  }

  function layout(input, options = {}) {
    const structure = modelFor(input, false).structure, mobile = Boolean(options.mobile);
    if (structure === 'sparse') return {
      width: mobile ? 400 : 1000, height: 440,
      anchors: mobile
        ? { past: [85, 175], relation: [315, 175], present: [200, 261], action: [200, 347] }
        : { past: [202, 190], relation: [798, 190], present: [500, 215], action: [500, 331] }
    };
    return {
      width: mobile ? 400 : 1000, height: 440,
      anchors: mobile ? {
        past: [75, 95], relation: { loop: [121, 210], bridge: [121, 210], confluence: [217, 105] }[structure],
        present: [268, 207], action: [120, 294], 'future-a': [82, 389], 'future-b': [318, 389]
      } : {
        past: [132, 108], relation: { loop: [268, 329], bridge: [352, 241], confluence: [326, 133] }[structure],
        present: [548, 220], action: [676, 269], 'future-a': [917, 126], 'future-b': [917, 329]
      }
    };
  }

  // Points are anchor/control coordinates plus the cross-section of the thread
  // bundle. Corresponding points retain their identity in every focus state.
  function geometry(structure, mobile, revised) {
    const g = {
      width: mobile ? 400 : 1000, height: 440, bundles: [],
      present: mobile ? [268, 207] : [548, 220],
      waiting: mobile ? [200, 310] : [753, 220],
      action: mobile ? [
        [268, 207], [263, 251, 5, 2], [151, 250, -3, 5], [120, 294, -2, 3],
        [145, 300, 3, 2], [170, 286, 3, -2], [200, 283]
      ] : [
        [548, 220], [576, 229, -1, 5], [627, 263, -3, 5], [676, 269, 0, 3],
        [697, 270, 0, 3], [696, 239, 0, 3], [708, 220]
      ],
      futures: mobile ? [
        [[200, 334], [171, 345], [112, 360], [82, 389]],
        [[200, 334], [229, 345], [288, 360], [318, 389]]
      ] : [
        [[794, 220], [846, 215], [870, 154], [917, 126]],
        [[794, 220], [846, 225], [870, 301], [917, 329]]
      ]
    };
    const add = (id, role, points, extra = {}) => g.bundles.push({ id, role, points, ...extra });
    if (structure === 'loop') {
      if (revised) {
        add('arrival', 'past', mobile ? [
          [35, 181, 2, -9], [85, 238, -4, 15], [112, 84, 5, -18], [166, 137, 4, -8]
        ] : [
          [65, 282, 3, -13], [154, 375, -6, 22], [221, 104, 7, -22], [337, 174, 5, -11]
        ]);
        add('open-chain', 'relation', mobile ? [
          [166, 137, 4, -8], [210, 177, 8, 9], [219, 209, 0, 7], [242, 209, 0, 3]
        ] : [
          [337, 174, 5, -11], [403, 240, 10, 15], [438, 229, 0, 9], [470, 224, 0, 5]
        ]);
      } else {
        add('arrival', 'past', mobile ? [
          [59, 159, 4, -6], [24, 111, -9, 5], [65, 66, -7, -8], [145, 79, 5, -11]
        ] : [
          [83, 226, 7, -9], [40, 150, -15, 8], [95, 95, -11, -14], [232, 105, 7, -17]
        ]);
        add('return', 'relation', mobile ? [
          [145, 79, 5, -11], [232, 84, 12, -6], [269, 153, 10, 5], [212, 188, 9, 10],
          [162, 225, 8, 11], [76, 226, -7, 12], [47, 183, -8, 7],
          [26, 147, -9, 1], [67, 117, -4, -9], [111, 133, 5, -7],
          [169, 151, 5, -6], [198, 211, 5, 7], [242, 209, 0, 3]
        ] : [
          [232, 105, 7, -17], [400, 117, 19, -8], [448, 240, 16, 7], [357, 297, 13, 16],
          [278, 351, 13, 19], [145, 334, -12, 17], [98, 266, -14, 10],
          [70, 228, -18, 0], [91, 180, -8, -15], [164, 172, 9, -13],
          [290, 159, 9, -10], [380, 243, 11, 12], [470, 224, 0, 5]
        ]);
      }
      add('gather', 'present', mobile ? [[242, 209, 0, 3], [251, 209, 0, 2], [259, 207, 0, 1], [268, 207]] : [[470, 224, 0, 5], [496, 221, 0, 4], [520, 217, 0, 2], [548, 220]]);
    } else if (structure === 'bridge') {
      add('preparation', 'past', mobile ? [
        [34, 164, 0, -9], [45, 125, -4, -13], [60, 95, -3, -7], [75, 95],
        [110, 95, 5, -13], [112, 160, 5, -14], [106, 201, 0, -8]
      ] : [
        [62, 280, 0, -13], [58, 180, -8, -20], [90, 108, -5, -11], [132, 108],
        [218, 90, 8, -21], [265, 205, 5, -20], [350, 205, 0, -11]
      ]);
      add('practice', 'present', mobile ? [
        [149, 214, 0, -8], [188, 258, 0, 12], [234, 231, 0, 8], [268, 207]
      ] : [
        [389, 214, 0, -11], [432, 249, 0, 17], [489, 245, 0, 11], [548, 220]
      ]);
      if (revised) {
        add('revision', 'relation', mobile ? [[106, 201, 0, -8], [120, 205, 0, -7], [134, 207, 0, -7], [149, 214, 0, -8]] : [[350, 205, 0, -11], [362, 210, 0, -10], [378, 207, 0, -10], [389, 214, 0, -11]]);
        g.feedback = mobile ? [[224, 186], [216, 78], [125, 74], [108, 130]] : [[455, 234], [437, 77], [263, 80], [242, 173]];
      } else {
        // The practice is known; the gap is the unreceived feedback, not a
        // claim that the person has never attempted anything.
        g.gap = mobile ? [[106, 201], [149, 214]] : [[350, 205], [389, 214]];
      }
    } else if (structure === 'confluence') {
      add('method', 'past', mobile ? [
        [34, 121, 0, -10], [48, 111, -4, -10], [60, 95, -3, -6], [75, 95],
        [114, 94, 5, -14], [147, 169, 0, 9], [190, 183, 0, 3]
      ] : [
        [65, 145, 0, -14], [88, 131, -6, -14], [108, 108, -4, -9], [132, 108],
        [239, 92, 8, -22], [350, 157, 0, 13], [430, 220, 0, 5]
      ]);
      add('material', 'past', mobile ? [
        [40, 227, 0, -8], [98, 251, 0, 15], [153, 213, 0, 8], [190, 183, 0, 3]
      ] : [
        [85, 330, 0, -12], [230, 382, 0, 21], [350, 274, 0, 13], [430, 220, 0, 5]
      ]);
      add('partner', 'relation', mobile ? (revised ? [
        [222, 81, -8, 0], [218, 99, -6, 0], [213, 112, -5, 0], [208, 122, -4, 0]
      ] : [
        [222, 81, -8, 0], [217, 101, -6, 0], [211, 129, -5, 0], [201, 154, -4, 0]
      ]) : (revised ? [
        [304, 95, -12, 0], [321, 115, -9, 0], [344, 135, -6, 0], [358, 147, -5, 0]
      ] : [
        [304, 95, -12, 0], [335, 124, -9, 0], [365, 160, -6, 0], [388, 181, -5, 0]
      ]), { dashed: true, external: true });
      add('gather', 'present', mobile ? [[190, 183, 0, 3], [219, 199, 0, 7], [244, 210, 0, 5], [268, 207]] : [[430, 220, 0, 5], [466, 233, 0, 9], [507, 225, 0, 6], [548, 220]]);
    } else {
      add('known-left', 'past', mobile ? [[27, 198, 0, -8], [61, 140, -7, -13], [108, 154, 0, 11], [139, 171, 0, 7]] : [[90, 271, 0, -13], [160, 156, -9, -21], [243, 205, 0, 16], [319, 226, 0, 10]]);
      add('known-right', 'relation', mobile ? [[261, 171, 0, 7], [299, 151, 0, -12], [337, 167, 0, 12], [373, 198, 0, 8]] : [[681, 226, 0, 10], [758, 185, 0, -18], [840, 210, 0, 19], [910, 271, 0, 13]]);
      g.action = null; g.futures = [];
    }
    return g;
  }

  // Only local control points and thread spread change. The interaction never
  // changes report revision, moves the camera, or closes an unknown connection.
  function focusGeometry(g, structure, selected, mobile) {
    const scale = mobile ? .62 : 1;
    for (const bundle of g.bundles) {
      const last = bundle.points.length - 1;
      bundle.points = bundle.points.map((point, index) => {
        let [x, y, dx = 0, dy = 0] = point;
        const control = index % 3 !== 0;
        if (selected === 'past' && bundle.role === 'past') {
          dx *= 1.3; dy *= 1.45;
          if (control) y += (bundle.id === 'material' ? 19 : -15) * scale;
        }
        if (selected === 'relation' && bundle.role === 'relation') {
          dx *= 1.35; dy *= 1.35;
          if (control) {
            if (structure === 'loop') { x += (index < 5 ? 12 : -10) * scale; y += (index < 5 ? -13 : 17) * scale; }
            else if (structure === 'confluence') { x += 12 * scale; y -= 8 * scale; }
            else y -= 12 * scale;
          }
        }
        if (selected === 'present') {
          dx *= .65; dy *= .65;
          if (control && bundle.role === 'present') { y = lerp(y, g.present[1], .45); }
        }
        if (selected === 'action' && bundle.role === 'present' && control) y -= 8 * scale;
        if (selected === 'action' && structure === 'sparse' && control) {
          x += (bundle.id === 'known-left' ? -19 : 19) * scale;
          dy *= 1.25;
        }
        if (selected === 'relation' && structure === 'bridge' && g.gap) {
          if (bundle.id === 'preparation' && index === last) { x -= 7 * scale; y -= 5 * scale; }
          if (bundle.id === 'practice' && index === 0) { x += 7 * scale; y += 5 * scale; }
        }
        return [x, y, dx, dy];
      });
    }
    if (selected === 'action' && g.action) g.action = g.action.map((point, index) => {
      if (index % 3 === 0) return point;
      const [x, y, dx = 0, dy = 0] = point;
      if (mobile) {
        if (index < 3) return [x - 63, y + (index === 1 ? 9 : 15), dx * 1.6, dy * 1.7];
        return [x - 2, y + (index === 4 ? 2 : 0), dx * 1.6, dy * 1.4];
      }
      return [x + 14, y + 29, dx * 1.5, dy * 1.7];
    });
    return g;
  }

  function coordinates(points, thread = 0) {
    return points.flatMap(([x, y, dx = 0, dy = 0]) => [x + dx * thread, y + dy * thread]);
  }

  function path(values) {
    let result = `M ${round(values[0])} ${round(values[1])}`;
    for (let index = 2; index < values.length; index += 6) result += ` C ${values.slice(index, index + 6).map(round).join(' ')}`;
    return result;
  }

  function emphasis(role, selected) {
    if (selected === 'overview') return 1;
    if (role === selected) return 1.3;
    if (selected === 'present' && role === 'past') return .82;
    if (selected === 'action' && role === 'present') return .9;
    return .53;
  }

  function makeScene(input, options = {}) {
    const revised = Boolean(options.revised), mobile = Boolean(options.mobile);
    const model = modelFor(input, revised), structure = model.structure;
    const selected = selectionFor(options, structure);
    const g = focusGeometry(geometry(structure, mobile, revised), structure, selected, mobile);
    const paths = [], traces = [], circles = [];
    const add = (key, role, points, style = {}) => {
      const descriptor = { key, role, coords: coordinates(points), stroke: BLUE, width: mobile ? 1 : .8, opacity: 1, dash: '', ...style };
      paths.push(descriptor); return descriptor;
    };
    const trace = (role, points, dashed = false) => {
      if (traces.some(item => item.role === role)) return;
      traces.push({ key: `trace-${role}`, role, coords: coordinates(points), stroke: role === 'action' ? CORAL : BLUE, width: mobile ? 2 : 1.7, opacity: 0, dash: '0.1 1', external: dashed });
    };
    for (const bundle of g.bundles) {
      const total = mobile ? 23 : 29;
      for (let index = 0; index < total; index++) {
        const raw = index / (total - 1) * 2 - 1;
        // Denser fine lines alternate with a few dark engraved contours.
        const u = Math.sign(raw) * Math.pow(Math.abs(raw), 1.32);
        const contour = index % 7 === 2, center = 1 - Math.abs(u);
        const roleForEmphasis = g.gap && selected === 'relation' ? 'relation' : bundle.role;
        const opacity = (.14 + center * .37 + (contour ? .1 : 0)) * emphasis(roleForEmphasis, selected);
        paths.push({ key: `${bundle.id}-${index}`, group: bundle.id, role: bundle.role, coords: coordinates(bundle.points, u),
          stroke: contour ? DEEP : BLUE, width: contour ? (mobile ? 1.05 : .95) : (mobile ? .65 : .52),
          opacity: Math.min(.88, opacity), dash: bundle.dashed ? (mobile ? '3 5' : '4 7') : '', external: Boolean(bundle.external) });
      }
      trace(bundle.role, bundle.points, bundle.dashed);
    }
    if (g.gap) {
      trace('relation', g.bundles[0].points);
      [g.bundles[0].points.at(-1), g.bundles[1].points[0]].forEach(([x, y], index) => {
        circles.push({ key: `feedback-gap-${index}`, x, y, r: selected === 'relation' ? 4.4 : 2.6, stroke: BLUE, width: 1.1, opacity: selected === 'relation' ? 1 : .65 });
      });
    }
    if (g.feedback) { add('feedback', 'relation', g.feedback, { stroke: GREY, width: 1.3, opacity: .7, dash: '3 7', external: true }); }
    if (structure !== 'sparse') {
      for (const [index, u] of [-1, 0, 1].entries()) paths.push({ key: `action-${index}`, role: 'action', coords: coordinates(g.action, u), stroke: CORAL,
        width: mobile ? 1.1 : 1, opacity: selected === 'action' ? .86 : .3, dash: '' });
      trace('action', g.action);
      g.futures.forEach((points, index) => {
        const role = index ? 'future-b' : 'future-a', focused = selected === role;
        add(role, role, points, { stroke: focused ? BLUE : GREY, width: focused ? 1.9 : 1.3, opacity: focused ? .9 : .64, dash: '3 7', external: true });
        trace(role, points, true);
        const [x, y] = points[points.length - 1];
        circles.push({ key: `${role}-end`, x, y, r: focused ? 5.5 : 4, stroke: focused ? BLUE : GREY, width: 1.1, opacity: .9 });
      });
      circles.push({ key: 'present', x: g.present[0], y: g.present[1], r: selected === 'present' ? 8 : 5.5, stroke: DEEP, width: selected === 'present' ? 1.8 : 1.4, opacity: 1 });
    }
    const graph = model.graphLabels || [], nodes = model.nodes || [];
    const past = nodes.slice(0, 2).map(node => node.label || '已有叙述').join('、');
    const branches = Array.isArray(model.branches) ? model.branches : [];
    const revisionDescription = revised ? {
      loop: '模拟回访后的回连已移除，改为开放链。',
      bridge: '已有实践和修改被保留，具体反馈仍待核对。',
      confluence: '伙伴尚不能共同投入，对应输入在汇合前中断。', sparse: '没有新增可确认的关联。'
    }[structure] : '';
    const description = structure === 'sparse'
      ? `${past}是两项已有叙述。两者没有因果连线，不生成未来分支。${model.action?.short || '补充观察'}只是了解入口，不代表已经行动。${revisionDescription}`
      : `来处：${past}。此刻：${nodes[nodes.length - 1]?.label || graph[graph.length - 1] || '当前问题'}。线束是可修正的关系理解，不是已证实的因果。${revisionDescription}${structure === 'confluence' ? '伙伴输入为虚线并在汇合前留有断口，合作尚未确认。' : ''}可以考虑的行动：${model.action?.short || ''}。动作只介入新的条件，待回应断口始终保留。${branches.map(branch => branch.label).join('；')}是尚未发生的条件情景，线条不表示概率、优劣或完成结果。${selected.startsWith('future-') ? '当前高亮只用于阅读对应条件。' : ''}`;
    return { g, model, structure, mobile, revised, selected, paths, traces, circles, description };
  }

  function safePrefix(value) {
    const clean = String(value || 'cihou-editorial').replace(/[^a-zA-Z0-9_-]/g, '-');
    return /^[a-zA-Z_]/.test(clean) ? clean : `ce-${clean}`;
  }

  function pathMarkup(item, trace = false) {
    return `<path data-morph-key="${item.key}" data-morph-role="${item.role}"${item.group ? ` data-thread-group="${item.group}"` : ''}${item.external ? ' data-external-condition="true"' : ''}${trace ? ` data-trace-role="${item.role}" pathLength="1" stroke-dashoffset="0.12"` : ''}${item.key === 'trace-action' ? ' data-action-trace=""' : ''} d="${path(item.coords)}" fill="none" stroke="${item.stroke}" stroke-width="${item.width}" opacity="${round(item.opacity)}"${item.dash ? ` stroke-dasharray="${item.dash}"` : ''} stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  function serialize(scene, idPrefix, withText, includeTraces) {
    const { g, structure, selected, revised, mobile } = scene, id = safePrefix(idPrefix);
    let drawing = scene.paths.map(item => pathMarkup(item)).join('');
    if (includeTraces) drawing += `<g aria-hidden="true" data-intervention="">${scene.traces.map(item => pathMarkup(item, true)).join('')}</g>`;
    drawing += scene.circles.map(circle => `<circle data-circle-key="${circle.key}" cx="${circle.x}" cy="${circle.y}" r="${circle.r}" fill="${PAPER}" stroke="${circle.stroke}" stroke-width="${circle.width}" opacity="${circle.opacity}"/>`).join('');
    if (withText && structure !== 'sparse') drawing += `<text x="${g.waiting[0]}" y="${g.waiting[1]}" dominant-baseline="middle" text-anchor="middle" font-size="${mobile ? 22 : 20}" fill="#737c80">待回应</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" id="${id}-svg" viewBox="0 0 ${g.width} ${g.height}" role="img" aria-labelledby="${id}-title ${id}-description" data-structure="${structure}" data-revised="${revised}" data-selected="${selected}" data-active="${selected === 'action'}" style="display:block;width:100%;height:auto;overflow:visible;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif"><title id="${id}-title">${withText ? '此后 · 来处、此刻与条件未来' : '此后 · 开放的线索'}</title><desc id="${id}-description">${esc(withText ? scene.description : '无个人文字的线束作品。开放处保留未知；线条没有概率或结果保证的含义。')}</desc>${drawing}</svg>`;
  }

  function render(model, options = {}) {
    return serialize(makeScene(model, options), options.idPrefix || 'cihou-editorial', true, true);
  }

  function art(structure, options = {}) {
    return serialize(makeScene({ structure }, { mobile: false, revised: Boolean(options.revised), selected: 'overview' }), options.idPrefix || 'cihou-art', false, false);
  }

  function hex(color) {
    const match = /^#([0-9a-f]{6})$/i.exec(color || '');
    return match ? [0, 2, 4].map(index => parseInt(match[1].slice(index, index + 2), 16)) : null;
  }

  function mixedColor(from, to, progress) {
    const a = hex(from), b = hex(to);
    if (!a || !b) return to;
    return '#' + a.map((value, index) => Math.round(lerp(value, b[index], progress)).toString(16).padStart(2, '0')).join('');
  }

  function pathNumbers(value) {
    return (String(value || '').match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
  }

  // A cancellable, finite transition over existing nodes. No detached SVG swap,
  // accumulated loops, layout reads, timeline dependencies, or backend state.
  function transition(svg, input, options = {}) {
    if (!svg || typeof svg.querySelectorAll !== 'function') return { cancel() {}, finish() {} };
    const previous = running.get(svg);
    if (previous) previous.cancel();
    const revised = svg.getAttribute('data-revised') === 'true';
    const scene = makeScene(input, { ...options, revised });
    const elements = new Map(Array.from(svg.querySelectorAll('[data-morph-key]'), element => [element.getAttribute('data-morph-key'), element]));
    const targets = [...scene.paths, ...scene.traces];
    const entries = targets.flatMap(target => {
      const element = elements.get(target.key);
      if (!element) return [];
      const coords = pathNumbers(element.getAttribute('d'));
      return [{ element, target, from: {
        coords: coords.length === target.coords.length ? coords : target.coords,
        stroke: element.getAttribute('stroke'), width: Number(element.getAttribute('stroke-width')) || target.width,
        opacity: Number(element.getAttribute('opacity'))
      } }];
    });
    const circleElements = new Map(Array.from(svg.querySelectorAll('[data-circle-key]'), element => [element.getAttribute('data-circle-key'), element]));
    const circleEntries = scene.circles.flatMap(target => {
      const element = circleElements.get(target.key);
      if (!element) return [];
      return [{ element, target, from: { x: Number(element.getAttribute('cx')), y: Number(element.getAttribute('cy')), r: Number(element.getAttribute('r')), width: Number(element.getAttribute('stroke-width')), opacity: Number(element.getAttribute('opacity')), stroke: element.getAttribute('stroke') } }];
    });
    const document = svg.ownerDocument, view = document?.defaultView || window;
    let frameId = null, started = null, stopped = false;
    const duration = 950;
    svg.setAttribute('data-selected', scene.selected);
    svg.setAttribute('data-active', String(scene.selected === 'action'));
    const description = svg.querySelector('desc');
    if (description) description.textContent = scene.description;

    function draw(progress) {
      for (const { element, target, from } of entries) {
        element.setAttribute('d', path(target.coords.map((value, index) => lerp(from.coords[index], value, progress))));
        element.setAttribute('stroke', mixedColor(from.stroke, target.stroke, progress));
        element.setAttribute('stroke-width', String(round(lerp(from.width, target.width, progress))));
        element.setAttribute('opacity', String(round(lerp(from.opacity, target.opacity, progress))));
        if (target.dash) element.setAttribute('stroke-dasharray', target.dash);
        else element.removeAttribute('stroke-dasharray');
      }
      for (const { element, target, from } of circleEntries) {
        for (const [attribute, key] of [['cx', 'x'], ['cy', 'y'], ['r', 'r'], ['stroke-width', 'width']]) element.setAttribute(attribute, String(round(lerp(from[key], target[key], progress))));
        element.setAttribute('stroke', mixedColor(from.stroke, target.stroke, progress));
        element.setAttribute('opacity', String(round(lerp(from.opacity, target.opacity, progress))));
      }
    }

    function clearTrace() {
      for (const element of svg.querySelectorAll('[data-trace-role]')) { element.setAttribute('opacity', '0'); element.setAttribute('stroke-dashoffset', '0.12'); }
    }

    function dispose() {
      if (frameId !== null && view.cancelAnimationFrame) view.cancelAnimationFrame(frameId);
      frameId = null;
      if (document) document.removeEventListener('visibilitychange', visibilityChanged);
      if (running.get(svg) === controller) running.delete(svg);
    }

    function cancel() {
      if (stopped) return;
      stopped = true; dispose(); clearTrace();
    }

    function finish() {
      if (stopped) return;
      draw(1); clearTrace(); stopped = true; dispose();
    }

    function visibilityChanged() { if (document.hidden) finish(); }

    function tick(now) {
      if (stopped) return;
      if (started === null) started = now;
      const progress = clamp((now - started) / duration);
      const eased = progress < .5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      draw(eased);
      const flow = clamp((progress - .12) / .82);
      const flowing = scene.selected === 'overview' ? null : elements.get(`trace-${scene.selected}`);
      // No travelling line is allowed to close the partner-input gap, bridge
      // gap, or response gap. Each trace uses only its own existing segment.
      if (flowing && flow > 0 && flow < 1) {
        flowing.setAttribute('opacity', String(round(Math.sin(flow * Math.PI) * .78)));
        flowing.setAttribute('stroke-dashoffset', String(round(.12 - flow * 1.12)));
      }
      if (progress >= 1) finish();
      else frameId = view.requestAnimationFrame(tick);
    }

    const controller = { cancel, finish };
    running.set(svg, controller);
    if (options.reduced || document?.hidden || typeof view.requestAnimationFrame !== 'function') finish();
    else { if (document) document.addEventListener('visibilitychange', visibilityChanged); frameId = view.requestAnimationFrame(tick); }
    return controller;
  }

  window.CihouEditorialScene = Object.freeze({ render, art, layout, transition });
}());
