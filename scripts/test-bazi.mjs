import test from "node:test";
import assert from "node:assert/strict";
import lunar from "lunar-javascript";
import { chart, geJu, liuYue, relationTable, shiShenTable, t, SIMPLIFIED } from "../src/bazi.js";

// Known answers from lunar-javascript's own __tests__/EightChar.test.js and Yun.test.js.
const ganZhi = (c) => c.pillars.map((p) => p.gan + p.zhi).join(" ");

test("四柱、藏干、十神", () => {
  const c = chart({ date: "2005-12-23", time: "08:37", male: true, sect: 2 });
  assert.equal(ganZhi(c), "乙酉 戊子 辛巳 壬辰");
  assert.deepEqual(c.pillars[2].hideGan.map((h) => h.gan), ["丙", "庚", "戊"]);
  assert.equal(c.pillars[0].shiShenGan, "偏財");
  assert.equal(c.pillars[2].shiShenGan, "日主");
});

test("子時切換", () => {
  const input = { date: "1988-02-15", time: "23:30", male: true };
  assert.equal(ganZhi(chart({ ...input, sect: 2 })).split(" ")[2], "庚子");
  assert.equal(ganZhi(chart({ ...input, sect: 1 })).split(" ")[2], "辛丑");
});

test("起運", () => {
  const m = chart({ date: "2022-03-09", time: "20:51", male: true, sect: 2 });
  assert.equal(m.yun.startDate, "2030-12-19");
  const f = chart({ date: "1981-01-29", time: "23:37", male: false, sect: 2 });
  assert.deepEqual([f.yun.startYear, f.yun.startMonth, f.yun.startDay], [8, 0, 20]);
});

test("繁體轉換涵蓋庫的全部納音、十神、長生", () => {
  let solar = lunar.Solar.fromYmd(2000, 1, 1);
  const naYin = new Set();
  for (let i = 0; i < 60; i++, solar = solar.next(1))
    naYin.add(solar.getLunar().getEightChar().getDayNaYin());
  const all = [...naYin, ...Object.values(lunar.LunarUtil.SHI_SHEN), ...lunar.LunarUtil.CHANG_SHENG];
  assert.equal(naYin.size, 30);
  // Every non-ASCII char the library can emit here is either shared or in the table.
  const leftover = [...new Set(all.map(t).join(""))].filter((c) => /\P{ASCII}/u.test(c));
  assert.equal(
    leftover.join(""),
    "天上火石榴木大海水中金爐林路旁土劍鋒山頭澗下城白蠟楊柳泉屋霹靂松柏長流沙平地壁箔覆燈河驛釵釧桑柘溪比肩劫財食神傷官偏正七殺印生沐浴冠帶臨帝旺衰病死墓絕胎養",
  );
});

test("輸出不含簡體", () => {
  for (const [date, time] of [["2005-12-23", "08:37"], ["1981-01-29", "23:37"], ["2100-12-31", "12:00"]]) {
    const json = JSON.stringify(chart({ date, time, male: false, sect: 1 }));
    assert.doesNotMatch(json, new RegExp(`[${SIMPLIFIED}]`));
  }
});

