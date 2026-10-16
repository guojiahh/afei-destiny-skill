/*
 * 此后 · 第一阶段匿名虚构素材。
 * 所有姓名、叙述、关系解释与回访均为产品演示创作，不来自真实咨询。
 * nodes 是素材中已描述的经历；edges 是可修正的理解，不是已证实的因果。
 * branches 是条件情景；revision 是预先编写的模拟回访，不表示已同步咨询。
 * 不含出生信息、历法计算、八字结论、人生分数或概率。
 */
window.CIHOU_CASES = [
  {
    id: 'loop',
    name: '林舟',
    role: '职责与边界 · 虚构样例',
    structure: 'loop',
    title: ['总是接住别人，', '也想接住自己。'],
    summary: '几次临时补位，渐渐变成持续承接。先看看，哪些职责可以重新说清。',
    question: '临时帮忙，是从哪里开始变成默认职责的？',
    nodes: [
      {
        id: 'l-fill', label: '临时补位', time: '较早 · 日期未提供',
        quote: '有几次项目赶进度，我帮忙接了原本不在分工里的任务。',
        source: '虚构素材 L1 · 开场叙述'
      },
      {
        id: 'l-default', label: '持续承接', time: '随后 · 日期未提供',
        quote: '后来类似任务又交给我，原来的分工一直没有重新讨论。',
        source: '虚构素材 L2 · 职责补充'
      },
      {
        id: 'l-load', label: '任务叠加', time: '本次叙述 · 日期未提供',
        quote: '现在几项任务同时找过来。我接下以后，自己的事项就得往后排。',
        source: '虚构素材 L3 · 当前处境'
      }
    ],
    edges: [
      {
        from: 'l-fill', to: 'l-default', label: '可能形成默认',
        basis: 'L1 描述临时补位，L2 描述类似任务持续交来；两者的作用关系仍待核对。',
        condition: '临时分工未被重新说明，且后续派工确实沿用原来的安排。',
        counterexample: '也可能是岗位空缺或上级明确分配，未必由补位形成。',
        unknown: '任务分配者依据什么派工，目前没有信息。'
      },
      {
        from: 'l-default', to: 'l-load', label: '叠加到原任务',
        basis: 'L2 的持续承接与 L3 的任务并行，支持继续了解工作量如何叠加。',
        condition: '新增任务没有伴随延期、交接或其他事项的取消。',
        counterexample: '若原任务已经减量，新增任务未必增加总负荷。',
        unknown: '任务实际耗时、正式职责与可用人手尚未核对。'
      },
      {
        from: 'l-load', to: 'l-fill', label: '再次补位？',
        basis: 'L3 提到继续接下任务，暂以回环表示一种待确认的反复模式。',
        condition: '下一次临时任务仍以相同方式被接下，且没有重新分配。',
        counterexample: '若每次都来自明确的岗位指派，个人补位并非回环的主要原因。',
        unknown: '是否曾拒绝、提出异议或获得重新安排，目前未知。'
      }
    ],
    graphLabels: ['临时补位', '默认职责', '继续承接'],
    action: {
      label: '试着谈清边界', short: '谈清边界',
      change: '把默认承接的任务，变成可以讨论优先级与交接的事项。',
      cost: '需要整理任务，也可能经历一次不轻松的沟通。',
      needs: '有权调整分工的人愿意听取情况，或至少能收到清晰记录。',
      observe: '讨论之后，哪些任务真的延期、交接或重新排序？'
    },
    alternative: {
      label: '先记录，再决定', protect: '保留现有节奏，先看清负荷来源。',
      cost: '短期职责可能仍维持原状。',
      needs: '能够记录新增事项、分配来源与占用时间。',
      observe: '哪些任务反复出现，又是谁决定交给你？'
    },
    branches: [
      {
        id: 'a', label: '如果愿意协商', title: '把讨论变成安排',
        body: '把达成的共识落到具体任务，再看看执行中有没有改变。',
        needs: '对方拥有调整权限，相关协作者也知晓安排。',
        cost: '需要交接与后续核对，沟通本身不会自动减少工作量。',
        observe: '下一次同类任务到来时，是否按新安排处理？'
      },
      {
        id: 'b', label: '如果暂未同意', title: '看清尚未松动的条件',
        body: '了解卡在权限、资源还是优先级，再决定等待、补充信息或寻求支持。',
        needs: '能进一步了解未被同意的原因，并评估再次沟通是否合适。',
        cost: '职责可能暂时不变，还需要保护已有精力。',
        observe: '对方给出了什么限制？其中哪些可以核对？'
      }
    ],
    insights: [
      {
        title: '一次帮忙，怎样被延续',
        chain: ['临时承接', '未再讨论', '持续分配'],
        sentence: '这条关系值得核对；也可能真正起作用的是岗位与权限。'
      },
      {
        title: '可以介入的是讨论',
        chain: ['列出事项', '说明取舍', '等待回应'],
        sentence: '你能让条件更清楚，无法独自决定对方的安排。'
      }
    ],
    context: {
      scene: '新任务到来时，先明确它会挤占哪一件已经承诺的事。',
      against: '尚未了解岗位空缺与派工权限，不能把负荷都归因于个人边界。',
      alternative: '如果沟通条件暂不具备，记录来源与寻求支持也可以是下一步。'
    },
    topics: [
      { id: 'self', name: '自我', status: '略有了解', label: '可靠与可持续', points: ['补充自述 L5：希望是可靠的合作者，也不希望什么都由自己承担。', 'L4 与 L6：先想怎样完成，是部分场景中的反应；分工清楚时也会先讨论顺序。', '这些自述不能定义整个人，也不解释所有派工原因。'] },
      { id: 'learning', name: '学习', status: '未展开', label: '尚未了解', points: ['本次没有学习经历资料。'] },
      { id: 'career', name: '事业', status: '深入', label: '职责未再确认', points: ['类似任务持续交来。', '原有事项被新增任务挤占。', '派工权限与人手情况仍待核对。'] },
      { id: 'finance', name: '财务', status: '未展开', label: '尚未了解', points: ['本次没有收支、储备或财务约束资料。'] },
      { id: 'relationships', name: '关系', status: '略有了解', label: '工作协作', points: ['仅了解工作中的分工关系，未展开亲密关系。'] },
      { id: 'family', name: '家庭', status: '未展开', label: '尚未了解', points: ['本次没有家庭处境资料。'] },
      { id: 'mobility', name: '迁移', status: '未展开', label: '尚未了解', points: ['本次没有迁居或地域选择资料。'] },
      { id: 'wellbeing', name: '身心', status: '略有了解', label: '可用精力', points: ['任务叠加可能占用精力，实际影响尚未询问。', '不由工作叙述推导健康结论。'] }
    ],
    windows: [
      { time: '若决定沟通 · 事前', title: '列出正在承担的事', body: '写下来源、期限与需要协调的取舍。', kind: '现实计划' },
      { time: '沟通之后 · 时间自定', title: '看安排有没有落实', body: '核对实际变化，也记录未改变的部分。', kind: '现实计划' },
      { time: '时间未知', title: '派工条件仍待了解', body: '没有足够资料设定一个必然转好的日期。', kind: '信息缺失' }
    ],
    revision: {
      prior: '反复补位可能让任务形成默认归属，进而带来下一次补位。',
      feedback: '模拟回访：这几次主要是岗位空缺后的明确派工；我提出过重新分配，但负责人暂时没有补充人手。',
      current: '撤去“再次补位”的回连，改画“岗位空缺 → 任务分配 → 负荷叠加”的开链，把结构性约束放到图中。',
      keep: '任务正在叠加，优先级与交接仍有讨论价值。',
      drop: '放下“个人补位是反复派工主要原因”的理解。',
      unknown: '谁能调整资源、能否延期，仍未得到答复。',
      title: ['有些重量，', '来自尚未补上的位置。'],
      graphLabels: ['岗位空缺', '任务分配', '负荷叠加']
    },
    observation: '下一次任务到来时，记录是谁分配、挤占了什么，以及是否有调整权限。'
  },
  {
    id: 'bridge',
    name: '许宁',
    role: '学习与实践 · 虚构样例',
    structure: 'bridge',
    title: ['已经学了很多，', '想让它遇见现实。'],
    summary: '有课程、有笔记，也有跟做练习。下一座桥，可能通向一次具体反馈。',
    question: '学习和实际使用之间，还缺的是哪一种连接？',
    nodes: [
      {
        id: 'b-course', label: '课程积累', time: '较早 · 日期未提供',
        quote: '我陆续学了一些课程，基本概念已经不陌生。',
        source: '虚构素材 B1 · 学习经历'
      },
      {
        id: 'b-notes', label: '方法笔记', time: '随后 · 日期未提供',
        quote: '我把常用的方法整理成笔记，遇到问题会回去查。',
        source: '虚构素材 B2 · 学习方式'
      },
      {
        id: 'b-practice', label: '跟做练习', time: '学习期间 · 日期未提供',
        quote: '跟着教程做过练习，有的地方能自己改，有的还得照着步骤。',
        source: '虚构素材 B3 · 已有练习'
      },
      {
        id: 'b-comment', label: '零散回应', time: '练习之后 · 日期未提供',
        quote: '给人看过一次，对方说还不错，但没有说哪里要改。',
        source: '虚构素材 B4 · 反馈经历'
      },
      {
        id: 'b-now', label: '想再试试', time: '本次叙述 · 日期未提供',
        quote: '我想知道自己离实际使用还有多远，也不想一直只靠多学一点来判断。',
        source: '虚构素材 B5 · 当前问题'
      }
    ],
    edges: [
      {
        from: 'b-course', to: 'b-notes', label: '整理成可查方法',
        basis: 'B1、B2 记录了课程与笔记的关联；学习效果没有独立测量。',
        condition: '笔记确实覆盖后续任务需要的方法。',
        counterexample: '整理得完整，也可能仍不适合具体任务。',
        unknown: '笔记如何被实际调用，了解有限。'
      },
      {
        from: 'b-notes', to: 'b-practice', label: '尝试调用',
        basis: 'B2、B3 提到查阅方法与跟做练习，暂作一种学习过程的解释。',
        condition: '练习中存在需要独立判断的环节。',
        counterexample: '完全照着步骤完成时，未必检验了独立使用能力。',
        unknown: '是否已经完成独立作品，初次叙述未说明。'
      },
      {
        from: 'b-practice', to: 'b-comment', label: '得到笼统回应',
        basis: 'B3、B4 表明练习曾被别人看过，但没有具体改进信息。',
        condition: '对方了解作品的用途，并愿意给出意见。',
        counterexample: '友善评价不一定反映作品能否满足使用要求。',
        unknown: '当时有没有共同的评价标准，尚不清楚。'
      },
      {
        from: 'b-comment', to: 'b-now', label: '仍缺判断依据',
        basis: 'B4 的笼统回应与 B5 的疑问，支持继续了解反馈缺口。',
        condition: '用户确实希望检验实际使用，而非单纯享受学习。',
        counterexample: '若学习本身就是目的，未必需要作品检验。',
        unknown: '希望应用到什么场景、达到什么程度，仍待具体化。'
      }
    ],
    graphLabels: ['已有准备', '已有练习', '待具体反馈'],
    action: {
      label: '让作品遇见反馈', short: '带着问题请教',
      change: '把“做得怎么样”缩小为一个可以被具体回应的问题。',
      cost: '需要挑一件作品、说明用途，也可能听到尚未准备好的意见。',
      needs: '有可讨论的作品，且找到愿意结合用途给反馈的人。',
      observe: '是否得到一条可以据此修改、并再次验证的意见？'
    },
    alternative: {
      label: '先明确想用在哪里', protect: '保留学习的乐趣，不急于证明能力。',
      cost: '短期仍可能缺少外部检验。',
      needs: '愿意选出一个具体的使用场景。',
      observe: '这个场景究竟需要什么，而已有练习覆盖了哪些部分？'
    },
    branches: [
      {
        id: 'a', label: '如果收到具体意见', title: '选一处修改，再看一次',
        body: '只处理一项与用途相关的意见，让前后变化可以被观察。',
        needs: '意见具体，并且在现有时间与工具范围内能够尝试。',
        cost: '要投入一次修改，也要判断意见是否适合目标场景。',
        observe: '修改解决了什么，又暴露了什么新的问题？'
      },
      {
        id: 'b', label: '如果回应仍很笼统', title: '先对齐反馈的尺度',
        body: '补充作品用途，缩小提问；必要时换一种反馈方式。',
        needs: '能向对方说明想核对的具体环节。',
        cost: '寻找合适反馈可能比再次学习更费时间。',
        observe: '下一次是否得到依据，而不只是“不错”或“不行”？'
      }
    ],
    insights: [
      {
        title: '已经发生的学习', chain: ['接触方法', '跟做练习', '尝试改动'],
        sentence: '这些都是已有投入，不能因为仍有疑问就将它们归零。'
      },
      {
        title: '把反馈变得可用', chain: ['说明用途', '问一件事', '据此修改'],
        sentence: '是否需要更多实践，仍要结合已经做过什么来判断。'
      }
    ],
    context: {
      scene: '带一件已有作品，请对方只评价一个与实际用途有关的环节。',
      against: '初次叙述没有说明独立作品的数量，不能直接断言一直没有实践。',
      alternative: '如果暂时找不到反馈者，可以先写出预期用途与自检问题，保留未知。'
    },
    topics: [
      { id: 'self', name: '自我', status: '略有了解', label: '想知道自己走到哪', points: ['希望获得实际使用的参照，不据此定义为“缺乏自信”。'] },
      { id: 'learning', name: '学习', status: '深入', label: '从积累到反馈', points: ['已经有课程、笔记与跟做练习。', '收到的意见还不够具体。', '独立作品与目标用途仍需补充。'] },
      { id: 'career', name: '事业', status: '略有了解', label: '应用场景待定', points: ['提到实际使用，尚未明确是否与求职或岗位有关。'] },
      { id: 'finance', name: '财务', status: '未展开', label: '尚未了解', points: ['没有学习预算或收入约束资料。'] },
      { id: 'relationships', name: '关系', status: '略有了解', label: '反馈交流', points: ['只了解一次作品交流，不推导其他关系模式。'] },
      { id: 'family', name: '家庭', status: '未展开', label: '尚未了解', points: ['本次没有家庭处境资料。'] },
      { id: 'mobility', name: '迁移', status: '未展开', label: '尚未了解', points: ['本次没有地域选择资料。'] },
      { id: 'wellbeing', name: '身心', status: '未展开', label: '尚未了解', points: ['本次没有睡眠、精力或健康资料。'] }
    ],
    windows: [
      { time: '若决定请教 · 事前', title: '选作品，选问题', body: '从已有材料里选择，不要求先做一个更大的项目。', kind: '现实计划' },
      { time: '收到回应之后', title: '看看意见能否使用', body: '挑一个可尝试的改动；也允许判断这条意见不适合。', kind: '现实计划' }
    ],
    revision: {
      prior: '可能需要从学习迈向一次独立实践，才能知道自己走到了哪里。',
      feedback: '模拟回访：其实已做过两件独立作品，也修改过；缺的是具体标准，对方每次只说整体还行。',
      current: '将“实践尚未连接”的缺口移到反馈环节：已有作品保留为实线，下一座桥连接共同标准与具体意见。',
      keep: '学习已有积累，仍希望获得实际使用的参照。',
      drop: '放下“还没有开始独立实践”的初步理解。',
      unknown: '谁能结合目标用途提供具体反馈，仍待寻找。',
      title: ['你已经做过了，', '这次，把反馈接上。'],
      graphLabels: ['已有作品', '共同标准', '待具体反馈']
    },
    observation: '下一次请教后，记下一条真正能用于修改的意见；如果没有，也保留这个结果。'
  },
  {
    id: 'confluence',
    name: '乔安',
    role: '积累与合作 · 虚构样例',
    structure: 'confluence',
    title: ['走过的几条路，', '开始有了交汇处。'],
    summary: '方法、交流与作品积累，可能在一次小合作里相遇。先核对，它们是否真的能同时到场。',
    question: '已经拥有的东西，怎样在一个合适的范围里共同起作用？',
    nodes: [
      {
        id: 'c-method', label: '方法笔记', time: '较早 · 日期未提供',
        quote: '我把做事时反复用到的方法记了下来。',
        source: '虚构素材 C1 · 方法积累'
      },
      {
        id: 'c-use', label: '小事试用', time: '随后 · 日期未提供',
        quote: '后来在两个小任务里用过，至少知道哪些步骤还不顺。',
        source: '虚构素材 C2 · 应用经历'
      },
      {
        id: 'c-peer', label: '伙伴交流', time: '另一段经历 · 日期未提供',
        quote: '有位同行愿意和我交流，我们对想解决的问题有些共识。',
        source: '虚构素材 C3 · 交流经历'
      },
      {
        id: 'c-invite', label: '合作邀约', time: '交流之后 · 日期未提供',
        quote: '对方提过可以一起做一个小项目，具体安排还没谈。',
        source: '虚构素材 C4 · 未落实的邀约'
      },
      {
        id: 'c-record', label: '持续记录', time: '持续一段时间 · 起止未知',
        quote: '我习惯留下做过的过程和遇到的问题。',
        source: '虚构素材 C5 · 记录习惯'
      },
      {
        id: 'c-work', label: '作品整理', time: '记录之后 · 日期未提供',
        quote: '已经从记录里整理出几份可以拿来讨论的材料。',
        source: '虚构素材 C6 · 已有材料'
      },
      {
        id: 'c-now', label: '想合在一起', time: '本次叙述 · 日期未提供',
        quote: '我想用现有材料试一个合作，但不清楚范围和彼此能投入多少。',
        source: '虚构素材 C7 · 当前问题'
      }
    ],
    edges: [
      {
        from: 'c-method', to: 'c-use', label: '在任务里试用',
        basis: 'C1、C2 描述了方法与应用的联系，仅支持已有尝试。',
        condition: '新任务与原方法的适用范围接近。',
        counterexample: '在两个小任务有效，不能保证适用更复杂项目。',
        unknown: '哪些步骤能够复用，尚未逐项核对。'
      },
      {
        from: 'c-peer', to: 'c-invite', label: '从交流到邀约',
        basis: 'C3、C4 表明有交流与口头邀约，还没有投入承诺。',
        condition: '双方仍愿意推进，并能讨论范围。',
        counterexample: '表达兴趣不等于有时间参加。',
        unknown: '伙伴的时间、角色与实际可投入程度未知。'
      },
      {
        from: 'c-record', to: 'c-work', label: '整理为可讨论材料',
        basis: 'C5、C6 描述由过程记录整理材料的经历。',
        condition: '材料与拟讨论的问题有关，且可以在本次合作中使用。',
        counterexample: '材料丰富也可能尚不适合对方的需求。',
        unknown: '是否需要补充授权、整理或匿名处理，尚待核对。'
      },
      {
        from: 'c-use', to: 'c-now', label: '方法可能可用',
        basis: 'C2 的应用经历可提供起点，不代表项目能力已经充分。',
        condition: '先把合作范围缩到现有能力能够检验的一部分。',
        counterexample: '若范围扩大，现有方法可能不足。',
        unknown: '本次合作实际需要解决什么，还没有定稿。'
      },
      {
        from: 'c-invite', to: 'c-now', label: '伙伴尚待确认',
        basis: 'C4、C7 支持核对合作条件，不能把口头邀约画成已经到位的人手。',
        condition: '伙伴明确同意角色、范围和可投入时间。',
        counterexample: '伙伴可能愿意交流，但暂时不能共做。',
        unknown: '可用时间与具体分工尚未确认。'
      },
      {
        from: 'c-work', to: 'c-now', label: '材料可能成为起点',
        basis: 'C6、C7 表明希望使用已有材料尝试合作。',
        condition: '材料可被分享，而且与共同问题有关。',
        counterexample: '若不匹配目标，继续积累并不等于合作准备充分。',
        unknown: '对方是否看过材料、是否认为合用，目前未知。'
      }
    ],
    graphLabels: ['可用方法', '伙伴意向', '已有材料'],
    action: {
      label: '试着把条件对齐', short: '对齐合作条件',
      change: '把“可以一起做”，拆成范围、角色与投入的具体约定。',
      cost: '需要一次沟通，也可能发现现在并不适合启动。',
      needs: '双方愿意诚实说明现阶段能够投入什么。',
      observe: '哪些条件已经落实，哪些仍只是愿望？'
    },
    alternative: {
      label: '先整理自己的小样', protect: '保留自主节奏，让现有积累继续可用。',
      cost: '暂时减少共同讨论与分工的帮助。',
      needs: '范围足够小，且不依赖尚未承诺的资源。',
      observe: '哪些部分自己可以完成，哪些确实需要合作？'
    },
    branches: [
      {
        id: 'a', label: '如果条件能对齐', title: '只启动一个小范围',
        body: '选择现有方法与材料能支持的一部分，并约定何时核对进展。',
        needs: '角色、可投入时间与材料使用范围得到确认。',
        cost: '合作会占用原有事项的时间，也需要协调。',
        observe: '实际投入是否与约定相符？范围有没有变大？'
      },
      {
        id: 'b', label: '如果暂时对不齐', title: '保留联系，重新排布',
        body: '可以延后合作、缩小范围，或先独立整理；不把尚未到位的资源算进去。',
        needs: '知道具体缺少什么，也能接受暂不启动。',
        cost: '共同尝试会推迟，但已有积累仍然存在。',
        observe: '以后出现什么新条件，才值得再谈？'
      }
    ],
    insights: [
      {
        title: '几段积累，各有来处', chain: ['形成方法', '用于小事', '留下材料'],
        sentence: '已有经验提供起点，其适用范围仍需要通过具体任务核对。'
      },
      {
        title: '意向还需要落地', chain: ['愿意交流', '说明投入', '确认范围'],
        sentence: '关系中的善意值得保留，但不等于已经可用的项目资源。'
      },
      {
        title: '汇流，也允许暂停', chain: ['核对条件', '缩小尝试', '再看反馈'],
        sentence: '条件暂不齐时，保留已有积累也是一种合理安排。'
      }
    ],
    context: {
      scene: '用一次短讨论确认：共同做什么、各自负责什么、眼下能投入多少。',
      against: '只有口头邀约，不能将合作画成已经落实，更不能预设项目结果。',
      alternative: '可以延后汇流，先把自己能够独立推进的一小部分整理出来。'
    },
    topics: [
      { id: 'self', name: '自我', status: '略有了解', label: '看见已有积累', points: ['能够整理过程与问题，不据此推导固定人格。'] },
      { id: 'learning', name: '学习', status: '略有了解', label: '方法曾被试用', points: ['在两个小任务里试过方法。', '适用范围仍需要核对。'] },
      { id: 'career', name: '事业', status: '深入', label: '一次小合作的条件', points: ['已有方法与可讨论材料。', '合作范围和投入未落实。', '是否启动取决于条件，而非画面中的汇流。'] },
      { id: 'finance', name: '财务', status: '未展开', label: '尚未了解', points: ['没有预算、报酬或承担损失的资料。'] },
      { id: 'relationships', name: '关系', status: '深入', label: '意向与承诺分开', points: ['有同行交流与口头邀约。', '伙伴可投入时间未知。', '本次不涉及亲密关系判断。'] },
      { id: 'family', name: '家庭', status: '未展开', label: '尚未了解', points: ['本次没有家庭处境资料。'] },
      { id: 'mobility', name: '迁移', status: '未展开', label: '尚未了解', points: ['本次没有迁居或异地合作限制的资料。'] },
      { id: 'wellbeing', name: '身心', status: '未展开', label: '尚未了解', points: ['可投入精力尚未核对，不把合作意愿等同于精力充足。'] }
    ],
    windows: [
      { time: '若准备启动 · 事前', title: '先确认能到场的条件', body: '核对范围、投入与材料使用，而非先把项目铺开。', kind: '现实计划' },
      { time: '双方约定的检查点', title: '看实际投入与范围', body: '检查点由现实安排决定，此处不填虚构日期。', kind: '现实计划' },
      { time: '时间未知', title: '合作何时能开始', body: '伙伴尚未确认可投入时间，暂不设置启动日。', kind: '信息缺失' }
    ],
    revision: {
      prior: '方法、伙伴意向与已有材料，可能汇入同一次小合作。',
      feedback: '模拟回访：沟通后才知道，伙伴愿意偶尔交流，但目前没有时间共同完成项目。',
      current: '暂停伙伴通往合作节点的连接，只让已可用的方法与材料汇入独立小样；伙伴保留在旁侧，标作交流支持。',
      keep: '方法试用与作品材料仍然存在，交流关系也可以保留。',
      drop: '移除“伙伴已可参与共做”的资源假设。',
      unknown: '以后何时具备共做条件，以及独立范围如何确定，仍需了解。',
      title: ['不必等所有人到齐，', '先看手里已有的。'],
      graphLabels: ['可用方法', '交流支持', '已有材料']
    },
    observation: '把已经承诺的资源与仍在表达意愿的资源分开记下，再决定尝试多大范围。'
  },
  {
    id: 'sparse',
    name: '知夏',
    role: '先理解眼前 · 虚构样例',
    structure: 'sparse',
    title: ['还不必画出全貌，', '先看清眼前一处。'],
    summary: '目前只知道想换一种节奏，还不确定想改变什么。留白也是这份图的一部分。',
    question: '最近哪一个具体时刻，让你想换一种过法？',
    nodes: [
      {
        id: 's-wish', label: '想换节奏', time: '本次叙述 · 日期未提供',
        quote: '最近有时会想，是不是可以换一种节奏，但还说不清具体是什么。',
        source: '虚构素材 S1 · 初次表达'
      },
      {
        id: 's-pause', label: '暂不决定', time: '同次叙述 · 先后未定位',
        quote: '我现在不想立刻做一个大的决定，想先弄明白自己的感受。',
        source: '虚构素材 S2 · 当前意愿'
      }
    ],
    edges: [],
    graphLabels: ['想换节奏', '暂不决定'],
    action: {
      label: '先看一个具体片段', short: '观察一个片段',
      change: '让模糊的想法多一点现场信息；现在还不足以连接成因果。',
      cost: '需要片刻停留，也可能暂时仍说不清。',
      needs: '只在愿意的时候记录，不要求立刻作出判断。',
      observe: '当时发生了什么？你希望少一点什么，或多一点什么？'
    },
    alternative: {
      label: '先把问题放在这里', protect: '保留不决定、不解释的空间。',
      cost: '此刻仍没有足够信息提出具体路径。',
      needs: '不必满足额外条件，也无需为暂停作出说明。',
      observe: '若以后愿意，再带回一个具体片段。'
    },
    branches: [],
    insights: [
      {
        title: '已有信息很少，也足够开始', chain: ['一个念头', '一段现场', '再理解一点'],
        sentence: '这里只提出了解的入口，不把未知拼成一个完整故事。'
      }
    ],
    context: {
      scene: '想起一个希望换节奏的时刻，可以先描述现场，不急着解释自己。',
      against: '尚不知道涉及工作、生活安排还是其他处境，不能判断原因。',
      alternative: '保持空白、暂时不继续，也符合已经表达的意愿。'
    },
    topics: [
      { id: 'self', name: '自我', status: '略有了解', label: '先理解感受', points: ['表达了想换节奏的念头。', '同时明确暂不作重大决定。'] },
      { id: 'learning', name: '学习', status: '未展开', label: '尚未了解', points: ['没有学习经历资料。'] },
      { id: 'career', name: '事业', status: '未展开', label: '尚未了解', points: ['没有工作处境资料，不假定想换节奏等于想换工作。'] },
      { id: 'finance', name: '财务', status: '未展开', label: '尚未了解', points: ['没有财务处境资料。'] },
      { id: 'relationships', name: '关系', status: '未展开', label: '尚未了解', points: ['没有关系经历资料。'] },
      { id: 'family', name: '家庭', status: '未展开', label: '尚未了解', points: ['没有家庭处境资料。'] },
      { id: 'mobility', name: '迁移', status: '未展开', label: '尚未了解', points: ['没有地域选择资料。'] },
      { id: 'wellbeing', name: '身心', status: '未展开', label: '尚未了解', points: ['不能由“想换节奏”推断健康、情绪状态或诊断。'] }
    ],
    windows: [
      { time: '愿意的时候', title: '带回一个片段', body: '时间由自己决定；现在没有需要赶上的节点。', kind: '现实计划' },
      { time: '尚未定位', title: '不补画人生阶段', body: '经历、原因与未来条件都还需要了解。', kind: '信息缺失' }
    ],
    revision: {
      prior: '现在只知道想换节奏，同时不想立刻作重大决定。',
      feedback: '模拟回访：暂时没有想补充的片段，希望先保留这个问题。',
      current: '保持两处已知信息分开，不新增经历、连线或未来分支。',
      keep: '想理解自己的意愿，以及暂不决定的空间。',
      drop: '暂不提出具体改变方案，也不填补未知原因。',
      unknown: '涉及哪种处境、已有何种约束，目前仍未知。',
      title: ['答案可以晚一点，', '这块留白属于你。'],
      graphLabels: ['保留问题', '暂不决定', '原因未知']
    },
    observation: '没有需要完成的任务。若以后愿意，带回一个让你想换节奏的具体时刻。'
  }
];

