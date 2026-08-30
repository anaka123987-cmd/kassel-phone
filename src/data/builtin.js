/**
 * 内置静态内容 —— 酒馆第二 API 未配置 / 调用失败时的兜底数据
 * 《龙族》世界观 · 卡塞尔学院
 */

export const BUILTIN_PROFILE = {
  name: '学员',
  studentId: 'KAZ-1024',
  grade: '一年级 · 狮心会预备',
  bloodline: 'S 级 (推测)',
  yanling: '待觉醒',
  dorm: '诺玛男生宿舍 302',
  points: 12,
  title: '优秀新生见习员',
};

export const BUILTIN_CONTENT = {
  forum: {
    boards: ['全部', '校园公告', '屠龙技研', '灌水区', '失物招领'],
    posts: [
      {
        id: 'p1',
        board: '校园公告',
        title: '关于本月地下靶场夜间管制的通知',
        author: '校务处',
        hue: 45,
        time: '今天 09:00',
        pinned: true,
        hot: true,
        likes: 128,
        content:
          '近期多名学员在夜间私自使用言灵进行对练，导致地下三层靶场结界频繁报警。\n自本周起，22:00 后地下靶场停止开放，违者扣除行为积分并上报校长办公室。\n——曼施坦因教授 代发',
        replies: [
          { author: '芬格尔', time: '今天 09:12', content: '完了，我的夜宵……啊不，我的夜间特训没了。' },
          { author: '恺撒·加图索', time: '今天 09:30', content: '管制的对象不包括学生会活动室，对吧？' },
        ],
      },
      {
        id: 'p2',
        board: '屠龙技研',
        title: '【求助】言灵·镰鼬可以用来削苹果吗？在线等',
        author: '路明非',
        hue: 210,
        time: '今天 12:44',
        hot: true,
        likes: 356,
        content:
          '如题。师姐说言灵是用来屠龙的，可是食堂的苹果真的很硬。\n另外问一下，用言灵削苹果会被记过吗？挺急的。',
        replies: [
          { author: '楚子航', time: '今天 12:51', content: '言灵不是玩具。' },
          { author: '诺诺', time: '今天 12:53', content: '笑死，师弟削完了吗？' },
          { author: '芬格尔', time: '今天 13:02', content: '他已经被校工处带走了，苹果我帮他吃。' },
        ],
      },
      {
        id: 'p3',
        board: '灌水区',
        title: '凌晨的图书馆三层为什么会有钟表声？',
        author: '匿名学员',
        hue: 160,
        time: '昨天 02:17',
        hot: true,
        likes: 89,
        content:
          '备考到凌晨，听见三层书库深处有很轻的钟表走针声，一下、一下的。\n但图书馆三层根本没有挂钟。有人知道原因吗？不敢去看了。',
        replies: [
          { author: '匿名学员2', time: '昨天 02:30', content: '别去了。听到钟声就在原地等待，不要回头。' },
          { author: '校务处', time: '昨天 08:00', content: '该楼层检修，请勿传播未经核实的言论。' },
        ],
      },
      {
        id: 'p4',
        board: '校园公告',
        title: '诺玛系统升级完成，学籍查询功能上线',
        author: 'EVA',
        hue: 190,
        time: '前天 16:20',
        likes: 210,
        content:
          '各位学员晚上好。诺玛中枢已完成本学期第一次例行升级，新增学籍卡电子化查询功能。\n请通过个人终端-学籍卡查看您的血统评级、言灵档案与行为积分。\n祝各位学业顺利。',
        replies: [{ author: '路明非', time: '前天 16:44', content: '积分能不能兑换食堂加鸡腿……' }],
      },
      {
        id: 'p5',
        board: '失物招领',
        title: '捡到一枚青铜怀表，表盖内侧刻着非拉丁字符',
        author: '学生会',
        hue: 30,
        time: '昨天 18:05',
        likes: 45,
        content:
          '在炼金术教室外的长椅下捡到一枚青铜怀表，走针正常，但表盖内侧刻有未收录的字符。\n失主请携带有效证件到学生会认领。在此之前请勿上发条。',
        replies: [],
      },
      {
        id: 'p6',
        board: '灌水区',
        title: '狮心会招新考核第一关居然是叠被子？',
        author: '新生小王',
        hue: 280,
        time: '今天 08:41',
        likes: 67,
        content: '说好的实战考核呢？恺撒学长盯着我的被子看了十分钟，说棱线不够锋利。这是什么贵族通病吗？',
        replies: [{ author: '恺撒·加图索', time: '今天 09:02', content: '细节决定生死。被子和龙鳞一样，都需要纪律。' }],
      },
    ],
  },
  messages: {
    chats: [
      {
        id: 'c1',
        name: '芬格尔',
        role: '学长 · 室友',
        hue: 100,
        unread: 2,
        quickReplies: ['我马上到', '作业借我抄一下', '今晚去食堂吗？'],
        messages: [
          { from: 'them', text: '师弟！你昨晚是不是又半夜溜出去打游戏了？', time: '23:41' },
          { from: 'them', text: '诺玛的巡逻记录都写着呢，302 的门禁刷了两次。', time: '23:41' },
          { from: 'me', text: '……学长你管得真宽。', time: '23:45' },
          { from: 'them', text: '我这是关心你！下不为例啊，下次带上我。', time: '23:46' },
        ],
      },
      {
        id: 'c2',
        name: '楚子航',
        role: '狮心会 · 三年级',
        hue: 215,
        unread: 0,
        quickReplies: ['明白了，师兄', '我还需要锻炼', '收到'],
        messages: [
          { from: 'them', text: '明天晨训提前到五点半。', time: '21:02' },
          { from: 'me', text: '五点半？正常不是六点吗？', time: '21:05' },
          { from: 'them', text: '龙不会等你的闹钟。', time: '21:06' },
        ],
      },
      {
        id: 'c3',
        name: '诺诺',
        role: '学生会 · 师姐',
        hue: 340,
        unread: 1,
        quickReplies: ['好嘞师姐', '这是什么意思？', '我也觉得'],
        messages: [
          { from: 'them', text: '看到论坛上削苹果的帖子了，师弟你很有前途。', time: '13:10' },
          { from: 'them', text: '周六学生会有个活，缺个搬箱子的，你懂我意思吧？', time: '13:11' },
        ],
      },
      {
        id: 'c4',
        name: '恺撒·加图索',
        role: '学生会主席',
        hue: 45,
        unread: 0,
        quickReplies: '是,主席'.split(','),
        messages: [
          { from: 'them', text: '听说你在查青铜怀表的事？', time: '昨天 20:15' },
          { from: 'them', text: '学生会的档案对你开放。但记住：有些东西知道了，就退不回去了。', time: '昨天 20:16' },
          { from: 'me', text: '我还是想看看。', time: '昨天 20:20' },
          { from: 'them', text: '很好。周五晚上，旧图书馆，别迟到。', time: '昨天 20:21' },
        ],
      },
      {
        id: 'c5',
        name: 'EVA',
        role: '校园中枢 AI',
        hue: 190,
        unread: 0,
        quickReplies: ['查询行为积分', '今天有什么安排？', '谢谢'],
        messages: [
          { from: 'them', text: '晚上好，学员。您的本月行为积分为 12 分，处于新生平均水平。', time: '19:00' },
          { from: 'them', text: '温馨提示：图书馆三层今日 22:00 后停止开放。祝您有个好梦。', time: '19:00' },
        ],
      },
      {
        id: 'c6',
        name: '昂热校长',
        role: '校长',
        hue: 0,
        unread: 0,
        quickReplies: ['是，校长。', '我准备好了'],
        messages: [
          { from: 'them', text: '孩子，欢迎来到卡塞尔。', time: '开学日' },
          { from: 'them', text: '在这里，你可以做任何事——除了平庸。', time: '开学日' },
        ],
      },
    ],
  },
  news: [
    {
      id: 'n1',
      tag: '头条',
      title: '本年度「屠龙」实践课名单公示',
      source: '教务处',
      time: '今天 10:00',
      content:
        '经校董会审议，本年度进入「卡塞尔实践课」最终名单的学员共 24 人。名单已在诺玛系统公示。\n实践课地点、任务内容列为最高机密，入选学员请于周五前签署保密协议。',
    },
    {
      id: 'n2',
      tag: '校园',
      title: '图书馆地下书库重新开放，新增炼金术专区',
      source: '图书馆',
      time: '昨天 14:30',
      content: '经过半年修缮，地下书库重新对三年级以上学员开放。新增炼金术专区收藏有中世纪手稿的复刻本，借阅需两名教授联名签字。',
    },
    {
      id: 'n3',
      tag: '提醒',
      title: '近期芝加哥市区出现异常气候波动',
      source: '龙类研究中心',
      time: '昨天 09:12',
      content: '监测显示密歇根湖面气压出现短时异常，研究中心提醒学员近期减少夜间单独外出。如遭遇无法解释的现象，请立即联系值夜教师。',
    },
    {
      id: 'n4',
      tag: '活动',
      title: '秋季舞会定档，学生会公开招募志愿者',
      source: '学生会',
      time: '前天 18:00',
      content: '一年一度的卡塞尔秋季舞会将于下月在主礼堂举行。舞会预算据说创了新高——毕竟某个主席宣称要「重现欧洲宫廷的排场」。',
    },
  ],
};
