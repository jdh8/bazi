import { chart, liuYue } from "./bazi.js";

const $ = (selector) => document.querySelector(selector);
const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const ELEMENTS = {
  wood: "木甲乙寅卯",
  fire: "火丙丁巳午",
  earth: "土戊己辰戌丑未",
  metal: "金庚辛申酉",
  water: "水壬癸亥子",
};
const elementOf = (c) => Object.keys(ELEMENTS).find((k) => ELEMENTS[k].includes(c));
// Escape, then wrap each 干支 or 五行 glyph in its 五行 class.
const wx = (text) =>
  escape(text).replace(/./gu, (c) => {
    const element = elementOf(c);
    return element ? `<span class="${element}">${c}</span>` : c;
  });

// 五行圖：rows 依相生序，日主五行居上，順時針相生，隔一相剋。
function wuXingGraph(rows) {
  const R = 70, r = 18;
  const at = (k, radius = R) => {
    const a = ((k * 72 - 90) * Math.PI) / 180;
    return [radius * Math.cos(a), radius * Math.sin(a)].map((v) => v.toFixed(1));
  };
  const edge = (k, step, cls) => {
    const [x1, y1] = at(k), [x2, y2] = at(k + step);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const dx = ((x2 - x1) / len) * (r + 3), dy = ((y2 - y1) / len) * (r + 3);
    return `<line class="${cls}" x1="${x1 - -dx}" y1="${y1 - -dy}" x2="${x2 - dx}" y2="${y2 - dy}" marker-end="url(#arrow)"/>`;
  };
  return `
    <figure class="wuxing">
      <svg viewBox="-125 -118 250 216" role="img" aria-label="五行生剋圖">
        <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z"/></marker></defs>
        ${rows.map((_, k) => edge(k, 1, "sheng") + edge(k, 2, "ke")).join("")}
        ${rows
          .map((row, k) => {
            const [x, y] = at(k), [lx, ly] = at(k, R + 34);
            return `<g class="${elementOf(row.element)}"><circle cx="${x}" cy="${y}" r="${r}"/><text x="${x}" y="${y}">${row.element}</text></g><text class="relation" x="${lx}" y="${ly}">${row.relation}</text>`;
          })
          .join("")}
      </svg>
      <figcaption>實線相生，虛線相剋</figcaption>
    </figure>`;
}
// 日期連到萬年曆（jdh8/calendar），範圍外不連。
const CALENDAR = "https://jdh8.github.io/calendar/";
const day = (date, text = date) =>
  date.slice(0, 4) <= "2100"
    ? `<a href="${CALENDAR}?date=${date}" target="_blank" rel="noopener">${text}</a>`
    : text;
const form = $("#form");
const thisYear = new Date().getFullYear();

// Form field names double as URL params: ?t=1988-02-15T23:30&g=m&z=1&y=2026
for (const [key, value] of new URL(location.href).searchParams)
  if (form.elements[key]) form.elements[key].value = value;

const row = (name, pillars, cell) =>
  `<tr><th scope="row">${name}</th>${pillars
    .map((p, i) => `<td${i === 2 ? ' class="day-master"' : ""}>${cell(p)}</td>`)
    .join("")}</tr>`;

