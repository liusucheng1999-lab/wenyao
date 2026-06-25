// ════════════════════════════════════════════════════════════════════
//  纳甲六爻引擎 (najia engine) · 确定性计算层
//  所有五行/干支运算在此闭环，输出结论性 JSON 给解读 AI。
//  本文件可在 node 下跑单测，也直接内联进 index.html 使用。
// ════════════════════════════════════════════════════════════════════

const STEMS    = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

const DIZHI_WUXING = {
  子:'水', 丑:'土', 寅:'木', 卯:'木', 辰:'土', 巳:'火',
  午:'火', 未:'土', 申:'金', 酉:'金', 戌:'土', 亥:'水',
};

// 五行生克
const SHENG = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' }; // 生我者…我生者
const KE    = { 木:'土', 土:'水', 水:'火', 火:'金', 金:'木' }; // 克我者…我克者

// 八卦纳支：trigram → [内卦三爻地支(初,二,三), 外卦三爻地支(四,五,六)]
const NAZHI = {
  乾: [['子','寅','辰'], ['午','申','戌']],
  坤: [['未','巳','卯'], ['丑','亥','酉']],
  震: [['子','寅','辰'], ['午','申','戌']],
  巽: [['丑','亥','酉'], ['未','巳','卯']],
  坎: [['寅','辰','午'], ['申','戌','子']],
  离: [['卯','丑','亥'], ['酉','未','巳']],
  艮: [['辰','午','申'], ['戌','子','寅']],
  兑: [['巳','卯','丑'], ['亥','酉','未']],
};

// 三爻二进制(下→上, 阳=1) → 卦名
const TRIGRAM = {
  '111':'乾', '110':'兑', '101':'离', '100':'震',
  '011':'巽', '010':'坎', '001':'艮', '000':'坤',
};
const TRI_IDX  = { '111':0,'110':1,'101':2,'100':3,'011':4,'010':5,'001':6,'000':7 };
// 八宫本宫五行
const PALACE_WUXING = { 乾:'金', 兑:'金', 离:'火', 震:'木', 巽:'木', 坎:'水', 艮:'土', 坤:'土' };

// 64卦 [上卦索引][下卦索引]  (乾兑离震巽坎艮坤 = 0..7)
const HEX64 = [
  ['乾为天','天泽履','天火同人','天雷无妄','天风姤','天水讼','天山遁','天地否'],
  ['泽天夬','兑为泽','泽火革','泽雷随','泽风大过','泽水困','泽山咸','泽地萃'],
  ['火天大有','火泽睽','离为火','火雷噬嗑','火风鼎','火水未济','火山旅','火地晋'],
  ['雷天大壮','雷泽归妹','雷火丰','震为雷','雷风恒','雷水解','雷山小过','雷地豫'],
  ['风天小畜','风泽中孚','风火家人','风雷益','巽为风','风水涣','风山渐','风地观'],
  ['水天需','水泽节','水火既济','水雷屯','水风井','坎为水','水山蹇','水地比'],
  ['山天大畜','山泽损','山火贲','山雷颐','山风蛊','山水蒙','艮为山','山地剥'],
  ['地天泰','地泽临','地火明夷','地雷复','地风升','地水师','地山谦','坤为地'],
];

const YAO_ZH = ['初','二','三','四','五','上'];

// ─── 工具 ───────────────────────────────────────────────────────────

function bitsToTrigram(b3) { return TRIGRAM[b3.join('')]; }
function bitsToTriIdx(b3)  { return TRI_IDX[b3.join('')]; }

// 6位bits(初→上) → 卦名
function hexName(bits) {
  const lo = bitsToTriIdx(bits.slice(0,3));
  const up = bitsToTriIdx(bits.slice(3,6));
  return HEX64[up][lo];
}

// 装地支：6位bits → 6个地支(初→上)
function attachDizhi(bits) {
  const lower = bitsToTrigram(bits.slice(0,3));
  const upper = bitsToTrigram(bits.slice(3,6));
  return [...NAZHI[lower][0], ...NAZHI[upper][1]];
}

// 六亲：爻五行 vs 本宫五行(=我)
function liuQin(yaoWx, gongWx) {
  if (yaoWx === gongWx)        return '兄弟';
  if (SHENG[yaoWx] === gongWx) return '父母'; // 生我者
  if (SHENG[gongWx] === yaoWx) return '子孙'; // 我生者
  if (KE[yaoWx] === gongWx)    return '官鬼'; // 克我者
  if (KE[gongWx] === yaoWx)    return '妻财'; // 我克者
}

