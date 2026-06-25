const { buildNajia, PALACE_TABLE, attachDizhi, hexName, buildGanzhi, wangXiang, isYuePo } = require('./najia.js');

let pass = 0, fail = 0;
function eq(label, got, exp) {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { pass++; console.log('  ✓', label); }
  else { fail++; console.log('  ✗', label, '\n      got', g, '\n      exp', e); }
}

console.log('— 锚点1: 风天小畜 = 巽宫一世, 世初应四, 本宫五行木 —');
const xc = PALACE_TABLE['风天小畜'];
eq('小畜.palace', xc.palace, '巽');
eq('小畜.position', xc.position, '一世');
eq('小畜.palaceWuxing', xc.palaceWuxing, '木');
eq('小畜.world', xc.worldLine, 1);
eq('小畜.resp', xc.responseLine, 4);

console.log('— 锚点2: 乾为天 = 乾宫八纯, 世上应三, 纳支 子寅辰午申戌 —');
const qt = PALACE_TABLE['乾为天'];
eq('乾.palace', qt.palace, '乾');
eq('乾.position', qt.position, '本宫');
eq('乾.world', qt.worldLine, 6);
eq('乾.resp', qt.responseLine, 3);
eq('乾.纳支', attachDizhi([1,1,1,1,1,1]), ['子','寅','辰','午','申','戌']);

console.log('— 锚点3: 游魂/归魂 (最易错) —');
// 乾宫: 游魂=火地晋, 归魂=火天大有
eq('火地晋=乾宫游魂', [PALACE_TABLE['火地晋'].palace, PALACE_TABLE['火地晋'].position], ['乾','游魂']);
eq('火天大有=乾宫归魂', [PALACE_TABLE['火天大有'].palace, PALACE_TABLE['火天大有'].position], ['乾','归魂']);
// 坎宫: 游魂=地水师, 归魂=水地比? 校验
eq('坎宫游魂', PALACE_TABLE[Object.keys(PALACE_TABLE).find(k=>PALACE_TABLE[k].palace==='坎'&&PALACE_TABLE[k].position==='游魂')].position, '游魂');
eq('地火明夷=坎宫游魂', [PALACE_TABLE['地火明夷'].palace, PALACE_TABLE['地火明夷'].position], ['坎','游魂']);
eq('地水师=坎宫归魂', [PALACE_TABLE['地水师'].palace, PALACE_TABLE['地水师'].position], ['坎','归魂']);
// 震宫: 游魂=泽风大过? 实际震宫游魂=泽雷随? 用通行表: 震宫=震豫解恒升井大过随
eq('泽风大过=震宫游魂', [PALACE_TABLE['泽风大过'].palace, PALACE_TABLE['泽风大过'].position], ['震','游魂']);
eq('泽雷随=震宫归魂', [PALACE_TABLE['泽雷随'].palace, PALACE_TABLE['泽雷随'].position], ['震','归魂']);

console.log('— 八宫表完整性: 64卦无重复无遗漏 —');
eq('卦数=64', Object.keys(PALACE_TABLE).length, 64);

console.log('— 干支历: 2026-06-25 → 庚午日(经3锚点校验), 旬空戌亥 —');
const gz = buildGanzhi(new Date('2026-06-25T14:30:00+08:00'));
eq('day=庚午', gz.day, '庚午');
eq('year=丙午', gz.year, '丙午');
eq('month=甲午', gz.month, '甲午');
eq('xunKong=戌亥', gz.xunKong, ['戌','亥']);

console.log('— 二期: 月令旺相休囚死 (午月=火令) —');
eq('火当令=旺', wangXiang('火','火'), '旺');
eq('火生土=相', wangXiang('火','土'), '相');
eq('木生火→木休', wangXiang('火','木'), '休');
eq('水克火→水囚', wangXiang('火','水'), '囚');
eq('火克金→金死', wangXiang('火','金'), '死');
// 子月=水令 再验一组
eq('水当令=旺', wangXiang('水','水'), '旺');
eq('土在子月=囚(土克水)', wangXiang('水','土'), '囚');
eq('金在子月=休(金生水)', wangXiang('水','金'), '休');

console.log('— 二期: 月破 (爻支冲月建) —');
eq('子冲午→月破', isYuePo('子','午'), true);
eq('丑非冲午', isYuePo('丑','午'), false);
eq('辰冲戌→月破', isYuePo('辰','戌'), true);

console.log('— 端到端: 文档示例卦(风天小畜→乾为天, 六四动) —');
// 小畜: 下乾上巽 → bits初..上 = 1,1,1,0,1,1 → sums: 阳=7, 六四(idx3)动阴=6
// 小畜上卦巽=011(初二三对应内卦),实际bits[3,4,5]=巽? 巽下乾上... 风天小畜=巽上乾下
// 乾下=111(idx0-2), 巽上=011(idx3-5): bits=[1,1,1,0,1,1]; 六四动: idx3 是阴(0)→老阴X(6)
const sums = [7,7,7,6,7,7]; // 初二三少阳, 四老阴动, 五上少阳
const res = buildNajia(sums, new Date('2026-06-25T14:30:00+08:00'), '今年能不能升职');
eq('本卦=风天小畜', res.benGua.name, '风天小畜');
eq('本卦宫=巽', res.benGua.palace, '巽');
eq('世爻=初', res.shiYing.shi, 1);
eq('应爻=四', res.shiYing.ying, 4);
eq('动爻只有四爻', res.movingYao.map(m=>m.pos), [4]);
eq('问题猜测=官鬼(升职)', res.question.yongShenGuess, '官鬼');
// 二期旺衰: 庚午日 甲午月(午月火令)
eq('四爻未土在午月=相', res.yao[3].wangXiang, '相');             // 火生土
eq('初爻子水世在午月=囚', res.yao[0].wangXiang, '囚');           // 水克火
eq('初爻子水临午日午月→子午冲=月破', res.yao[0].yuePo, true);    // 子冲午
eq('初爻世爻受冲破→弱', res.yao[0].strength, '弱');
console.log('  四爻妻财:', res.yao[3].wangXiang, res.yao[3].strength, res.yao[3].flags);
console.log('  初爻世爻:', res.yao[0].wangXiang, res.yao[0].strength, res.yao[0].flags);
console.log('  变卦:', res.bianGua && res.bianGua.name);
console.log('  四爻六亲:', res.yao[3].liuQin, '化:', res.movingYao[0].transform);
console.log('  官鬼分析:', JSON.stringify(res.liuQinAnalysis['官鬼']));

console.log(`\n结果: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