function render(c, year) {
  const { pillars, extra, yun } = c;
  const palace = (name, p) =>
    `<span><b>${name}</b> ${wx(p.ganZhi)}（${escape(p.naYin)}）</span>`;
  return `
    <div class="table-scroll">
      <table class="pillars">
        <thead><tr><td></td>${pillars.map((p) => `<th scope="col">${p.label}</th>`).join("")}</tr></thead>
        <tbody>
          ${row("十神", pillars, (p) => escape(p.shiShenGan))}
          ${row("天干", pillars, (p) => `<span class="glyph">${wx(p.gan)}</span>`)}
          ${row("地支", pillars, (p) => `<span class="glyph">${wx(p.zhi)}</span>`)}
          ${row("藏干", pillars, (p) =>
            p.hideGan.map((h) => `<div>${wx(h.gan)} <small>${escape(h.shiShen)}</small></div>`).join(""),
          )}
          ${row("納音", pillars, (p) => escape(p.naYin))}
          ${row("長生", pillars, (p) => escape(p.diShi))}
          ${row("空亡", pillars, (p) => wx(p.xunKong))}
        </tbody>
      </table>
    </div>
    <p class="palaces">
      <span><b>格局</b> <strong>${escape(c.geJu)}</strong></span>${palace("胎元", extra.taiYuan)}${palace("命宮", extra.mingGong)}${palace("身宮", extra.shenGong)}
    </p>
    <h2>十神</h2>
    <div class="shishen-wrap">
    <div class="table-scroll">
      <table class="pillars shishen">
        <thead><tr><td></td><th scope="col">陰陽同</th><th scope="col">陰陽異</th></tr></thead>
        <tbody>
          ${c.shiShenTable
            .map(
              (r) => `<tr><th scope="row">${r.relation}${wx(r.element)}</th>${r.cells
                .map((x) => `<td><b>${escape(x.shiShen)}</b> ${wx(x.gan + x.zhi)}</td>`)
                .join("")}</tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    ${wuXingGraph(c.shiShenTable)}
    </div>
    <h2>合沖刑害</h2>
    <p>流年、流月的干或支出現在某格，即與該柱有此關係；大運同理。與某柱干支全同為伏吟，干支皆沖為反吟。</p>
    <div class="table-scroll">
      <table class="pillars">
        <thead><tr><td></td>${pillars.map((p) => `<th scope="col">${p.label}</th>`).join("")}</tr></thead>
        <tbody>${c.relationTable.map((r) => row(r.name, r.cells, wx)).join("")}</tbody>
      </table>
    </div>
    <h2>大運</h2>
    <p>出生後 ${yun.startYear} 年 ${yun.startMonth} 個月 ${yun.startDay} 天起運（${day(yun.startDate)}），大運${yun.forward ? "順" : "逆"}行。年齡為虛歲。點選流年看流月，流月日期連到萬年曆。</p>
    ${yun.daYun
      .map(
        (d) => `
      <details class="dayun"${d.startYear <= year && year <= d.endYear ? " open" : ""}>
        <summary><span class="glyph">${wx(d.ganZhi) || "起運前"}</span>　${d.startAge}–${d.endAge} 歲　${d.startYear}–${d.endYear}</summary>
        <ol class="liunian">
          ${d.liuNian
            .map(
              (n) =>
                `<li><button type="button" data-year="${n.year}"${n.year === year ? ' aria-current="true"' : ""}><b>${n.year}</b> ${wx(n.ganZhi)} <small>${n.age} 歲</small></button></li>`,
            )
            .join("")}
        </ol>
        ${
          d.startYear <= year && year <= d.endYear
            ? `<ol class="liuyue" aria-label="${year} 年流月">${liuYue(year)
                .map((m) => `<li><b>${wx(m.ganZhi)}</b> ${m.jie} <small>${day(m.date, m.date.slice(5).replace("-", "/"))} ${m.time}</small></li>`)
                .join("")}</ol>`
            : ""
        }
      </details>`,
      )
      .join("")}`;
}

function update() {
  const data = new FormData(form);
  history.replaceState(null, "", `?${new URLSearchParams(data)}`);
  $("#status").textContent = "";
  $("#output").innerHTML = "";
  if (!data.get("t")) return;
  const [date, time] = data.get("t").split("T");
  try {
    $("#output").innerHTML = render(
      chart({
        date,
        time,
        male: data.get("g") === "m",
        sect: Number(data.get("z")),
      }),
      Number(data.get("y")) || thisYear,
    );
  } catch (error) {
    $("#status").textContent = error.message;
  }
}

form.addEventListener("input", update);
$("#output").addEventListener("click", (event) => {
  const year = event.target.closest("[data-year]")?.dataset.year;
  if (!year) return;
  form.elements.y.value = year;
  update();
  $(`[data-year="${year}"]`).focus();
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  update();
});
update();
