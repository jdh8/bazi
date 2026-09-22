import { chart } from "./bazi.js";

const $ = (selector) => document.querySelector(selector);
const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const form = $("#form");
const thisYear = new Date().getFullYear();

// Form field names double as URL params: ?t=1988-02-15T23:30&g=m&z=1
for (const [key, value] of new URL(location.href).searchParams)
  if (form.elements[key]) form.elements[key].value = value;

const row = (name, pillars, cell) =>
  `<tr><th scope="row">${name}</th>${pillars
    .map((p, i) => `<td${i === 2 ? ' class="day-master"' : ""}>${cell(p)}</td>`)
    .join("")}</tr>`;

function render(c) {
  const { pillars, extra, yun } = c;
  const palace = (name, p) =>
    `<span><b>${name}</b> ${escape(p.ganZhi)}（${escape(p.naYin)}）</span>`;
  return `
    <div class="table-scroll">
      <table class="pillars">
        <thead><tr><td></td>${pillars.map((p) => `<th scope="col">${p.label}</th>`).join("")}</tr></thead>
        <tbody>
          ${row("十神", pillars, (p) => escape(p.shiShenGan))}
          ${row("天干", pillars, (p) => `<span class="glyph">${escape(p.gan)}</span>`)}
          ${row("地支", pillars, (p) => `<span class="glyph">${escape(p.zhi)}</span>`)}
          ${row("藏干", pillars, (p) =>
            p.hideGan.map((h) => `<div>${escape(h.gan)} <small>${escape(h.shiShen)}</small></div>`).join(""),
          )}
          ${row("納音", pillars, (p) => escape(p.naYin))}
          ${row("長生", pillars, (p) => escape(p.diShi))}
          ${row("空亡", pillars, (p) => escape(p.xunKong))}
        </tbody>
      </table>
    </div>
    <p class="palaces">
      <span><b>格局</b> <strong>${escape(c.geJu)}</strong></span>${palace("胎元", extra.taiYuan)}${palace("命宮", extra.mingGong)}${palace("身宮", extra.shenGong)}
    </p>
    <h2>大運</h2>
    <p>出生後 ${yun.startYear} 年 ${yun.startMonth} 個月 ${yun.startDay} 天起運（${escape(yun.startDate)}），大運${yun.forward ? "順" : "逆"}行。年齡為虛歲。</p>
    ${yun.daYun
      .map(
        (d) => `
      <details class="dayun"${d.startYear <= thisYear && thisYear <= d.endYear ? " open" : ""}>
        <summary><span class="glyph">${escape(d.ganZhi) || "起運前"}</span>　${d.startAge}–${d.endAge} 歲　${d.startYear}–${d.endYear}</summary>
        <ol class="liunian">
          ${d.liuNian
            .map((n) => `<li><b>${n.year}</b> ${escape(n.ganZhi)} <small>${n.age} 歲</small></li>`)
            .join("")}
        </ol>
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
    );
  } catch (error) {
    $("#status").textContent = error.message;
  }
}

form.addEventListener("input", update);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  update();
});
update();