// ─── 八宫表生成 (自校验, 不手抄) ─────────────────────────────────────
// 八宫顺序 + 每宫8卦次序: 本宫→一世→二世→三世→四世→五世→游魂→归魂
const PALACE_ORDER = ['乾','兑','离','震','巽','坎','艮','坤'];
const TRI_BITS = { 乾:[1,1,1], 兑:[1,1,0], 离:[1,0,1], 震:[1,0,0], 巽:[0,1,1], 坎:[0,1,0], 艮:[0,0,1], 坤:[0,0,0] };
const POSITIONS = ['本宫','一世','二世','三世','四世','五世','游魂','归魂'];
// 每个卦位相对本宫(八纯)需翻转的爻 index 集合(0=初)
const FLIP = {
  本宫: [],
  一世: [0],
  二世: [0,1],
  三世: [0,1,2],
  四世: [0,1,2,3],
  五世: [0,1,2,3,4],
  游魂: [0,1,2,4],     // 五世再翻四爻
  归魂: [4],           // 游魂再把内卦三爻翻回 → 仅翻五爻
};
// 世爻位置(1-based, 初=1) → 应爻 = 世±3
const WORLD_LINE = { 本宫:6, 一世:1, 二世:2, 三世:3, 四世:4, 五世:5, 游魂:4, 归魂:3 };
const respLine = w => (w <= 3 ? w + 3 : w - 3);

// 生成 卦名 → {palace, position, palaceWuxing, worldLine, responseLine}
const PALACE_TABLE = (() => {
  const t = {};
  for (const pal of PALACE_ORDER) {
    const pure = [...TRI_BITS[pal], ...TRI_BITS[pal]]; // 八纯 6位
    for (const pos of POSITIONS) {
      const bits = pure.slice();
      for (const i of FLIP[pos]) bits[i] ^= 1;
      const name = hexName(bits);
      const w = WORLD_LINE[pos];
      t[name] = {
        palace: pal,
        position: pos,
        palaceWuxing: PALACE_WUXING[pal],
        worldLine: w,
        responseLine: respLine(w),
      };
    }
  }
  return t;
})();

// ─── 干支历 ──────────────────────────────────────────────────────────

