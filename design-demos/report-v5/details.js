(function () {
  'use strict';

  let renderCount = 0;
  const statusClasses = { '保留': 'kept', '修正': 'revised', '放下': 'released', '待确认': 'pending' };

  function render(container, profile, onSelectNode) {
    if (!container || typeof container.replaceChildren !== 'function') {
      throw new TypeError('ReportDetails.render needs a DOM container.');
    }
    if (!profile || !profile.detail) {
      container.replaceChildren();
      return;
    }
    const doc = container.ownerDocument;
    const detail = profile.detail;
    const prefix = 'vr-' + String(profile.id || 'case').replace(/[^a-z0-9_-]/gi, '-') + '-' + (++renderCount);
    const nodes = new Map([...(profile.history || []), profile.current, ...(profile.choices || [])].filter(Boolean).map(node => [node.id, node]));
    const el = (tag, className, text) => {
      const element = doc.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined && text !== null) element.textContent = String(text);
      return element;
    };
    const root = el('div', 'vr-details');
    const paragraph = (text, className) => el('p', className || '', text);
    const makeArrow = () => {
      const arrow = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrow.setAttribute('viewBox', '0 0 30 20');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.setAttribute('class', 'vr-flow-arrow');
      const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M2 10H26M20 4L26 10L20 16');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      arrow.append(path);
      return arrow;
    };
    const nodeLink = (nodeId, label) => {
      if (!nodes.has(nodeId) || typeof onSelectNode !== 'function') return el('span', 'vr-node-name', label);
      const button = el('button', 'vr-node-link', label);
      button.type = 'button';
      button.setAttribute('aria-label', '在主图中查看：' + label);
      button.addEventListener('click', () => onSelectNode(nodeId));
      return button;
    };
    const chapter = (key, number, heading, intro) => {
      const section = el('section', 'vr-chapter');
      const id = prefix + '-' + key;
      section.setAttribute('aria-labelledby', id);
      const head = el('header', 'vr-chapter-head');
      const index = el('span', 'vr-chapter-index', number);
      index.setAttribute('aria-hidden', 'true');
      const title = el('h2', 'vr-chapter-title', heading);
      title.id = id;
      head.append(index, title);
      section.append(head);
      if (intro) section.append(paragraph(intro, 'vr-intro'));
      root.append(section);
      return section;
    };
    root.append(paragraph(detail.notice || '以下图形、对话与反馈均为匿名虚构演示，不对应真实咨询。', 'vr-fiction-note'));

    const mechanism = detail.mechanism;
    if (mechanism && mechanism.steps && mechanism.steps.length) {
      const section = chapter('mechanism', '01', mechanism.title, mechanism.intro);
      const figure = el('figure', 'vr-mechanism');
      const flow = el('ol', 'vr-flow');
      flow.dataset.steps = String(mechanism.steps.length);
      mechanism.steps.forEach((step, index) => {
        const item = el('li', 'vr-flow-step');
        const marker = el('span', 'vr-flow-index', String(index + 1).padStart(2, '0'));
        marker.setAttribute('aria-hidden', 'true');
        item.append(marker, el('h3', 'vr-flow-label', step.label), paragraph(step.caption, 'vr-flow-caption'));
        if (index < mechanism.steps.length - 1) item.append(makeArrow());
        flow.append(item);
      });
      figure.append(flow);
      if (mechanism.returnLabel) figure.append(paragraph('循环中的惯性：' + mechanism.returnLabel, 'vr-loop-return'));
      if (mechanism.interrupt) {
        const interrupt = el('div', 'vr-interrupt');
        interrupt.append(el('strong', 'vr-interrupt-label', mechanism.interrupt.label), paragraph(mechanism.interrupt.body));
        figure.append(interrupt);
      }
      if (mechanism.note) figure.append(el('figcaption', 'vr-figure-note', mechanism.note));
      section.append(figure);
    }

    const themes = detail.themes;
    if (themes && themes.items && themes.items.length) {
      const section = chapter('themes', '02', themes.title, themes.intro);
      const picker = el('div', 'vr-theme-picker');
      picker.setAttribute('role', 'group');
      picker.setAttribute('aria-label', '选择一个生活主题');
      const panel = el('section', 'vr-theme-panel');
      panel.id = prefix + '-theme-panel';
      panel.setAttribute('aria-live', 'polite');
      panel.setAttribute('aria-atomic', 'true');
      const buttons = [];
      const makeSignals = theme => {
        const signals = el('ul', 'vr-theme-signals');
        [['资源', theme.resource], ['代价', theme.cost], ['观察', theme.signal]].forEach(([label, text]) => {
          if (!text) return;
          const item = el('li');
          item.append(el('strong', '', label), el('span', '', text));
          signals.append(item);
        });
        return signals;
      };
      const selectTheme = index => {
        const theme = themes.items[index];
        buttons.forEach((button, i) => {
          button.setAttribute('aria-pressed', i === index ? 'true' : 'false');
          button.tabIndex = i === index ? 0 : -1;
        });
        panel.setAttribute('aria-labelledby', buttons[index].id);
        const head = el('div', 'vr-theme-panel-head');
        head.append(el('h3', '', theme.name), el('span', 'vr-theme-status', theme.status));
        panel.replaceChildren(head, paragraph(theme.takeaway, 'vr-theme-takeaway'), makeSignals(theme));
      };
      themes.items.forEach((theme, index) => {
        const button = el('button', 'vr-theme-button', theme.name);
        button.type = 'button';
        button.id = prefix + '-theme-' + index;
        button.setAttribute('aria-controls', panel.id);
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', theme.name + '，' + theme.status);
        button.addEventListener('click', () => selectTheme(index));
        button.addEventListener('keydown', event => {
          let next = index;
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = buttons.length - 1;
          else return;
          event.preventDefault();
          selectTheme(next);
          buttons[next].focus();
        });
        buttons.push(button);
        picker.append(button);
      });
      section.append(picker, panel);
      selectTheme(0);
      // Print retains every theme while the screen shows one readable selection.
      const printRows = el('dl', 'vr-theme-print');
      printRows.setAttribute('aria-hidden', 'true');
      themes.items.forEach(theme => {
        const row = el('div', 'vr-theme-row');
        const term = el('dt', 'vr-theme-name');
        term.append(el('span', '', theme.name), el('span', 'vr-theme-status', theme.status));
        const definition = el('dd', 'vr-theme-content');
        definition.append(paragraph(theme.takeaway, 'vr-theme-takeaway'), makeSignals(theme));
        row.append(term, definition);
        printRows.append(row);
      });
      section.append(printRows);
    }

    const comparison = detail.comparison;
    if (comparison && comparison.rows && comparison.rows.length) {
      const section = chapter('choices', '03', comparison.title, comparison.intro);
      const figure = el('figure', 'vr-comparison');
      const rows = el('dl', 'vr-choice-rows');
      comparison.rows.forEach(choice => {
        const node = nodes.get(choice.nodeId);
        if (!node) return;
        const row = el('div', 'vr-choice-row');
        const term = el('dt', 'vr-choice-name');
        term.append(nodeLink(choice.nodeId, node.label));
        const definition = el('dd', 'vr-choice-content');
        [['收益', choice.benefit], ['成本', choice.cost], ['适用条件', choice.fit]].forEach(([label, text]) => {
          const field = el('div', 'vr-choice-field');
          field.append(el('strong', '', label), paragraph(text));
          definition.append(field);
        });
        row.append(term, definition);
        rows.append(row);
      });
      figure.append(rows);
      if (comparison.note) figure.append(el('figcaption', 'vr-figure-note', comparison.note));
      section.append(figure);
    }

    const actions = detail.actions;
    if (actions && actions.windows && actions.windows.length) {
      const section = chapter('actions', '04', actions.title, actions.intro);
      const timeline = el('ol', 'vr-timeline');
      timeline.dataset.windows = String(actions.windows.length);
      actions.windows.forEach((window, index) => {
        const item = el('li', 'vr-time-stop');
        const dot = el('span', 'vr-time-dot');
        dot.setAttribute('aria-hidden', 'true');
        const heading = el('h3', 'vr-time-label', window.label);
        item.append(dot, heading, paragraph(window.aim, 'vr-time-aim'));
        const steps = el('ul', 'vr-time-steps');
        (window.steps || []).forEach(step => steps.append(el('li', '', step)));
        item.append(steps);
        if (window.observe) {
          const observation = paragraph(null, 'vr-time-observe');
          observation.append(el('strong', '', '回看信号'), el('span', '', window.observe));
          item.append(observation);
        }
        timeline.append(item);
      });
      section.append(timeline);
    }

    const feedback = detail.feedback;
    if (feedback && feedback.items && feedback.items.length) {
      const section = chapter('feedback', '05', feedback.title, feedback.intro);
      const ledger = el('ol', 'vr-feedback-ledger');
      feedback.items.forEach((item, index) => {
        const row = el('li', 'vr-feedback-row');
        row.dataset.status = statusClasses[item.status] || 'pending';
        const head = el('div', 'vr-feedback-head');
        head.append(el('span', 'vr-feedback-number', String(index + 1).padStart(2, '0')), el('span', 'vr-feedback-status', item.status), el('h3', 'vr-feedback-title', item.title));
        const pair = el('dl', 'vr-feedback-pair');
        [['原判断', item.original], ['模拟反馈', item.response]].forEach(([label, text]) => {
          const field = el('div');
          field.append(el('dt', '', label), el('dd', '', text));
          pair.append(field);
        });
        const result = paragraph(null, 'vr-feedback-result');
        result.append(el('strong', '', '处理'), el('span', '', item.result));
        row.append(head, pair, result);
        ledger.append(row);
      });
      section.append(ledger);
      if (feedback.note) section.append(paragraph(feedback.note, 'vr-figure-note'));
    }

    if (detail.closing) {
      const closing = el('section', 'vr-closing');
      const title = el('h2', '', detail.closing.title || '此刻，先靠岸');
      title.id = prefix + '-closing';
      closing.setAttribute('aria-labelledby', title.id);
      closing.append(title);
      const passages = Array.isArray(detail.closing.body) ? detail.closing.body : [detail.closing.body];
      passages.filter(Boolean).forEach(text => closing.append(paragraph(text)));
      root.append(closing);
    }
    if (detail.boundaries && detail.boundaries.length) {
      const boundary = el('aside', 'vr-boundaries');
      const heading = el('h3', '', '仍未确认的边界');
      heading.id = prefix + '-boundaries';
      boundary.setAttribute('aria-labelledby', heading.id);
      const list = el('ul');
      detail.boundaries.forEach(text => list.append(el('li', '', text)));
      boundary.append(heading, list);
      root.append(boundary);
    }
    container.replaceChildren(root);
    return root;
  }

  window.ReportDetails = Object.freeze({ render });
}());
