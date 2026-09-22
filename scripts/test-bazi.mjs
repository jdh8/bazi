import test from "node:test";
import assert from "node:assert/strict";
import lunar from "lunar-javascript";
import { chart, t, SIMPLIFIED } from "../src/bazi.js";

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

test("輸入驗證", () => {
  assert.throws(() => chart({ date: "1800-12-31", time: "00:00", male: true, sect: 2 }), RangeError);
  assert.throws(() => chart({ date: "2023-02-29", time: "00:00", male: true, sect: 2 }), RangeError);
  assert.throws(() => chart({ date: "2023-02-28", time: "24:00", male: true, sect: 2 }), RangeError);
});