function jdn(y, m, d) { // Fliegel-Van Flandern, 公历
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy
    + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

const gzName = idx => STEMS[idx % 10] + BRANCHES[idx % 12];

// 日干支序号 (0=甲子)。锚点经 1900-01-01=甲戌 / 1949-10-01=甲子 / 2000-01-07=甲子 三重校验。
function dayGanzhiIndex(y, m, d) { return (jdn(y, m, d) + 49) % 60; }

// 太阳黄经近似(度)，用于定月建(节气)。display 级精度即可。
function sunLongitude(date) {
  const jd = date.getTime() / 86400000 + 2440587.5; // UTC JD
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
  let lam = L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
  return ((lam % 360) + 360) % 360;
}

// 五虎遁: 年干 → 正月(寅月)天干索引
const FIRST_MONTH_STEM = { 0:2, 5:2, 1:4, 6:4, 2:6, 7:6, 3:8, 8:8, 4:0, 9:0 }; // 甲己丙,乙庚戊,丙辛庚,丁壬壬,戊癸甲

// 旬空: 日干支序号 → [空地支, 空地支]
function xunKong(dayIdx) {
  const stem = dayIdx % 10, branch = dayIdx % 12;
  const headBranch = (branch - stem + 120) % 12; // 旬首(甲X)的地支
  return [BRANCHES[(headBranch + 10) % 12], BRANCHES[(headBranch + 11) % 12]];
}

function buildGanzhi(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  // 年: (公历年-4)%60。注: 严格应以立春分界，此处 display 级，立春前后±数日可能偏一位。
  const yearIdx = ((y - 4) % 60 + 60) % 60;
  // 月: 由节气(太阳黄经)定月建 + 五虎遁定月干
  const lam = sunLongitude(date);
  const k = Math.floor((((lam - 315) % 360) + 360) % 360 / 30); // 立春(315°)=寅(k0)
  const monthBranchIdx = (2 + k) % 12;
  const firstStem = FIRST_MONTH_STEM[yearIdx % 10];
  const monthStemIdx = (firstStem + ((monthBranchIdx - 2 + 12) % 12)) % 10;
  const dayIdx = dayGanzhiIndex(y, m, d);
  return {
    year:  gzName(yearIdx),
    month: STEMS[monthStemIdx] + BRANCHES[monthBranchIdx],
    day:   gzName(dayIdx),
    dayStem: STEMS[dayIdx % 10],
    dayBranch: BRANCHES[dayIdx % 12],
    dayBranchWuxing: DIZHI_WUXING[BRANCHES[dayIdx % 12]],
    monthBranch: BRANCHES[monthBranchIdx],
    monthWuxing: DIZHI_WUXING[BRANCHES[monthBranchIdx]],
    xunKong: xunKong(dayIdx),
    _yearIdx: yearIdx, _monthBranchIdx: monthBranchIdx,
  };
}

// ─── 六神 (按日干) ───────────────────────────────────────────────────
const SIX_GODS = ['青龙','朱雀','勾陈','螣蛇','白虎','玄武'];
// 日干 → 初爻起的六神索引
function sixGodStart(dayStem) {
  const s = STEMS.indexOf(dayStem);
  if (s <= 1) return 0; // 甲乙 青龙
  if (s <= 3) return 1; // 丙丁 朱雀
  if (s === 4) return 2; // 戊 勾陈
  if (s === 5) return 3; // 己 螣蛇
  if (s <= 7) return 4; // 庚辛 白虎
  return 5;             // 壬癸 玄武
}

// ─── 旺衰 ────────────────────────────────────────────────────────────
// 日辰 / 月令 对某五行的生克关系 (通用)
function relationOf(srcWx, tgtWx) {
  if (srcWx === tgtWx)        return '比和';
  if (SHENG[srcWx] === tgtWx) return '生';  // src 生 tgt
  if (KE[srcWx] === tgtWx)    return '克';  // src 克 tgt
  if (SHENG[tgtWx] === srcWx) return '泄';  // tgt 生 src (泄气)
  return '耗';                              // tgt 克 src
}
function dayRelLabel(rel) {
  return { 比和:'日辰比和', 生:'日辰生之', 克:'日辰克之', 泄:'泄于日辰', 耗:'克日辰(耗)' }[rel];
}

// 月令旺相休囚死: 以月令五行(令)对目标五行论
//   当令=旺, 月生爻=相, 爻生月=休, 爻克月=囚, 月克爻=死
function wangXiang(monthWx, wx) {
  if (wx === monthWx)        return '旺';
  if (SHENG[monthWx] === wx) return '相';
  if (SHENG[wx] === monthWx) return '休';
  if (KE[wx] === monthWx)    return '囚';
  return '死';
}
const WX_SCORE = { 旺: 2, 相: 1, 休: -0.5, 囚: -1.5, 死: -2 };

// 月破: 爻支与月建相冲(地支相隔6位)
function isYuePo(branch, monthBranch) {
  return (Math.abs(BRANCHES.indexOf(branch) - BRANCHES.indexOf(monthBranch)) === 6);
}

// 综合强弱: 月令为根(旺相休囚死)，日辰为助(生克)，临日/临月建得力，月破/旬空减力。
function strengthOf(yaoWx, yaoBranch, gz, isMoving) {
  const wx     = wangXiang(gz.monthWuxing, yaoWx);   // 旺相休囚死
  const dayRel = relationOf(gz.dayBranchWuxing, yaoWx);
  const linRi  = (yaoBranch === gz.dayBranch);        // 临日辰
  const linYue = (yaoBranch === gz.monthBranch);      // 临月建
  const kong   = gz.xunKong.includes(yaoBranch);
  const po     = isYuePo(yaoBranch, gz.monthBranch);

  let score = WX_SCORE[wx];                           // 月令为根
  if (dayRel === '生' || dayRel === '比和') score += 1;
  else if (dayRel === '克')                score -= 1;
  else                                     score -= 0.5; // 泄/耗
  if (linRi)  score += 1;
  if (linYue) score += 1;
  if (isMoving) score += 0.3;
  if (po) score -= 2;

  let strength;
  if (score >= 2.5)      strength = '旺';
  else if (score >= 1)   strength = '偏旺';
  else if (score > -1)   strength = '平';
  else if (score > -2.5) strength = '偏弱';
  else                   strength = '弱';

  const flags = [];
  if (po)   flags.push('月破');
  if (kong) flags.push('旬空');

  return { strength, wangXiang: wx, dayRelation: dayRelLabel(dayRel),
           linRi, linYue, xunKong: kong, yuePo: po, flags };
}

// ─── 化进/化退 (同五行地支前进/后退) ────────────────────────────────
// 十二地支顺序循环；同五行内 子→亥(进)? 用通行口诀: 寅→卯进,卯→寅退,巳→午进,申→酉进,亥→子进,丑辰未戌按序
const PROGRESS = { 寅:'卯', 卯:'寅', 巳:'午', 午:'巳', 申:'酉', 酉:'申', 亥:'子', 子:'亥',
                   辰:'未', 未:'戌', 戌:'丑', 丑:'辰' }; // 进神方向(土按辰未戌丑序)
function jinTui(fromBranch, toBranch) {
  if (PROGRESS[fromBranch] === toBranch) return '化进';
  if (PROGRESS[toBranch] === fromBranch) return '化退';
  return null;
}

// ─── 动爻化出关系 ────────────────────────────────────────────────────
function transformOf(benBranch, bianBranch, gz) {
  const benWx = DIZHI_WUXING[benBranch], bianWx = DIZHI_WUXING[bianBranch];
  const tags = [];
  if (benWx === bianWx) {
    const jt = jinTui(benBranch, bianBranch);
    if (jt) tags.push(jt); else tags.push('伏吟/同五行');
  } else if (SHENG[bianWx] === benWx) tags.push('回头生'); // 变生本
  else if (KE[bianWx] === benWx)      tags.push('回头克'); // 变克本
  else if (SHENG[benWx] === bianWx)   tags.push('化泄');   // 本生变
  else if (KE[benWx] === bianWx)      tags.push('化克出');  // 本克变
  if (gz.xunKong.includes(bianBranch)) tags.push('化空');
  return tags;
}

// 某动爻对某目标五行的直接生克
function actionOn(srcWx, tgtWx) {
  if (srcWx === tgtWx)        return '比和';
  if (SHENG[srcWx] === tgtWx) return '生';
  if (KE[srcWx] === tgtWx)    return '克';
  if (SHENG[tgtWx] === srcWx) return '泄(被生)';
  return '耗(被克)';
}

// ─── 用神关键词猜测 (可选, code-side primaryGuess) ──────────────────
const TOPIC_RULES = [
  [/财|钱|money|生意|价格|买|卖|投资|薪|工资|股|赚/, '妻财', '求财/生意'],
  [/工作|事业|职|官|升|考试|功名|名次|录取|诉讼|官司|丈夫|老公|男友|对象(?!.*女)/, '官鬼', '事业/功名/官司'],
  [/房|车|文书|证|合同|学业|学历|论文|父母|长辈|妈|爸|考研|offer/, '父母', '文书/房屋/长辈'],
  [/孩子|子女|儿|女儿|下属|平安|病|医|药|健康|宠物|猫|狗|怀孕|生育/, '子孙', '子女/健康/平安'],
  [/兄弟|姐妹|朋友|同事|同辈|竞争|对手|合伙/, '兄弟', '兄弟/朋友/竞争'],
];
function guessYongShen(text) {
  if (!text) return null;
  for (const [re, lq, topic] of TOPIC_RULES) if (re.test(text)) return { yongShen: lq, topic };
  return null; // 默认综合 → 世爻, 由 AI 定
}

// ════════════════════════════════════════════════════════════════════
//  主入口: 由 sums[] (6/7/8/9, index0=初爻) + 起卦时间 → 喂AI的JSON
// ════════════════════════════════════════════════════════════════════
function buildNajia(sums, castDate, questionText) {
  const isYang   = s => s === 7 || s === 9;
  const isMoving = s => s === 6 || s === 9;

  const ben    = sums.map(s => isYang(s) ? 1 : 0);
  const moving = sums.map((s, i) => isMoving(s) ? i : -1).filter(i => i >= 0);
  const bian   = ben.slice();
  for (const i of moving) bian[i] ^= 1;

  const benName  = hexName(ben);
  const bianName = hexName(bian);
  const hasMoving = moving.length > 0;

  const palInfo = PALACE_TABLE[benName];
  const gongWx  = palInfo.palaceWuxing;

  const gz = buildGanzhi(castDate);
  const benDizhi  = attachDizhi(ben);
  const bianDizhi = attachDizhi(bian);
  const godStart  = sixGodStart(gz.dayStem);

  // 六爻装卦
  const yao = [];
  for (let i = 0; i < 6; i++) {
    const dz = benDizhi[i], wx = DIZHI_WUXING[dz];
    const mv = moving.includes(i);
    const st = strengthOf(wx, dz, gz, mv);
    yao.push({
      pos: i + 1,
      yaoZh: YAO_ZH[i] + '爻',
      state: { 9:'O', 7:'o', 8:'e', 6:'X' }[sums[i]],
      yinYang: isYang(sums[i]) ? '阳' : '阴',
      dizhi: dz,
      wuxing: wx,
      liuQin: liuQin(wx, gongWx),
      liuShen: SIX_GODS[(godStart + i) % 6],
      isShi: palInfo.worldLine === i + 1,
      isYing: palInfo.responseLine === i + 1,
      moving: mv,
      bianTo: mv ? (bianDizhi[i] + DIZHI_WUXING[bianDizhi[i]]) : null,
      strength: st.strength,
      wangXiang: st.wangXiang,   // 月令旺相休囚死
      xunKong: st.xunKong,
      yuePo: st.yuePo,
      linRi: st.linRi,
      linYue: st.linYue,
      yueWari: st.dayRelation,
      flags: st.flags,
    });
  }

  // 动爻明细
  const movingYao = moving.map(i => {
    const benBr = benDizhi[i], bianBr = bianDizhi[i];
    return {
      pos: i + 1,
      yaoZh: YAO_ZH[i] + '爻',
      liuQin: yao[i].liuQin,
      dizhi: benBr,
      wuxing: DIZHI_WUXING[benBr],
      bianTo: bianBr + DIZHI_WUXING[bianBr],
      transform: transformOf(benBr, bianBr, gz),
    };
  });

  // 六亲分析: 对在卦六根爻出现的每个六亲，给出旺衰 + 受动爻作用 (AI据问题选用神)
  const liuQinAnalysis = {};
  for (const lq of ['父母','兄弟','子孙','妻财','官鬼']) {
    const atYao = yao.filter(y => y.liuQin === lq).map(y => y.pos);
    const present = atYao.length > 0;
    if (!present) { liuQinAnalysis[lq] = { present: false, note: '用神不上卦，主此事根基不实/需外求(伏神二期补)' }; continue; }
    // 取首现爻为主
    const primary = yao.find(y => y.liuQin === lq);
    const affectedBy = movingYao
      .filter(mv => mv.pos !== primary.pos)
      .map(mv => {
        const act = actionOn(mv.wuxing, primary.wuxing);
        if (act !== '生' && act !== '克' && act !== '比和') return null;
        return { from: `${mv.yaoZh}(${mv.liuQin}${mv.dizhi})动`, action: act };
      })
      .filter(Boolean);
    // 自身发动且回头生/克
    const selfMv = movingYao.find(mv => mv.pos === primary.pos);
    if (selfMv) {
      const t = selfMv.transform.filter(x => /回头|化进|化退|化空/.test(x));
      if (t.length) affectedBy.push({ from: '自身发动', action: t.join('、') });
    }
    liuQinAnalysis[lq] = {
      present: true,
      atYao,
      primaryYao: primary.pos,
      strength: primary.strength,
      wangXiang: primary.wangXiang,
      xunKong: primary.xunKong,
      yuePo: primary.yuePo,
      dayRelation: primary.yueWari,
      onShiYao: primary.isShi,
      affectedBy,
    };
  }

  const shiYao = yao.find(y => y.isShi);
  const guess = guessYongShen(questionText);

  return {
    question: { rawText: questionText || '', topicGuess: guess ? guess.topic : '综合(未指定→看世爻)', yongShenGuess: guess ? guess.yongShen : '世爻' },
    castTime: castDate.toISOString(),
    ganzhi: { year: gz.year, month: gz.month, day: gz.day, dayStem: gz.dayStem, dayBranch: gz.dayBranch, monthBranch: gz.monthBranch, monthWuxing: gz.monthWuxing, xunKong: gz.xunKong },
    benGua:  { name: benName, palace: palInfo.palace, palaceWuxing: gongWx, position: palInfo.position },
    bianGua: hasMoving ? { name: bianName } : null,
    shiYing: { shi: palInfo.worldLine, ying: palInfo.responseLine, shiLiuQin: shiYao.liuQin, shiDizhi: shiYao.dizhi, shiStrength: shiYao.strength },
    yao,
    movingYao,
    liuQinAnalysis,
    note: '用神由解读AI据所问从 liuQinAnalysis 选定(妻财/官鬼/父母/子孙/兄弟)或综合看世爻; 旺衰/生克均为代码算定的结论，AI 不得自行重推干支。',
  };
}

// ─── 把已算定的 JSON 格式化成喂给解读AI的文本块 ──────────────────────
function formatNajia(n) {
  const STATE_ZH = { O:'老阳·动', o:'少阳', e:'少阴', X:'老阴·动' };
  const L = [];
  L.push('【纳甲排盘 · 以下五行/干支结论均由代码算定，解读时直接采用，不得自行重推】');
  const ct = new Date(n.castTime);
  const pad = x => String(x).padStart(2, '0');
  L.push(`起卦：${ct.getFullYear()}-${pad(ct.getMonth()+1)}-${pad(ct.getDate())} ${pad(ct.getHours())}:${pad(ct.getMinutes())}  干支：${n.ganzhi.year}年 ${n.ganzhi.month}月 ${n.ganzhi.day}日  旬空：${n.ganzhi.xunKong.join('')}`);
  L.push(`本卦：${n.benGua.name}（${n.benGua.palace}宫·${n.benGua.position}·宫五行${n.benGua.palaceWuxing}）` + (n.bianGua ? `  →  变卦：${n.bianGua.name}` : '  （无动爻，卦静）'));
  const yz = ['初','二','三','四','五','上'];
  L.push(`世爻：${yz[n.shiYing.shi-1]}爻(${n.shiYing.shiLiuQin}·${n.shiYing.shiDizhi}${DIZHI_WUXING[n.shiYing.shiDizhi]})  应爻：${yz[n.shiYing.ying-1]}爻`);
  L.push('');
  L.push('六爻装卦（上→初）：');
  for (let i = 5; i >= 0; i--) {
    const y = n.yao[i];
    const mark = (y.isShi ? ' 【世】' : '') + (y.isYing ? ' 【应】' : '');
    const trans = y.bianTo ? `  化${y.bianTo}` : '';
    const fl = y.flags.length ? '·' + y.flags.join('·') : '';
    L.push(`  ${y.yaoZh} ${STATE_ZH[y.state]}  ${y.dizhi}${y.wuxing} ${y.liuQin} ${y.liuShen}${mark}  [月令${y.wangXiang}·${y.yueWari}·综合${y.strength}${fl}]${trans}`);
  }
  if (n.movingYao.length) {
    L.push('');
    L.push('动爻：');
    for (const m of n.movingYao)
      L.push(`  ${m.yaoZh} ${m.liuQin}${m.dizhi}${m.wuxing} 动 → 化${m.bianTo}（${m.transform.join('、')}）`);
  } else {
    L.push('');
    L.push('动爻：无（卦静，以世应、用神旺衰断）');
  }
  L.push('');
  L.push('六亲旺衰与受作用（用神=据所问之事从下面选，妻财=财/生意，官鬼=事业/功名/官司/丈夫，父母=文书/房屋/长辈，子孙=子女/健康/平安，兄弟=朋友/竞争；问综合或本人看世爻）：');
  for (const lq of ['妻财','官鬼','父母','子孙','兄弟']) {
    const a = n.liuQinAnalysis[lq];
    if (!a.present) { L.push(`  ${lq}：不上卦 → ${a.note}`); continue; }
    const aff = a.affectedBy.length ? '；受作用：' + a.affectedBy.map(x => `${x.from}→${x.action}`).join('，') : '；无动爻直接作用';
    const fl = (a.yuePo ? '·月破' : '') + (a.xunKong ? '·旬空' : '');
    L.push(`  ${lq}：现于${a.atYao.join('/')}爻，主看${a.primaryYao}爻，[月令${a.wangXiang}·${a.dayRelation}·综合${a.strength}${fl}]${a.onShiYao ? '·临世' : ''}${aff}`);
  }
  L.push('');
  L.push('【判读优先级】以纳甲结论为主干定吉凶方向（用神旺相得生/临日为吉，受克/旬空/无气为忧，动爻回头生为先难后易，回头克为先吉后凶）；爻辞仅作意象润色，不得用爻辞推翻纳甲结论。');
  return L.join('\n');
}

// node 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildNajia, formatNajia, PALACE_TABLE, attachDizhi, hexName, buildGanzhi, dayGanzhiIndex, gzName, jdn, wangXiang, isYuePo, strengthOf };
}
