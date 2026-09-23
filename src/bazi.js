import lunar from "lunar-javascript";
const { Solar, Lunar, LunarUtil } = lunar;

export const MIN_YEAR = 1801;
export const MAX_YEAR = 2100;

// The library ships chs/en only, so every output string goes through this table.
const CHT = {
  财: "財", 伤: "傷", 杀: "殺", 长: "長", 带: "帶", 临: "臨", 绝: "絕", 养: "養",
  炉: "爐", 剑: "劍", 锋: "鋒", 头: "頭", 涧: "澗", 蜡: "蠟", 杨: "楊", 雳: "靂",
  灯: "燈", 驿: "驛", 钗: "釵", 钏: "釧", 惊: "驚", 蛰: "蟄", 种: "種",
};
export const SIMPLIFIED = Object.keys(CHT).join("");
export const t = (s) => String(s).replace(/./gu, (c) => CHT[c] ?? c);

export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new RangeError("請輸入有效日期。");
  const [year, month, day] = value.split("-").map(Number);
  if (
    year < MIN_YEAR ||
    year > MAX_YEAR ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate()
  ) {
    throw new RangeError(`日期範圍為 ${MIN_YEAR}–${MAX_YEAR} 年。`);
  }
  return { year, month, day };
}

export function parseTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match || match[1] > 23 || match[2] > 59)
    throw new RangeError("請輸入有效時間。");
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

const GAN = "甲乙丙丁戊己庚辛壬癸";
const LU = "寅卯巳午巳午申酉亥子"; // 十干祿；陽干之刃、陰干之劫即同五行另一干之祿

// 《子平真詮》月令取格：祿刃先論；否則月支藏干依本、中、餘氣取透干者，
// 皆不透取本氣，比劫不成格。stems 為年、月、時干。
// ponytail: 只論正格，不判從格、化氣、專旺等外格（需旺衰評分，各派不同）。
export function geJu(dayGan, monthZhi, stems) {
  const i = GAN.indexOf(dayGan);
  if (monthZhi === LU[i]) return "建祿格";
  if (monthZhi === LU[i ^ 1]) return i % 2 ? "月劫格" : "陽刃格";
  const hidden = LunarUtil.ZHI_HIDE_GAN[monthZhi]
    .map((gan) => ({ gan, shiShen: t(LunarUtil.SHI_SHEN[dayGan + gan]) }))
    .filter((h) => h.shiShen !== "比肩" && h.shiShen !== "劫財");
  return (hidden.find((h) => stems.includes(h.gan)) ?? hidden[0]).shiShen + "格";
}

const ZHI = "子丑寅卯辰巳午未申酉戌亥";
const RELATIONS = ["同我", "我生", "我剋", "剋我", "生我"]; // 依相生序，自日主五行起

// 十神對照：列為五行生剋，欄為與日主陰陽同、異。地支依本氣歸入。
export function shiShenTable(dayGan) {
  const d = GAN.indexOf(dayGan);
  return RELATIONS.map((relation, k) => {
    const e = ((d >> 1) + k) % 5;
    return {
      relation,
      element: "木火土金水"[e],
      cells: [d % 2, 1 - (d % 2)].map((p) => {
        const gan = GAN[2 * e + p];
        return {
          gan,
          zhi: [...ZHI].filter((z) => LunarUtil.ZHI_HIDE_GAN[z][0] === gan).join(""),
          shiShen: t(LunarUtil.SHI_SHEN[dayGan + gan]),
        };
      }),
    };
  });
}

const JIE = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "XIAO_HAN"];

// 流月：流年 year 的十二月，各自該月之節起（寅月立春起，丑月為次年小寒）。
// 月柱干支每年推進十二位，(year - 4) * 12 + 2 為該年寅月於六十甲子之序。
export function liuYue(year) {
  const table = Lunar.fromYmd(year, 6, 1).getJieQiTable();
  return JIE.map((key, i) => {
    const k = ((year - 4) * 12 + 2 + i) % 60;
    const [date, time] = table[key].toYmdHms().split(" ");
    return {
      ganZhi: GAN[k % 10] + ZHI[k % 12],
      jie: key === "XIAO_HAN" ? "小寒" : t(key),
      date,
      time: time.slice(0, 5),
    };
  });
}