test("格局", () => {
  // 祿刃：土隨火
  for (const [gan, zhi, name] of [
    ["甲", "寅", "建祿格"], ["甲", "卯", "陽刃格"], ["乙", "寅", "月劫格"], ["乙", "卯", "建祿格"],
    ["戊", "巳", "建祿格"], ["戊", "午", "陽刃格"], ["己", "巳", "月劫格"], ["己", "午", "建祿格"],
  ])
    assert.equal(geJu(gan, zhi, ["丙", "丙", "丙"]).name, name, gan + zhi);
  // 庚日寅月藏甲丙戊：本氣透 > 中氣透 > 皆不透取本氣
  assert.equal(geJu("庚", "寅", ["戊", "甲", "丙"]).name, "偏財格");
  assert.equal(geJu("庚", "寅", ["壬", "丙", "壬"]).name, "七殺格");
  assert.equal(geJu("庚", "寅", ["壬", "壬", "壬"]).name, "偏財格");
  // 戊日辰月藏戊乙癸：本氣比肩不成格
  assert.equal(geJu("戊", "辰", ["甲", "丙", "癸"]).name, "正財格");
  assert.equal(geJu("戊", "辰", ["甲", "丙", "丙"]).name, "正官格");
  // 推導過程
  assert.deepEqual(geJu("戊", "辰", ["甲", "丙", "癸"]).steps, [
    "月令辰非日主戊之祿（巳）、刃（午）",
    "辰藏戊比肩（本氣，比劫不成格）、乙正官（中氣）、癸正財（餘氣）",
    "年、月、時干為甲、丙、癸：癸透 → 正財格",
  ]);
  assert.deepEqual(geJu("庚", "寅", ["戊", "甲", "丙"]).steps.at(-1), "年、月、時干為戊、甲、丙：甲、丙、戊皆透，依本、中、餘氣之序取甲 → 偏財格");
  assert.deepEqual(geJu("庚", "寅", ["壬", "壬", "壬"]).steps.at(-1), "年、月、時干為壬、壬、壬：皆不透，取本氣甲 → 偏財格");
  assert.deepEqual(geJu("乙", "寅", []).steps, ["月令寅為日主乙之劫"]);
  // 經 chart()
  assert.equal(chart({ date: "2005-12-23", time: "08:37", male: true, sect: 2 }).geJu.name, "食神格");
  assert.equal(chart({ date: "1988-02-15", time: "23:30", male: true, sect: 2 }).geJu.name, "偏財格");
});

test("輸入驗證", () => {
  assert.throws(() => chart({ date: "1800-12-31", time: "00:00", male: true, sect: 2 }), RangeError);
  assert.throws(() => chart({ date: "2023-02-29", time: "00:00", male: true, sect: 2 }), RangeError);
  assert.throws(() => chart({ date: "2023-02-28", time: "24:00", male: true, sect: 2 }), RangeError);
});

test("十神對照", () => {
  const row = (dayGan) =>
    shiShenTable(dayGan).map((r) => r.relation + r.element + r.cells.map((c) => c.shiShen + c.gan + c.zhi).join(""));
  assert.deepEqual(row("甲"), [
    "同我木比肩甲寅劫財乙卯",
    "我生火食神丙巳傷官丁午",
    "我剋土偏財戊辰戌正財己丑未",
    "剋我金七殺庚申正官辛酉",
    "生我水偏印壬亥正印癸子",
  ]);
  assert.equal(row("癸")[3], "剋我土七殺己丑未正官戊辰戌");
});

test("流月", () => {
  // 干支與庫的 LiuYue 一致，涵蓋十干年
  const ec = lunar.Solar.fromYmd(1988, 2, 15).getLunar().getEightChar();
  for (const d of ec.getYun(1).getDaYun().slice(1, 3))
    for (const n of d.getLiuNian())
      assert.deepEqual(liuYue(n.getYear()).map((m) => m.ganZhi), n.getLiuYue().map((m) => m.getGanZhi()));
  // 節起日：日本國立天文台 2014 年表
  assert.deepEqual(
    liuYue(2014).map((m) => m.jie + m.date.slice(5)),
    ["立春02-04", "驚蟄03-06", "清明04-05", "立夏05-05", "芒種06-06", "小暑07-07",
     "立秋08-07", "白露09-08", "寒露10-08", "立冬11-07", "大雪12-07", "小寒01-06"],
  );
  assert.equal(liuYue(2014)[11].date, "2015-01-06");
});

test("合沖刑害對照", () => {
  const pillars = ["戊辰", "甲寅", "辛丑", "戊子"].map(([gan, zhi]) => ({ gan, zhi }));
  assert.deepEqual(
    relationTable(pillars).map((r) => r.name + " " + r.cells.join(" ")),
    [
      "天干合 癸 己 丙 癸",
      "天干沖  庚 乙 ", // 戊己不沖
      "六合 酉 亥 子 丑",
      "半合 子 午 酉 辰申", // 申辰拱合不計
      "六沖 戌 申 未 午",
      "相刑 辰 巳申 未戌 卯", // 辰自刑
      "六害 卯 巳 午 未",
    ],
  );
});
