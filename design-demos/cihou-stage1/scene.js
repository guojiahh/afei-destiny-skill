(function () {
  'use strict';

  const PAPER = '#F3F0E7';
  const INK = '#273C35';
  const COPPER = '#B26845';
  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function geometry(structure, mobile, revised) {
    const g = mobile ? {
      width: 420, height: 390, track: 36, channel: 18, depth: 8,
      junction: [303, 163], ends: [[225, 92], [360, 92]],
      branches: [
        'M303 163 C303 139 225 129 225 92',
        'M303 163 C338 147 360 129 360 92'
      ],
      branchLabels: [[225, 36], [360, 36]],
      waitingLabel: [303, 119], actionLabel: [315, 296],
      shadow: [196, 294, 146, 30]
    } : {
      width: 840, height: 500, track: 58, channel: 30, depth: 12,
      junction: [642, 245], ends: [[588, 150], [758, 150]],
      branches: [
        'M642 245 C642 204 588 204 588 150',
        'M642 245 C705 226 758 204 758 150'
      ],
      branchLabels: [[588, 88], [758, 88]],
      waitingLabel: [642, 190], actionLabel: [563, 399],
      shadow: [315, 370, 242, 38]
    };

    if (structure === 'loop') {
      if (mobile) {
        g.main = revised
          ? 'M61 248 C111 275 142 264 172 233 C207 201 242 202 283 222'
          : 'M276 240 C238 290 119 294 70 251 C25 199 102 142 181 142 C251 142 295 185 283 222';
        g.start = revised ? [61, 248] : [276, 240];
        g.end = [283, 222];
        g.points = revised ? [[61, 248], [172, 233], [260, 213]] : [[70, 251], [181, 142], [205, 284]];
        g.labels = revised ? [[63, 191], [170, 290], [276, 172]] : [[66, 198], [181, 98], [186, 335]];
        g.gate = [281, 232];
        g.action = 'M283 222 C322 252 329 213 303 163';
      } else {
        g.main = revised
          ? 'M105 310 C180 346 233 343 290 300 C342 256 399 252 468 292'
          : 'M461 314 C414 382 224 400 133 342 C39 275 151 190 294 192 C425 189 505 243 468 292';
        g.start = revised ? [105, 310] : [461, 314];
        g.end = [468, 292];
        g.points = revised ? [[105, 310], [290, 300], [437, 277]] : [[110, 316], [294, 192], [333, 380]];
        g.labels = revised ? [[104, 246], [290, 372], [447, 218]] : [[83, 246], [294, 133], [333, 445]];
        g.gate = [466, 303];
        g.action = 'M468 292 C548 335 610 312 642 245';
      }
    } else if (structure === 'bridge') {
      if (mobile) {
        g.main = revised
          ? 'M56 250 C34 219 66 174 118 174 C159 174 182 196 182 224 C202 217 222 217 242 224 C242 192 262 174 296 174 C334 174 361 218 341 252'
          : 'M56 250 C34 219 66 174 118 174 C159 174 182 196 182 224';
        g.start = [56, 250];
        g.end = revised ? [341, 252] : [182, 224];
        g.extra = revised ? [] : ['M242 224 C242 192 262 174 296 174 C334 174 361 218 341 252'];
        g.points = revised ? [[56, 250], [212, 224], [224, 161]] : [[56, 250], [182, 224], [341, 252]];
        g.labels = revised ? [[56, 320], [211, 311], [224, 111]] : [[56, 320], [211, 120], [340, 320]];
        g.gate = revised ? [341, 252] : [212, 224];
        g.action = revised
          ? 'M341 252 C378 222 350 184 303 163'
          : 'M182 224 C202 217 222 217 242 224 C242 192 262 174 296 174 C302 174 303 169 303 163';
        g.feedback = revised ? 'M224 161 C194 125 143 138 140 178 C137 198 153 213 169 219' : null;
        if (revised) g.unknown = [224, 161];
        g.gap = revised ? null : [212, 224];
        g.actionLabel = [211, 361];
      } else {
        g.main = revised
          ? 'M104 337 C71 261 140 190 218 190 C279 190 330 242 330 290 C357 281 393 281 420 290 C420 242 452 190 504 190 C566 190 612 261 591 337'
          : 'M104 337 C71 261 140 190 218 190 C279 190 330 242 330 290';
        g.start = [104, 337];
        g.end = revised ? [591, 337] : [330, 290];
        g.extra = revised ? [] : ['M420 290 C420 242 452 190 504 190 C566 190 612 261 591 337'];
        g.points = revised ? [[104, 337], [375, 290], [370, 183]] : [[104, 337], [330, 290], [591, 337]];
        g.labels = revised ? [[108, 410], [375, 407], [370, 126]] : [[108, 410], [375, 139], [601, 409]];
        g.gate = revised ? [591, 337] : [375, 290];
        g.action = revised
          ? 'M591 337 C672 336 695 288 642 245'
          : 'M330 290 C357 281 393 281 420 290 C420 242 452 190 504 190 C572 190 613 210 642 245';
        g.feedback = revised ? 'M370 183 C324 137 246 149 237 201 C235 236 275 264 316 276' : null;
        if (revised) g.unknown = [370, 183];
        g.gap = revised ? null : [375, 290];
        g.actionLabel = [373, 456];
      }
    } else if (structure === 'confluence') {
      if (mobile) {
        g.main = 'M43 201 C99 195 140 215 183 226 C218 241 251 241 283 222';
        g.start = [43, 201]; g.end = [283, 222];
        g.extra = revised ? ['M103 293 C119 290 134 280 144 266'] : ['M103 293 C136 287 161 254 183 226'];
        g.inflow = 'M180 116 C179 164 180 193 183 226';
        if (revised) g.disconnectedEnd = [144, 266];
        g.points = [[43, 201], [103, 293], [180, 116]];
        g.labels = [[52, 157], [106, 340], [180, 73]];
        g.platform = [183, 226, 46, 21]; g.gate = [279, 225];
        g.action = 'M283 222 C322 252 329 213 303 163';
      } else {
        g.main = 'M100 215 C195 217 255 255 355 283 C398 306 438 305 468 292';
        g.start = [100, 215]; g.end = [468, 292];
        g.extra = revised ? ['M150 350 C191 349 222 343 251 334'] : ['M150 350 C228 349 277 328 355 283'];
        g.inflow = 'M278 137 C305 187 335 238 355 283';
        if (revised) g.disconnectedEnd = [251, 334];
        g.points = [[100, 215], [150, 350], [278, 137]];
        g.labels = [[97, 161], [148, 419], [278, 85]];
        g.platform = [355, 283, 70, 30]; g.gate = [466, 292];
        g.action = 'M468 292 C548 335 610 312 642 245';
      }
    } else {
      if (mobile) {
        g.main = 'M47 221 C82 204 109 204 134 212';
        g.start = [47, 221]; g.end = [134, 212];
        g.extra = ['M228 212 C248 207 263 215 279 224'];
        g.points = [[73, 211], [254, 214]];
        g.labels = [[73, 166], [263, 166]];
        g.unknown = [182, 216]; g.gate = [134, 212];
        g.action = 'M134 212 L134.01 212';
        g.actionLabel = [211, 315];
      } else {
        g.main = 'M105 306 C160 286 205 281 257 287';
        g.start = [105, 306]; g.end = [257, 287];
        g.extra = ['M410 287 C442 273 464 275 491 285'];
        g.points = [[153, 292], [460, 280]];
        g.labels = [[152, 230], [460, 221]];
        g.unknown = [333, 286]; g.gate = [257, 287];
        g.action = 'M257 287 L257.01 287';
      }
    }
    return g;
  }

  function render(model, options) {
    model = model || {};
    options = options || {};
    const structure = ['loop', 'bridge', 'confluence', 'sparse'].includes(model.structure) ? model.structure : 'sparse';
    const mobile = Boolean(options.mobile);
    const revised = Boolean(options.revised);
    const phase = ['past', 'now', 'future'].includes(options.phase) ? options.phase : 'now';
    const step = ['idle', 'waiting', 'a', 'b', 'observe'].includes(options.step) ? options.step : 'idle';
    const safePrefix = String(options.idPrefix || 'cihou-scene').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+/, '') || 'cihou-scene';
    const prefix = /^[a-zA-Z_]/.test(safePrefix) ? safePrefix : 'cs-' + safePrefix;
    const id = suffix => prefix + '-' + suffix;
    const g = geometry(structure, mobile, revised);
    const future = phase === 'future';
    const showingBranches = future && structure !== 'sparse' && ['waiting', 'a', 'b'].includes(step);
    const activeAction = showingBranches;
    const data = revised && model.revision ? model.revision : model;
    const labels = Array.isArray(data.graphLabels) ? data.graphLabels : (model.graphLabels || []);
    const allNodes = Array.isArray(data.nodes) && data.nodes.length ? data.nodes : (Array.isArray(model.nodes) ? model.nodes : []);
    const count = structure === 'sparse' ? 2 : 3;
    const defaultNodes = count === 2
      ? [allNodes[0], allNodes[allNodes.length - 1]]
      : [allNodes[0], allNodes[Math.floor((allNodes.length - 1) / 2)], allNodes[allNodes.length - 1]];
    const requestedIds = Array.isArray(data.graphNodeIds) ? data.graphNodeIds : model.graphNodeIds;
    const nodeById = new Map(allNodes.map(node => [String(node.id), node]));
    const selected = Array.isArray(requestedIds)
      ? requestedIds.slice(0, count).map(nodeId => nodeById.get(String(nodeId)))
      : defaultNodes;
    const branches = Array.isArray(data.branches) ? data.branches : (Array.isArray(model.branches) ? model.branches : []);
    const action = (data.action && data.action.short) || (model.action && model.action.short) || '';
    const branchFor = key => branches.find(branch => branch && branch.id === key);
    const widths = { full: g.track, groove: g.channel };
    const structureName = { loop: '反馈环', bridge: '接桥', confluence: '汇流', sparse: '已知条件与信息缺口' }[structure];
    const changeDescription = revised ? {
      loop: '模拟修正后，原来的回环已改为开放的关系链。',
      bridge: '模拟修正后，已有实践接上，新的反馈回路保留一处尚未明确的缺口。',
      confluence: '模拟修正后，一条尚不可用的流入条件已断开。',
      sparse: '这里仍然保留尚未得到回答的信息缺口。'
    }[structure] : '';
    const stageDescription = { past: '来处：查看有来源的经历。', now: '此刻：查看当前的一种理解。', future: '此后：试演行动与外部条件。' }[phase];
    const desc = stageDescription + changeDescription + '图形的高度、距离与深浅不表示分数或概率。可聚焦带标签的节点查看对应来源；移动点只代表阅读线索。';

    const defs = `<defs>
      <linearGradient id="${id('top')}" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="#E9EBDD"/><stop offset=".48" stop-color="#CDD4C3"/><stop offset="1" stop-color="#BDC9B3"/></linearGradient>
      <linearGradient id="${id('edge')}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#B3BFAA"/><stop offset="1" stop-color="#8E9E89"/></linearGradient>
      <linearGradient id="${id('groove')}" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#ACBCA2"/><stop offset=".55" stop-color="#DEE3D0"/><stop offset="1" stop-color="#BCCAB1"/></linearGradient>
      <linearGradient id="${id('copper')}" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#ECC4A0"/><stop offset=".42" stop-color="#C1845B"/><stop offset="1" stop-color="#965235"/></linearGradient>
      <radialGradient id="${id('ball')}" cx=".3" cy=".2" r=".8"><stop stop-color="#FFE8C0"/><stop offset=".28" stop-color="#DDA677"/><stop offset=".68" stop-color="#B26845"/><stop offset="1" stop-color="#7D4530"/></radialGradient>
      <filter id="${id('shadow')}" x="-.4" y="-1" width="1.8" height="3"><feGaussianBlur stdDeviation="${mobile ? 8 : 12}"/></filter>
    </defs>`;
    const styles = `<style>
      #${id('svg')} {isolation:isolate;display:block;width:100%;height:auto;overflow:visible;color:${INK};font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;}
      #${id('svg')} .cs-track{fill:none;stroke-linecap:round;stroke-linejoin:round;}
      #${id('svg')} .cs-label{fill:${INK};font-size:${mobile ? 18 : 22}px;font-weight:450;letter-spacing:.015em;paint-order:stroke;stroke:${PAPER};stroke-width:${mobile ? 5 : 7}px;stroke-linejoin:round;}
      #${id('svg')} .cs-action-label{fill:#965337;font-size:${mobile ? 18 : 20}px;}
      #${id('svg')} .cs-branch-label{font-size:${mobile ? 18 : 22}px;fill:#4E6457;}
      #${id('svg')} .cs-node{outline:none;cursor:pointer;}
      #${id('svg')} .cs-node:hover .cs-label{fill:#9D5739;}
      #${id('svg')} .cs-node .cs-focus{opacity:0;}
      #${id('svg')} .cs-node:focus-visible .cs-focus{opacity:1;}
      #${id('svg')} .cs-guide{fill:none;stroke:#A5B09E;stroke-width:1;}
      #${id('svg')} .cs-ghost{fill:none;stroke:#9FAB97;stroke-width:1.2;stroke-dasharray:3 6;stroke-linecap:round;}
      #${id('svg')} .cs-stage-tag{font-size:${mobile ? 18 : 22}px;fill:${INK};}
      #${id('svg')} .cs-hit{fill:transparent;stroke:transparent;pointer-events:all;}
      @media (forced-colors:active){#${id('svg')} .cs-label{fill:CanvasText;stroke:Canvas;}#${id('svg')} .cs-guide{stroke:CanvasText;}#${id('svg')} .cs-focus{stroke:Highlight;}}
    </style>`;

    function trace(d, name) {
      return `<path data-trace="${name}" d="${d}" fill="none" stroke="transparent" stroke-width="1" pointer-events="none"/>`;
    }
    function ceramic(d, opacity, scale) {
      const width = widths.full * (scale || 1);
      const groove = widths.groove * (scale || 1);
      return `<g opacity="${opacity}">
        <path class="cs-track" d="${d}" transform="translate(0 ${g.depth})" stroke="url(#${id('edge')})" stroke-width="${width}"/>
        <path class="cs-track" d="${d}" stroke="#9FAD96" stroke-width="${width + 1.5}"/>
        <path class="cs-track" d="${d}" stroke="url(#${id('top')})" stroke-width="${width}"/>
        <path class="cs-track" d="${d}" stroke="#9CAA90" stroke-width="${groove + 2}"/>
        <path class="cs-track" d="${d}" transform="translate(0 1.5)" stroke="url(#${id('groove')})" stroke-width="${groove}"/>
        <path class="cs-track" d="${d}" stroke="#F1F0E5" stroke-width="1" opacity=".65"/>
      </g>`;
    }
    function lightRoute(d, key) {
      const branch = branchFor(key);
      const selectedBranch = step === key;
      const alpha = !branch || !showingBranches ? 0 : ((step === 'a' || step === 'b') && !selectedBranch ? .3 : .9);
      return `<g opacity="${alpha}" aria-hidden="true">
        <path class="cs-track" d="${d}" stroke="#D3DBCA" stroke-width="${mobile ? 22 : 31}"/>
        <path class="cs-track" d="${d}" stroke="#93A68B" stroke-width="${mobile ? 13 : 19}" opacity=".55"/>
        <path d="${d}" fill="none" stroke="${selectedBranch ? COPPER : '#758A70'}" stroke-width="1.5" stroke-dasharray="3 7"/>
      </g>${trace(d, key)}`;
    }
    function labelNode(index) {
      const text = labels[index];
      if (!text || !g.points[index] || !g.labels[index]) return '';
      const node = selected[index];
      const [x, y] = g.points[index];
      const [tx, ty] = g.labels[index];
      const lineEnd = ty < y ? ty + 10 : ty - 24;
      const interactive = node && node.id != null;
      const hitWidth = Math.max(mobile ? 108 : 136, Array.from(String(text)).length * (mobile ? 18 : 22) + 24);
      const attrs = interactive
        ? ` class="cs-node" role="button" tabindex="0" data-node="${esc(node.id)}" aria-label="${esc('查看' + text + '的来源：' + (node.label || text))}"`
        : ' aria-hidden="true"';
      return `<g${attrs}>
        <path class="cs-guide" d="M${x} ${y} L${tx} ${lineEnd}"/>
        <circle class="cs-hit" cx="${tx}" cy="${ty - 7}" r="${mobile ? 36 : 34}"/>
        <rect class="cs-hit" x="${tx - hitWidth / 2}" y="${ty - 41}" width="${hitWidth}" height="${mobile ? 72 : 68}" rx="5"/>
        <rect class="cs-focus" x="${tx - (mobile ? 48 : 60)}" y="${ty - 25}" width="${mobile ? 96 : 120}" height="36" rx="5" fill="none" stroke="${COPPER}" stroke-width="2"/>
        <text class="cs-label" x="${tx}" y="${ty}" text-anchor="middle">${esc(text)}</text>
      </g>`;
    }

    function branchLines(value) {
      const label = String(value || '').replace(/^如果[\s，,:：]*/, '');
      const characters = Array.from(label);
      if (characters.length <= 5) return [label];
      let boundaries = [];
      if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
        const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
        let length = 0;
        for (const segment of segmenter.segment(label)) {
          length += Array.from(segment.segment).length;
          boundaries.push(length);
        }
      }
      const lines = [];
      let offset = 0;
      while (offset < characters.length) {
        const remaining = characters.length - offset;
        if (remaining <= 5) {
          lines.push(characters.slice(offset).join(''));
          break;
        }
        const target = offset + Math.ceil(remaining / Math.ceil(remaining / 5));
        const candidates = boundaries.filter(end => end > offset && end <= offset + 5);
        const end = candidates.length
          ? candidates.reduce((best, candidate) => Math.abs(candidate - target) < Math.abs(best - target) ? candidate : best)
          : Math.min(offset + 5, target);
        lines.push(characters.slice(offset, end).join(''));
        offset = end;
      }
      return lines;
    }

    const mainOpacity = showingBranches ? .53 : 1;
    const sh = g.shadow;
    let body = `<ellipse cx="${sh[0]}" cy="${sh[1]}" rx="${sh[2]}" ry="${sh[3]}" fill="#5C7056" opacity=".11" filter="url(#${id('shadow')})" aria-hidden="true"/>`;
    (g.extra || []).forEach(d => { body += ceramic(d, mainOpacity, structure === 'confluence' ? .9 : 1); });
    if (g.inflow) {
      body += ceramic(g.inflow, mainOpacity, .85);
    }
    if (g.disconnectedEnd) body += `<circle cx="${g.disconnectedEnd[0]}" cy="${g.disconnectedEnd[1]}" r="${mobile ? 4 : 5}" fill="${PAPER}" stroke="#7C9074" stroke-width="1.5" aria-hidden="true"/>`;
    if (g.feedback) body += `<g opacity="${mainOpacity}" aria-hidden="true"><path class="cs-track" d="${g.feedback}" stroke="#CDD4C3" stroke-width="${mobile ? 17 : 24}" opacity=".35"/><path class="cs-ghost" d="${g.feedback}"/></g>`;
    body += ceramic(g.main, mainOpacity, 1) + trace(g.main, 'main');
    if (g.platform) {
      const [x, y, rx, ry] = g.platform;
      body += `<g opacity="${mainOpacity}" aria-hidden="true"><ellipse cx="${x}" cy="${y + g.depth}" rx="${rx}" ry="${ry}" fill="url(#${id('edge')})"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${id('top')})" stroke="#E9EBDD" stroke-width="1.5"/><ellipse cx="${x}" cy="${y}" rx="${rx * .65}" ry="${ry * .55}" fill="none" stroke="#AFBCA5" stroke-width="1"/></g>`;
    }
    if (g.unknown) {
      const [x, y] = g.unknown;
      body += `<g aria-label="这里的信息尚未明确"><path class="cs-ghost" d="M${x - (mobile ? 30 : 48)} ${y} H${x - 15} M${x + 15} ${y} H${x + (mobile ? 30 : 48)}"/><text x="${x}" y="${y + 8}" fill="#6B7D65" font-size="${mobile ? 27 : 32}" font-family="Georgia,serif" text-anchor="middle">?</text></g>`;
    }

    // Future connections remain light; both conditional endpoints share one height.
    const actionOpacity = structure === 'sparse' ? 0 : (future ? (step === 'observe' ? .25 : 1) : (phase === 'past' ? .08 : .16));
    body += `<g class="cs-action-route" opacity="${actionOpacity}" aria-hidden="true">
      <path class="cs-track" d="${g.action}" transform="translate(0 ${g.depth * .65})" stroke="#A18165" stroke-width="${mobile ? 20 : 30}"/>
      <path class="cs-track" d="${g.action}" stroke="#E6D7BC" stroke-width="${mobile ? 20 : 30}"/>
      <path class="cs-track" d="${g.action}" stroke="#B89571" stroke-width="${mobile ? 11 : 18}"/>
      <path d="${g.action}" fill="none" stroke="#F3E0C8" stroke-width="1.5" stroke-dasharray="3 6"/>
    </g>${trace(g.action, 'action')}`;
    body += lightRoute(g.branches[0], 'a') + lightRoute(g.branches[1], 'b');

    const angle = structure === 'bridge' ? (activeAction ? 0 : (future ? -22 : -35)) : (activeAction ? -30 : 12);
    const gateOpacity = phase === 'past' ? .28 : (future ? 1 : .65);
    const gateWidth = mobile ? (structure === 'bridge' && !revised ? 62 : 42) : (structure === 'bridge' && !revised ? 88 : 61);
    body += `<g data-gate="" data-angle="${angle}" opacity="${gateOpacity}" aria-hidden="true" transform="translate(${g.gate[0]} ${g.gate[1]}) rotate(${angle})"><rect x="${-gateWidth / 2}" y="-4" width="${gateWidth}" height="${mobile ? 10 : 13}" rx="5" fill="#8D5539"/><rect x="${-gateWidth / 2}" y="-8" width="${gateWidth}" height="${mobile ? 10 : 13}" rx="5" fill="url(#${id('copper')})"/><circle cx="0" cy="-3" r="${mobile ? 3 : 4}" fill="#F0D0AE"/></g>`;

    if (!showingBranches) {
      for (let index = 0; index < count; index += 1) body += labelNode(index);
    }
    if (future && action) {
      const [x, y] = g.actionLabel;
      body += `<text class="cs-label cs-action-label" x="${x}" y="${y}" text-anchor="middle">${esc(action)}</text>`;
    }
    if (showingBranches) {
      const [x, y] = g.junction;
      const [tx, ty] = g.waitingLabel;
      body += `<g aria-hidden="true"><circle cx="${x}" cy="${y}" r="${mobile ? 12 : 16}" fill="${PAPER}" stroke="#9CAA94" stroke-width="1.5"/><path class="cs-guide" d="M${x} ${y - 17} V${ty + 12}"/><text class="cs-label cs-stage-tag" x="${tx}" y="${ty}" text-anchor="middle">${step === 'waiting' ? '等待回应' : '外部条件'}</text></g>`;
      ['a', 'b'].forEach((key, index) => {
        const branch = branchFor(key);
        if (!branch) return;
        const [bx, by] = g.branchLabels[index];
        const lines = branchLines(branch.label);
        body += `<text class="cs-label cs-branch-label" x="${bx}" y="${by}" text-anchor="middle" aria-label="${esc(branch.label || '')}">${lines.map((line, lineIndex) => `<tspan x="${bx}" dy="${lineIndex === 0 ? 0 : (mobile ? 22 : 26)}">${esc(line)}</tspan>`).join('')}</text>`;
      });
    }

    let ball = g.end;
    if (phase === 'past') ball = g.start;
    if (showingBranches && step === 'waiting') ball = g.junction;
    if (showingBranches && (step === 'a' || step === 'b')) ball = g.ends[step === 'a' ? 0 : 1];
    const radius = mobile ? 9 : 13;
    body += `<g data-ball="" transform="translate(${ball[0]} ${ball[1]})" pointer-events="none" aria-hidden="true"><ellipse cy="${radius * .35}" rx="${radius * .95}" ry="${radius * .36}" fill="#765139" opacity=".25"/><circle cy="${-radius * .55}" r="${radius}" fill="url(#${id('ball')})"/><ellipse cx="${-radius * .3}" cy="${-radius * 1.03}" rx="${radius * .23}" ry="${radius * .12}" fill="#FFEBCD" opacity=".72"/></g>`;

    return `<svg id="${id('svg')}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.width} ${g.height}" role="group" aria-labelledby="${id('title')} ${id('desc')}" data-structure="${structure}" data-revised="${revised ? 'true' : 'false'}" data-phase="${phase}" data-step="${step}"><title id="${id('title')}">${esc('此后 · ' + structureName + (revised ? ' · 模拟修正' : ''))}</title><desc id="${id('desc')}">${esc(desc)}</desc>${defs}${styles}${body}</svg>`;
  }

  window.CihouScene = Object.freeze({ render });
}());
