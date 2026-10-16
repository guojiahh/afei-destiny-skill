/*
 * 此后 · 第一阶段图内交互文案。
 * 仅对应 cases.js 中四个匿名虚构样例的 V1；不是正式报告生成规则。
 * 热点只切换阅读强调，不改变事实、现实行动状态或观察草稿。
 * nodeRefs / edgeRefs 指向已有素材；情景引用 branchId，不补写未来结果。
 */
window.CIHOU_INTERACTIONS = {
  loop: {
    intro: '点图上的圆点，读懂这段经历。',
    overview: {
      kind: 'interpretation',
      title: '从几次帮忙，到持续承接。',
      body: '任务正在叠加。看看它怎样延续，也看看一次沟通能让什么条件变得清楚。'
    },
    hotspots: [
      {
        id: 'past', label: '临时补位', kind: 'fact',
        title: '最初，是几次临时帮忙。',
        body: '你接过分工之外的任务，后来类似的事又持续交来。',
        nodeRefs: ['l-fill', 'l-default'], edgeRefs: []
      },
      {
        id: 'relation', label: '安排沿用？', kind: 'interpretation',
        title: '安排沿用，事情又回到你这里。',
        body: '如果分工持续沿用，下一次仍可能交给你。回边是一种理解，派工原因还需核对。',
        nodeRefs: ['l-fill', 'l-default', 'l-load'],
        edgeRefs: [
          { from: 'l-fill', to: 'l-default' },
          { from: 'l-load', to: 'l-fill' }
        ]
      },
      {
        id: 'present', label: '任务叠加', kind: 'present',
        title: '眼下，新的事挤占了原来的事。',
        body: '几项任务同时交来。具体负荷、派工权限与可用人手，还需要继续核对。',
        nodeRefs: ['l-load'], edgeRefs: []
      },
      {
        id: 'action', label: '先谈取舍', kind: 'action',
        title: '下一份任务，先经过一次讨论。',
        body: '把新旧任务一起摆出来，先确认优先级。旧负担仍在；能否调整，还要等对方回应。',
        nodeRefs: ['l-default', 'l-load'], edgeRefs: []
      },
      {
        id: 'future-a', label: '若愿协商', kind: 'scenario',
        title: '如果愿意调整，再看安排。',
        body: '假设沟通后达成共识，接下来要观察：哪些任务真的延期、交接或重新排序？',
        nodeRefs: [], edgeRefs: [], branchId: 'a'
      },
      {
        id: 'future-b', label: '若未同意', kind: 'scenario',
        title: '如果暂未同意，先看条件。',
        body: '假设沟通后仍未调整，先了解卡在人手、权限还是优先级，再决定等待或寻求支持。',
        nodeRefs: [], edgeRefs: [], branchId: 'b'
      }
    ]
  },

  bridge: {
    intro: '点图上的圆点，读懂这段经历。',
    overview: {
      kind: 'interpretation',
      title: '准备已经在这里。',
      body: '已有课程、笔记和练习。下一处连接，可能是让作品得到可以使用的反馈。'
    },
    hotspots: [
      {
        id: 'past', label: '已有练习', kind: 'fact',
        title: '你已经有过学习与练习。',
        body: '课程、笔记和跟做中的改动，都是已经发生的投入，不能因为仍有疑问就归零。',
        nodeRefs: ['b-course', 'b-notes', 'b-practice'], edgeRefs: []
      },
      {
        id: 'relation', label: '回应笼统', kind: 'interpretation',
        title: '“还不错”，还没指出下一处。',
        body: '反馈可能缺少共同标准；也可能与对方的时间有关，不能直接断言你没有实践。',
        nodeRefs: ['b-comment', 'b-now'],
        edgeRefs: [{ from: 'b-comment', to: 'b-now' }]
      },
      {
        id: 'present', label: '想知差距', kind: 'present',
        title: '现在想知道，离使用还有多远。',
        body: '具体应用场景与已有独立作品还需了解。眼下不必先把问题归为学得不够。',
        nodeRefs: ['b-now'], edgeRefs: []
      },
      {
        id: 'action', label: '带问题请教', kind: 'action',
        title: '带一件作品，问一个具体问题。',
        body: '先说明用途，再请对方指出某一处的依据。提出请求，不等于已经得到反馈。',
        nodeRefs: ['b-practice', 'b-comment'], edgeRefs: []
      },
      {
        id: 'future-a', label: '若意见具体', kind: 'scenario',
        title: '如果意见具体，可以试改一处。',
        body: '假设请教后得到可用意见，挑一处修改，再看它解决了什么；也允许发现意见不适合。',
        nodeRefs: [], edgeRefs: [], branchId: 'a'
      },
      {
        id: 'future-b', label: '若仍笼统', kind: 'scenario',
        title: '如果仍很笼统，调整反馈条件。',
        body: '假设请教后仍难判断，核对提问、用途，以及对方是否熟悉这个场景。',
        nodeRefs: [], edgeRefs: [], branchId: 'b'
      }
    ]
  },

  confluence: {
    intro: '点图上的圆点，读懂这段经历。',
    overview: {
      kind: 'interpretation',
      title: '几项积累，可能在这里相遇。',
      body: '方法、材料与合作意向各有来处。先核对能否同时投入，再决定尝试多大范围。'
    },
    hotspots: [
      {
        id: 'past', label: '方法材料', kind: 'fact',
        title: '已有的积累，各有来处。',
        body: '方法曾在小事里试用，记录也整理成了材料。它们是否适合新项目，仍要核对。',
        nodeRefs: ['c-method', 'c-use', 'c-record', 'c-work'], edgeRefs: []
      },
      {
        id: 'relation', label: '伙伴意向', kind: 'interpretation',
        title: '愿意交流，不等于已经能共做。',
        body: '对方表达过合作意愿，但时间与分工尚未确认。这条输入仍是一项外部条件。',
        nodeRefs: ['c-peer', 'c-invite', 'c-now'],
        edgeRefs: [{ from: 'c-invite', to: 'c-now' }]
      },
      {
        id: 'present', label: '想合在一起', kind: 'present',
        title: '此刻，想把积累用在一件小事。',
        body: '合作范围、角色和可投入时间还没对齐；不能把几条线汇在一起当作条件已经具备。',
        nodeRefs: ['c-now'], edgeRefs: []
      },
      {
        id: 'action', label: '对齐条件', kind: 'action',
        title: '把“可以一起做”，说得具体。',
        body: '明确做什么、各自承担什么、眼下能投入多少。讨论本身不会自动补齐伙伴的时间。',
        nodeRefs: ['c-invite', 'c-now'], edgeRefs: []
      },
      {
        id: 'future-a', label: '若能对齐', kind: 'scenario',
        title: '如果条件能对齐，只试一小部分。',
        body: '假设讨论后范围与投入得到确认，先做小范围尝试，再看实际投入和范围是否一致。',
        nodeRefs: [], edgeRefs: [], branchId: 'a'
      },
      {
        id: 'future-b', label: '若未对齐', kind: 'scenario',
        title: '如果条件未齐，积累仍然在。',
        body: '假设讨论后仍不合适，可以延后、缩小或先独立整理，不把未承诺的资源算进去。',
        nodeRefs: [], edgeRefs: [], branchId: 'b'
      }
    ]
  },

  sparse: {
    intro: '点图上的圆点，读懂这段经历。',
    overview: {
      kind: 'unknown',
      title: '两项已知，其他地方留白。',
      body: '想换节奏，也想暂不决定。信息还不足以连接原因，先保留一个可以继续了解的问题。'
    },
    hotspots: [
      {
        id: 'past', label: '想换节奏', kind: 'fact',
        title: '有时，会想换一种节奏。',
        body: '这是目前已有的叙述。还不清楚涉及工作、生活安排，还是其他处境。',
        nodeRefs: ['s-wish'], edgeRefs: []
      },
      {
        id: 'relation', label: '暂不决定', kind: 'fact',
        title: '同时，也不想立刻作大决定。',
        body: '这份意愿可以被保留，不需要解释成犹豫或逃避，也不能据此补画一条因果。',
        nodeRefs: ['s-pause'], edgeRefs: []
      },
      {
        id: 'present', label: '原因未知', kind: 'unknown',
        title: '现在，还不能说明为什么。',
        body: '两项描述同时存在，不等于一项导致另一项。中间的留白，表示尚待了解。',
        nodeRefs: [], edgeRefs: []
      },
      {
        id: 'action', label: '一个片段', kind: 'action',
        title: '愿意时，带回一个具体时刻。',
        body: '当时发生了什么，你希望少一点或多一点什么？现在不必回答，也不因此生成未来分支。',
        nodeRefs: [], edgeRefs: []
      }
    ]
  }
};