/*
 * 以下为预先编写的模拟 V2，不由页面点击自动推断。
 * 单独提供修订快照，让主图、依据、行动与解读读取同一版本；V1 保持原样。
 * 新节点与关系仍属于虚构素材。copy 只继承未被新反馈影响的字段。
 */
(function addRevisionSnapshots() {
  const copy = value => JSON.parse(JSON.stringify(value));
  const byId = id => window.CIHOU_CASES.find(item => item.id === id);

  const loop = byId('loop');
  Object.assign(loop.revision, {
    summary: '补充的经历把重点移向岗位空缺与派工权限。负荷仍在，先核对谁能调整安排。',
    question: '当工作量来自岗位与资源约束，哪些安排仍可以被讨论？',
    nodes: [
      {
        id: 'l-vacancy', label: '岗位空缺', time: '模拟回访 · 日期未提供',
        quote: '这几次任务主要来自岗位空缺，原来做这些事的人暂时不在。',
        source: '虚构素材 LR1 · 模拟回访：岗位情况'
      },
      {
        id: 'l-assign', label: '明确派工', time: '模拟回访 · 日期未提供',
        quote: '负责人明确把任务派给我。我提出过重新分配，但暂时没有补充人手。',
        source: '虚构素材 LR2 · 模拟回访：分配与权限'
      },
      copy(loop.nodes.find(node => node.id === 'l-load'))
    ],
    edges: [
      {
        from: 'l-vacancy', to: 'l-assign', label: '空缺后的派工',
        basis: '模拟回访 LR1、LR2 将这些任务与岗位空缺后的明确派工联系起来。',
        condition: '本次讨论的任务确实来自这些空缺岗位。',
        counterexample: '其他临时任务可能有不同来源，不能全部归入同一原因。',
        unknown: '空缺预计持续多久、谁能决定补充人手，目前未知。'
      },
      {
        from: 'l-assign', to: 'l-load', label: '原任务未减量',
        basis: 'LR2 的明确派工与原素材 L3 的任务叠加共同支持核对总负荷。',
        condition: '新增事项没有伴随原任务延期、减量或交接。',
        counterexample: '若实际已经减量，仍需寻找其他导致负荷的条件。',
        unknown: '具体优先级、总工时及可调整的任务范围尚未核对。'
      }
    ],
    graphLabels: ['岗位空缺', '明确派工', '任务叠加'],
    graphNodeIds: ['l-vacancy', 'l-assign', 'l-load'],
    action: {
      label: '试着讨论工作量', short: '讨论优先级与交接',
      change: '把岗位空缺带来的额外工作量，转成有权限的人需要明确的取舍。',
      cost: '需要整理任务与期限，也可能仍得等待资源安排。',
      needs: '找到有权决定延期、交接或补充资源的人。',
      observe: '哪些事项被明确延期、减量或转交？哪些仍没有负责人？'
    },
    alternative: {
      label: '先核对权限与负荷', protect: '先看清可以协商的范围，减少无效重复沟通。',
      cost: '短期负荷可能继续维持。',
      needs: '可以记录任务来源、期限，以及分配者能调整的事项。',
      observe: '阻碍来自人手、权限，还是没有明确优先级？'
    },
    branches: [
      {
        id: 'a', label: '如果能够调整安排', title: '确认具体取舍',
        body: '将延期、减量或交接落实到事项与负责人，再核对实际执行。',
        needs: '有权限的人明确决定，相关协作者知道新安排。',
        cost: '调整可能改变他人的时间表，也需要交接。',
        observe: '总负荷是否发生变化，而不只是得到理解？'
      },
      {
        id: 'b', label: '如果资源仍无法调整', title: '保留限制，寻找支持',
        body: '记录尚未解决的约束与可承受范围，再判断等待或寻求其他支持是否合适。',
        needs: '能了解限制来自哪里，并评估现有支持渠道。',
        cost: '问题可能暂时不变，不应将结果归为个人沟通失败。',
        observe: '出现什么资源或权限变化，才值得再次讨论？'
      }
    ],
    insights: [
      {
        title: '回环被打开了', chain: ['岗位空缺', '明确派工', '负荷叠加'],
        sentence: '这次补充让我们撤去个人补位的回连，转向资源与分配的开链。'
      },
      {
        title: '能讨论的是具体取舍', chain: ['列出总量', '找到权限', '确认安排'],
        sentence: '你可以推动条件变清楚，不必独自承担补齐资源的责任。'
      }
    ],
    context: {
      scene: '把新增工作与原任务放在同一张清单里，请有权限的人明确优先级。',
      against: '岗位空缺可以解释这些派工，仍不能解释所有临时任务；每项来源需要核对。',
      alternative: '若无权调整的人已反复听过诉求，下一步可以先寻找真正的决策范围。'
    },
    topics: loop.topics.map(topic => topic.id === 'career'
      ? { id: 'career', name: '事业', status: '深入', label: '岗位与权限约束', points: ['模拟回访补充了岗位空缺与明确派工。', '此前已经提出重新分配。', '重点改为总负荷、调整权限与资源。'] }
      : topic.id === 'self'
        ? { id: 'self', name: '自我', status: '略有了解', label: '不把负荷归于性格', points: ['已有主动沟通经历，不能将处境解释为不会拒绝。'] }
        : topic.id === 'relationships'
          ? { id: 'relationships', name: '关系', status: '略有了解', label: '分配与协商', points: ['已与负责人谈过分配，资源尚未补充。', '未展开其他关系领域。'] }
          : copy(topic)),
    windows: [
      { time: '若再次讨论 · 事前', title: '核对任务与权限', body: '明确已有沟通、尚未处理的事项及有权调整的人。', kind: '现实计划' },
      { time: '得到新安排之后', title: '看实际总量', body: '核对延期、交接或减量是否发生，不把口头理解当成已解决。', kind: '现实计划' },
      { time: '时间未知', title: '资源何时变化', body: '岗位补充时间没有资料，暂不生成改善日期。', kind: '信息缺失' }
    ],
    observation: '下次讨论时，记下哪一项任务由谁决定调整，以及实际工作量是否随之改变。'
  });

  const bridge = byId('bridge');
  Object.assign(bridge.revision, {
    summary: '已经完成独立作品并做过修改。新的缺口在反馈：标准没有说清，意见还不能用于下一次改进。',
    question: '怎样让已经做过的作品，得到具体而可使用的反馈？',
    nodes: [
      {
        id: 'b-independent', label: '已有作品', time: '模拟回访 · 日期未提供',
        quote: '其实我已经独立做过两件作品，不只是跟着教程做。',
        source: '虚构素材 BR1 · 模拟回访：独立实践'
      },
      {
        id: 'b-revised', label: '做过修改', time: '作品完成之后 · 日期未提供',
        quote: '这两件作品后来都改过，我不是一直停在准备阶段。',
        source: '虚构素材 BR2 · 模拟回访：既有修改'
      },
      {
        id: 'b-criteria', label: '标准未明', time: '模拟回访 · 日期未提供',
        quote: '每次请人看，都没有先说清要按什么用途、看哪一部分。',
        source: '虚构素材 BR3 · 模拟回访：反馈条件'
      },
      copy(bridge.nodes.find(node => node.id === 'b-comment')),
      {
        id: 'b-now', label: '待具体反馈', time: '模拟回访 · 日期未提供',
        quote: '作品已经做过也改过，接下来想知道具体哪一处需要改、为什么。',
        source: '虚构素材 BR4 · 模拟回访：当前问题'
      }
    ],
    edges: [
      {
        from: 'b-independent', to: 'b-revised', label: '已经历一次修改',
        basis: '模拟回访 BR1、BR2 明确描述了独立作品与后续修改。',
        condition: '这些修改确实发生在讨论的两件作品上。',
        counterexample: '有修改不等于改进已经得到检验。',
        unknown: '修改依据与实际效果还未逐项了解。'
      },
      {
        from: 'b-revised', to: 'b-criteria', label: '需要共同的判断标准',
        basis: 'BR2、BR3 显示已有修改，但反馈时尚未明确用途与评价环节。',
        condition: '当前目标是判断作品在某一用途下是否适合。',
        counterexample: '如果目标是自由创作，外部统一标准未必必要。',
        unknown: '最需要核对的使用场景尚未选定。'
      },
      {
        from: 'b-criteria', to: 'b-comment', label: '可能让回应过于笼统',
        basis: 'BR3 的标准未明与 B4 的笼统回应存在可继续核对的联系。',
        condition: '反馈者有能力评价，但缺少具体提问与用途信息。',
        counterexample: '也可能是对方时间有限或不熟悉场景，说明用途仍未必得到具体意见。',
        unknown: '反馈者是否合适、是否愿意深入评价，目前未知。'
      },
      {
        from: 'b-comment', to: 'b-now', label: '仍难判断下一处改动',
        basis: '原素材 B4 与模拟回访 BR4 的疑问相连；新反馈将缺口收窄到意见的可用性。',
        condition: '确实希望据此修改，而不只是分享作品。',
        counterexample: '自己已有充分的判断依据时，未必必须等待外部意见。',
        unknown: '已有自检方法还未展开。'
      }
    ],
    graphLabels: ['已有作品', '标准未明', '待具体反馈'],
    graphNodeIds: ['b-independent', 'b-criteria', 'b-now'],
    action: {
      label: '试着问一个具体问题', short: '请求具体反馈',
      change: '让已有作品与一个明确用途相连，再请对方针对其中一处提供依据。',
      cost: '需要挑选问题、说明场景，也可能要寻找更合适的反馈者。',
      needs: '选定用途，并找到愿意就此回应的人。',
      observe: '得到的意见是否指出具体位置、理由和可尝试的改动？'
    },
    alternative: {
      label: '先建立自己的检查项', protect: '保留已有作品与实践成果，不再把问题归为没有开始。',
      cost: '自检可能看不到外部使用者的问题。',
      needs: '能够描述一个使用场景，并列出少量可观察的要求。',
      observe: '哪些问题自己能判断，哪些确实需要他人体验？'
    },
    branches: [
      {
        id: 'a', label: '如果得到具体依据', title: '据此改一处，再核对',
        body: '选择一条与用途相关的意见尝试修改，比较前后变化。',
        needs: '意见可以落实，并且适合本次作品的目标。',
        cost: '需要一次有范围的修改，反馈也可能彼此不一致。',
        observe: '改动是否解决了原问题？依据是否经得住再看？'
      },
      {
        id: 'b', label: '如果仍只有笼统评价', title: '调整反馈条件',
        body: '核对提问是否具体、对方是否熟悉场景，再选择换问题或换反馈方式。',
        needs: '能够说明想验证的环节，而不是要求对方替自己做总判断。',
        cost: '寻找适合的反馈需要时间，暂时可能仍没有结论。',
        observe: '缺的是共同标准、适合的反馈者，还是对方的时间？'
      }
    ],
    insights: [
      {
        title: '实践已经在这里', chain: ['独立完成', '做过修改', '保留成果'],
        sentence: '新信息撤去了“还没开始”的理解，不必再用做更多来证明已经做过。'
      },
      {
        title: '下一座桥在反馈里', chain: ['明确用途', '问一处细节', '寻找依据'],
        sentence: '具体反馈尚未获得；图中的新连接表示一种可尝试的条件。'
      }
    ],
    context: {
      scene: '带同一件已有作品，问“在这个用途下，这一处是否清楚，为什么？”',
      against: '说明用途也不保证得到好反馈；对方的能力、时间与视角同样重要。',
      alternative: '先自检再请教也成立，无需为这次预演重新做一个项目。'
    },
    topics: bridge.topics.map(topic => topic.id === 'learning'
      ? { id: 'learning', name: '学习', status: '深入', label: '把反馈变具体', points: ['模拟回访确认已有两件独立作品。', '已经做过修改，不能归为未实践。', '反馈用途与标准尚未对齐。'] }
      : topic.id === 'relationships'
        ? { id: 'relationships', name: '关系', status: '略有了解', label: '寻找合适的反馈', points: ['已有回应比较笼统。', '对方是否熟悉使用场景仍待了解。'] }
        : copy(topic)),
    windows: [
      { time: '若再次请教 · 事前', title: '只选一个评价环节', body: '沿用已有作品，说明用途与具体问题。', kind: '现实计划' },
      { time: '获得意见之后', title: '核对意见有没有依据', body: '可以采纳、继续追问，也可以保留不同意见。', kind: '现实计划' }
    ],
    observation: '下一次请教后，记下对方指向了哪里、为什么，以及你是否愿意据此改动。'
  });

  const confluence = byId('confluence');
  confluence.graphNodeIds = ['c-method', 'c-invite', 'c-work'];
  Object.assign(confluence.revision, {
    summary: '伙伴目前没有共同完成项目的空档。方法和材料仍然可用，下一步先核对自己能承担多大范围。',
    question: '先不计算伙伴的投入，已有方法与材料能支持怎样的小范围尝试？',
    nodes: confluence.nodes.map(node => node.id === 'c-invite'
      ? {
          id: 'c-invite', label: '暂不能共做', time: '模拟回访 · 日期未提供',
          quote: '对方愿意偶尔交流，但目前没有时间共同完成项目。',
          source: '虚构素材 CR1 · 模拟回访：伙伴投入'
        }
      : node.id === 'c-now'
        ? {
            id: 'c-now', label: '重看可做范围', time: '模拟回访 · 日期未提供',
            quote: '自己的方法和材料都还在，但哪些部分能独立完成，我还得重新核对。',
            source: '虚构素材 CR2 · 模拟回访：当前问题'
          }
        : copy(node)),
    edges: [
      copy(confluence.edges.find(edge => edge.from === 'c-method')),
      {
        from: 'c-peer', to: 'c-invite', label: '交流保留，共做暂停',
        basis: '原素材 C3 的交流关系保留；模拟回访 CR1 明确暂时不能投入共做。',
        condition: '双方仍愿意交流，并尊重对方可投入的范围。',
        counterexample: '愿意偶尔交流不等于随时能够提供帮助。',
        unknown: '以后是否有共做时间、交流频率如何，目前未知。'
      },
      copy(confluence.edges.find(edge => edge.from === 'c-record')),
      {
        from: 'c-use', to: 'c-now', label: '核对独立适用范围',
        basis: 'C2 的小任务经验仍在；CR2 将问题改为独立可做的范围。',
        condition: '新尝试足够小，不依赖伙伴尚未承诺的能力。',
        counterexample: '若关键环节只能由他人完成，不能因为有经验就默认可独立推进。',
        unknown: '关键环节是否依赖伙伴，还需要逐项核对。'
      },
      {
        from: 'c-work', to: 'c-now', label: '保留可用材料',
        basis: '原素材 C6 与模拟回访 CR2 表明材料仍在，可用于核对小样范围。',
        condition: '材料适合新范围，且可以独立使用。',
        counterexample: '如果使用依赖其他人的授权，材料存在也不等于立即可用。',
        unknown: '是否需要授权、补充与重新整理，仍待核对。'
      }
    ],
    graphLabels: ['可用方法', '暂不能共做', '已有材料'],
    graphNodeIds: ['c-method', 'c-invite', 'c-work'],
    action: {
      label: '试着核对独立范围', short: '缩小尝试范围',
      change: '先移除尚未到位的伙伴投入，看看已有方法与材料能支持哪一小部分。',
      cost: '需要重新取舍，能做的范围可能比原设想小。',
      needs: '关键环节在自己能力、时间与材料使用权限之内。',
      observe: '哪些环节真正可独立完成，哪些仍必须等待支持？'
    },
    alternative: {
      label: '保留邀约，暂不启动', protect: '保留已有积累和交流关系，不勉强补齐所有角色。',
      cost: '项目会延后，也可能暂时没有明确时间。',
      needs: '接受当前条件不足；无需对伙伴追加投入要求。',
      observe: '以后哪一项资源变化，才足以重新讨论合作？'
    },
    branches: [
      {
        id: 'a', label: '如果小范围可独立完成', title: '只试自己能承担的一部分',
        body: '用现有方法与材料做一个边界清楚的小样，伙伴的偶尔交流不计入必要资源。',
        needs: '关键环节、时间与使用权限都已经核对。',
        cost: '独立尝试仍会占用时间，也缺少原设想中的分工。',
        observe: '实际是否能独立完成？范围有没有悄悄扩大？'
      },
      {
        id: 'b', label: '如果关键环节仍需支持', title: '停在缺口处也可以',
        body: '记录依赖的具体条件，可以等待、继续缩小或另行了解支持方式。',
        needs: '明确是哪一环需要支持，不把伙伴暂时无空档当作个人失败。',
        cost: '启动会推迟，但不需要独自承担原定全部工作。',
        observe: '什么样的支持真正必要？出现后是否仍值得推进？'
      }
    ],
    insights: [
      {
        title: '把可用与愿意分开', chain: ['保留交流', '共做暂停', '重新核对'],
        sentence: '伙伴支线暂时断开；这条变化来自补充的信息，不代表关系好坏。'
      },
      {
        title: '手里的积累仍然在', chain: ['已有方法', '可用材料', '小范围检验'],
        sentence: '能否独立推进仍待核对，图中不会替你补上缺少的能力与时间。'
      }
    ],
    context: {
      scene: '把原计划拆成几项，逐项标明是否依赖伙伴，再核对自己可做的边界。',
      against: '方法与材料仍在，也不保证独立完成；关键能力、时间与权限仍是条件。',
      alternative: '若拆开之后仍不合适，保留材料与联系、暂不启动同样成立。'
    },
    topics: confluence.topics.map(topic => topic.id === 'career'
      ? { id: 'career', name: '事业', status: '深入', label: '重新核对小范围', points: ['方法与作品材料仍然可用。', '不能再将伙伴投入计入共做资源。', '能否独立推进取决于关键环节与可用时间。'] }
      : topic.id === 'relationships'
        ? { id: 'relationships', name: '关系', status: '深入', label: '交流与共做分开', points: ['模拟回访确认伙伴暂时没有共做空档。', '偶尔交流仍可以保留。', '不据此判断关系好坏或未来承诺。'] }
        : copy(topic)),
    windows: [
      { time: '若继续考虑 · 事前', title: '移除未到位的投入', body: '先按现有条件核对，不把伙伴空档默认补回来。', kind: '现实计划' },
      { time: '若做了独立小样', title: '回看实际范围', body: '记录哪些可以承担、哪些仍需要支持，再决定是否继续。', kind: '现实计划' },
      { time: '时间未知', title: '何时能够共同投入', body: '伙伴未提供时间，不生成重新合作的日期。', kind: '信息缺失' }
    ],
    observation: '把每项工作需要的能力、时间与支持写清，保留“暂时做不了”的部分。'
  });

  const sparse = byId('sparse');
  Object.assign(sparse.revision, {
    summary: '这次没有新增经历。想理解自己、暂不决定，这两处信息继续保留，其他地方仍然留白。',
    question: '如果以后愿意，可以从一个具体片段再开始。',
    nodes: copy(sparse.nodes),
    edges: [],
    graphLabels: ['想换节奏', '暂不决定'],
    graphNodeIds: ['s-wish', 's-pause'],
    action: copy(sparse.action),
    alternative: copy(sparse.alternative),
    branches: [],
    insights: [
      {
        title: '没有新信息，就不补线', chain: ['保留念头', '尊重暂停', '等待愿意'],
        sentence: '回访也可以没有进展；两处已知信息仍不足以构成因果关系。'
      }
    ],
    context: {
      scene: '当前无需完成记录，也无需解释为什么暂时不继续。',
      against: '没有新增片段，不能从暂停推导犹豫、逃避或其他心理原因。',
      alternative: '若以后愿意，原先的观察入口仍保留；时间由自己决定。'
    },
    topics: copy(sparse.topics),
    windows: copy(sparse.windows),
    observation: '这次没有待完成的任务。保留问题，或以后带回一个片段，都可以。'
  });
}());
