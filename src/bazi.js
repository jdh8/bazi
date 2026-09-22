import lunar from "lunar-javascript";
const { Solar, LunarUtil } = lunar;

export const MIN_YEAR = 1801;
export const MAX_YEAR = 2100;

// The library ships chs/en only, so every output string goes through this table.
const CHT = {
  财: "財", 伤: "傷", 杀: "殺", 长: "長", 带: "帶", 临: "臨", 绝: "絕", 养: "養",
  炉: "爐", 剑: "劍", 锋: "鋒", 头: "頭", 涧: "澗", 蜡: "蠟", 杨: "楊", 雳: "靂",
  灯: "燈", 驿: "驛", 钗: "釵", 钏: "釧",
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