const ganRelations = (a, b) => {
  const d = Math.abs(GAN.indexOf(a) - GAN.indexOf(b));
  return d === 5 ? ["合"] : d === 6 ? ["沖"] : []; // 甲己合、甲庚沖，戊己不沖
};

// 六合 i+j≡1、六害 i+j≡7、六沖差 6；三合局 i≡j (mod 4)，含子午卯酉者為半合（生墓拱合不計）。
function zhiRelations(a, b) {
  const i = ZHI.indexOf(a), j = ZHI.indexOf(b);
  const xing =
    a === b ? "辰午酉亥".includes(a) : ["寅巳申", "丑戌未", "子卯"].some((s) => s.includes(a) && s.includes(b));
  return [
    [(i + j) % 12 === 1, "合"],
    [i !== j && i % 4 === j % 4 && (i % 3 === 0 || j % 3 === 0), "半合"],
    [Math.abs(i - j) === 6, "沖"],
    [xing, "刑"],
    [(i + j) % 12 === 7, "害"],
  ].flatMap(([hit, name]) => (hit ? [name] : []));
}

const ROWS = [
  ["天干合", "gan", ganRelations, "合"],
  ["天干沖", "gan", ganRelations, "沖"],
  ["六合", "zhi", zhiRelations, "合"],
  ["半合", "zhi", zhiRelations, "半合"],
  ["六沖", "zhi", zhiRelations, "沖"],
  ["相刑", "zhi", zhiRelations, "刑"],
  ["六害", "zhi", zhiRelations, "害"],
];

// 合沖刑害對照：每柱列出與其干或支合、沖、刑、害者，供流年、流月查表。
export const relationTable = (pillars) =>
  ROWS.map(([name, key, relations, r]) => ({
    name,
    cells: pillars.map((p) =>
      [...(key === "gan" ? GAN : ZHI)].filter((x) => relations(x, p[key]).includes(r)).join(""),
    ),
  }));

const LABELS = { Year: "年柱", Month: "月柱", Day: "日柱", Time: "時柱" };

export function chart({ date, time, male, sect }) {
  const { year, month, day } = parseDate(date);
  const { hour, minute } = parseTime(time);
  const ec = Solar.fromYmdHms(year, month, day, hour, minute, 0)
    .getLunar()
    .getEightChar();
  ec.setSect(sect);

  const pillars = Object.entries(LABELS).map(([key, label]) => {
    const get = (name) => ec[`get${key}${name}`]();
    const shiShenZhi = get("ShiShenZhi");
    return {
      label,
      gan: get("Gan"),
      zhi: get("Zhi"),
      shiShenGan: t(get("ShiShenGan")),
      hideGan: get("HideGan").map((gan, i) => ({ gan, shiShen: t(shiShenZhi[i]) })),
      naYin: t(get("NaYin")),
      diShi: t(get("DiShi")),
      xunKong: get("XunKong"),
    };
  });

  const palace = (name) => ({
    ganZhi: ec[`get${name}`](),
    naYin: t(ec[`get${name}NaYin`]()),
  });

  const yun = ec.getYun(male ? 1 : 0);
  const [y, m, d, h] = pillars;
  return {
    pillars,
    geJu: geJu(d.gan, m.zhi, [y.gan, m.gan, h.gan]),
    shiShenTable: shiShenTable(d.gan),
    relationTable: relationTable(pillars),
    extra: {
      taiYuan: palace("TaiYuan"),
      mingGong: palace("MingGong"),
      shenGong: palace("ShenGong"),
    },
    yun: {
      forward: yun.isForward(),
      startYear: yun.getStartYear(),
      startMonth: yun.getStartMonth(),
      startDay: yun.getStartDay(),
      startDate: yun.getStartSolar().toYmd(),
      // Index 0 is the stretch before the first 大運 and has an empty 干支.
      daYun: yun.getDaYun().map((d) => ({
        ganZhi: d.getGanZhi(),
        startAge: d.getStartAge(),
        endAge: d.getEndAge(),
        startYear: d.getStartYear(),
        endYear: d.getEndYear(),
        liuNian: d.getLiuNian().map((n) => ({
          year: n.getYear(),
          age: n.getAge(),
          ganZhi: n.getGanZhi(),
        })),
      })),
    },
  };
}
