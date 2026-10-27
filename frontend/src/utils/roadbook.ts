/**
 * 路书生成器：TripPlan → 单文件移动端 HTML 路书
 *
 * 版式与深链兜底思路参考 MIT 开源项目 travel-roadbook-skill
 * (https://github.com/SpaceZephyr/travel-roadbook-skill)，
 * 板块取舍参考 jianhao-travel-planner (https://github.com/awangwang123/jianhao-travel-planner)，
 * 均按 TRIPXU 的 TripPlan 数据模型改编。
 *
 * 产物为自包含单文件：CSS/JS/图片(base64) 全部内联，断网可开，可直接发微信。
 */
import { i18n } from '@/i18n'
import { getRuntimeMapJsKey } from '@/services/api'
import type { Attraction, DayPlan, Meal, TripPlan, WeatherInfo } from '@/types'

const t = i18n.global.t

const mealLabel = (type: string): string => {
  const labels: Record<string, string> = {
    breakfast: t('result.meals.breakfast'),
    lunch: t('result.meals.lunch'),
    dinner: t('result.meals.dinner'),
    snack: t('result.meals.snack'),
  }
  return labels[type] || type
}

const mealText = (m: Meal): string =>
  `${mealLabel(m.type)}: ${m.name || '—'}${num0(m.estimated_cost) ? ` (¥${num0(m.estimated_cost)})` : ''}`

// num 定义在下方，此处用函数声明提升会破坏 const 顺序，单独给 mealText 用的小工具
function num0(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// ---------- 小工具 ----------

const esc = (v: unknown): string =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  )

/** YYYY-MM-DD → M/D */
const fmtDate = (iso?: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  return m ? `${Number(m[2])}/${Number(m[3])}` : iso || ''
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** 高德 App 单点导航深链 */
const amapNavUri = (a: Attraction): string => {
  const { longitude, latitude } = a.location || ({} as { longitude: number; latitude: number })
  if (!longitude || !latitude) return ''
  return `amapuri://route/plan/?dlat=${latitude}&dlon=${longitude}&dname=${encodeURIComponent(a.name)}&dev=0&t=0`
}

/** 高德 Web 版导航兜底（App 未安装/桌面浏览器时用） */
const amapWebUri = (a: Attraction): string => {
  const { longitude, latitude } = a.location || ({} as { longitude: number; latitude: number })
  if (!longitude || !latitude) return ''
  return `https://uri.amap.com/navigation?to=${longitude},${latitude},${encodeURIComponent(a.name)}&mode=car&coordinate=gaode`
}

/** 「到这里去」导航链接（餐饮/住宿通用；无坐标返回空串） */
const navLink = (name: string, loc?: { longitude: number; latitude: number } | null): string => {
  if (!loc || !loc.longitude || !loc.latitude) return ''
  const nav = `amapuri://route/plan/?dlat=${loc.latitude}&dlon=${loc.longitude}&dname=${encodeURIComponent(name)}&dev=0&t=0`
  const web = `https://uri.amap.com/navigation?to=${loc.longitude},${loc.latitude},${encodeURIComponent(name)}&mode=car&coordinate=gaode`
  return `<a class="navbtn navbtn-mini" href="${esc(nav)}" data-web="${esc(web)}">${esc(t('result.roadbook.goHere'))}</a>`
}

// ---------- 样式与脚本（全部内联） ----------

const CSS = `
:root{--ink:#17202b;--sub:#5c6672;--line:#e2e7ee;--bg:#f4f6f9;--card:#fff;
--deep:#17365d;--deep2:#24507f;--orange:#ea580c;--green:#15803d;--purple:#7c3aed;--radius:10px;}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html{font-size:16px;}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
background:var(--bg);color:var(--ink);line-height:1.55;-webkit-font-smoothing:antialiased;}
.wrap{max-width:560px;margin:0 auto;padding:20px 16px calc(28px + env(safe-area-inset-bottom));}
header{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--sub);}
h1{font-size:25px;line-height:1.3;margin:14px 0 6px;}
.lead{color:var(--sub);font-size:15px;}
.wechat-tip{margin:16px 0 14px;padding:10px 12px;border:1px solid #f2c7a3;background:#fdf3ea;
border-radius:var(--radius);font-size:13px;color:#8a3b0e;}
section{margin-top:26px;}
.sec-title{font-size:15px;font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:8px;}
.sec-title .bar{width:4px;height:16px;border-radius:2px;background:var(--deep);display:inline-block;}
.src-note{font-size:12px;color:#8a94a1;margin-top:8px;line-height:1.6;}
/* 天气 */
.weather-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}
@media (min-width:480px){.weather-grid{grid-template-columns:repeat(3,1fr);}}
.wk{background:var(--card);border:1px solid var(--line);border-radius:9px;padding:9px 11px;
display:flex;align-items:center;justify-content:space-between;gap:8px;}
.wk .city{font-size:13.5px;font-weight:600;}
.wk .city small{display:block;font-size:10.5px;color:#9aa3ae;font-weight:400;}
.wk .t{font-size:13px;color:var(--sub);text-align:right;}
.wk .t b{color:var(--ink);font-size:15px;}
/* 每日行程 */
.day{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 14px;margin-bottom:14px;}
.day-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;}
.day-badge{background:var(--deep);color:#fff;font-size:12.5px;font-weight:700;border-radius:7px;padding:3px 9px;}
.day-date{font-size:13px;color:var(--sub);}
.day-city{font-size:12px;color:var(--deep);background:#eef3f9;border-radius:5px;padding:2px 7px;font-weight:600;}
.day-transfer{font-size:12px;color:#8a3b0e;background:#fdf3ea;border-radius:5px;padding:2px 7px;}
.day-desc{font-size:13.5px;color:#46505c;margin:4px 0 10px;}
.transfer-info{font-size:13px;color:#8a3b0e;background:#fdf3ea;border-radius:8px;padding:8px 10px;margin-bottom:10px;}
.tl{display:grid;grid-template-columns:34px 22px 1fr;position:relative;}
.tl::before{content:"";position:absolute;left:44px;top:0;bottom:0;width:2px;background:var(--line);}
.tl .idx{font-size:12.5px;color:var(--sub);padding:10px 0;text-align:right;font-weight:600;}
.tl .axis{position:relative;}
.tl .dot{position:absolute;top:13px;left:50%;transform:translateX(-50%);width:10px;height:10px;
border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px var(--line);background:var(--deep);}
.tl .cnt{padding:7px 0 14px 10px;min-width:0;}
.dot.leg{background:var(--orange);width:8px;height:8px;top:10px;}
.leg-cnt{font-size:12.5px;color:#8a5a3b;padding:2px 0 12px 10px;}
.spot-name{font-size:15px;font-weight:600;line-height:1.4;}
.spot-meta{font-size:12px;color:var(--sub);margin-left:6px;font-weight:400;}
.spot-img{width:100%;max-height:220px;object-fit:cover;border-radius:9px;margin:8px 0;display:block;}
.d{display:flex;gap:7px;font-size:13px;color:#46505c;margin-top:4px;line-height:1.45;}
.d .tag{flex:none;align-self:flex-start;min-width:26px;text-align:center;font-size:11px;font-weight:600;
color:#fff;border-radius:4px;padding:1.5px 6px;}
.tag.addr{background:var(--deep);} .tag.resv{background:var(--orange);} .tag.desc{background:var(--green);}
.navbtn{display:inline-block;margin-top:8px;font-size:12.5px;font-weight:600;color:var(--deep);
border:1px solid var(--deep);border-radius:7px;padding:5px 14px;text-decoration:none;background:#fff;}
.navbtn:active{background:#eef3f9;}
.navbtn-mini{margin:0 0 0 6px;padding:2px 9px;font-size:11.5px;vertical-align:middle;}
.day-foot{border-top:1px dashed var(--line);margin-top:4px;padding-top:10px;}
.foot-row{display:flex;gap:7px;font-size:13px;color:#46505c;margin-top:5px;line-height:1.5;}
.foot-row .tag{flex:none;align-self:flex-start;min-width:26px;text-align:center;font-size:11px;font-weight:600;
color:#fff;border-radius:4px;padding:1.5px 6px;}
.tag.food{background:var(--orange);} .tag.hotel{background:var(--purple);} .tag.trans{background:#0e7490;}
/* 门票表 */
table.tk{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);
border-radius:9px;overflow:hidden;font-size:13px;}
.tk th{background:#eef3f9;color:var(--deep);font-size:12.5px;text-align:left;padding:8px 10px;}
.tk td{padding:8px 10px;border-top:1px solid var(--line);vertical-align:top;color:#333d4a;}
.tk td.price{color:var(--orange);font-weight:600;white-space:nowrap;}
/* 预算 */
.budget-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}
.budget-grid .bk{background:var(--card);border:1px solid var(--line);border-radius:9px;padding:10px 12px;}
.bk .bl{font-size:12px;color:var(--sub);}
.bk .bv{font-size:17px;font-weight:700;color:var(--ink);margin-top:2px;}
.bk.total{background:var(--deep);border-color:var(--deep);}
.bk.total .bl{color:rgba(255,255,255,.75);}
.bk.total .bv{color:#fff;}
/* 贴士 */
ul.tips{list-style:none;}
ul.tips li{position:relative;padding:0 0 8px 18px;font-size:13.5px;color:#333d4a;line-height:1.55;}
ul.tips li::before{content:"";position:absolute;left:2px;top:8px;width:6px;height:6px;border-radius:50%;background:var(--orange);}
footer{margin-top:30px;padding-top:14px;border-top:1px solid var(--line);font-size:12px;color:#8a94a1;
text-align:center;line-height:1.7;}
/* 交互地图 */
.map-box{position:relative;border-radius:12px;overflow:hidden;border:1px solid var(--line);}
#rb-map{width:100%;height:60vh;min-height:380px;}
.map-labels-btn{position:absolute;top:10px;right:10px;z-index:10;background:var(--card);border:1px solid var(--line);
border-radius:8px;padding:6px 12px;font-size:12.5px;font-weight:600;color:var(--deep);cursor:pointer;
box-shadow:0 1px 4px rgba(0,0,0,.15);font-family:inherit;}
.map-labels-btn.on{background:var(--deep);color:#fff;border-color:var(--deep);}
.map-fallback{display:none;padding:36px 16px;text-align:center;color:var(--sub);font-size:13px;background:var(--card);line-height:1.7;}
.rb-mk{width:26px;height:26px;border-radius:50%;color:#fff;font-size:10.5px;font-weight:700;display:flex;
align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);white-space:nowrap;}
.rb-iw{max-width:250px;font-size:12.5px;line-height:1.55;color:#17202b;text-align:center;}
.rb-iw-title{font-weight:700;font-size:14px;margin-bottom:8px;}
@media print{body{background:#fff;}.wechat-tip,.navbtn,.map-labels-btn{display:none;}.day{break-inside:avoid;}#rb-map{height:300px;}}
`

const JS = `
(function(){
  // 高德深链兜底：点击后 1.8s 页面仍可见（App 未唤起）则跳转 Web 版
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a[data-web]') : null;
    if(!a) return;
    var web = a.getAttribute('data-web');
    if(!web) return;
    setTimeout(function(){
      if(!document.hidden) location.href = web;
    }, 1800);
  });
})();
`

/**
 * 交互地图嵌入脚本（ES5，兼容手机浏览器/微信内置浏览器）：
 * - 动态加载高德 JS API 2.0（key 缺失或加载失败 → 显示占位提示，路书其余部分不受影响）
 * - 景点/餐饮/酒店三类标记，点击弹属性卡
 * - 「显示全部名称」开关：AMap.Text 标签整体挂载/卸载
 */
const MAP_JS = `
(function(){
  var pts = window.__RB_POINTS__ || [];
  var key = window.__RB_AMAP_KEY__ || '';
  var mapEl = document.getElementById('rb-map');
  var btn = document.getElementById('rb-labels-btn');
  var fallback = document.getElementById('rb-map-fallback');
  function showFallback(){
    if (mapEl) mapEl.style.display = 'none';
    if (btn) btn.style.display = 'none';
    if (fallback) fallback.style.display = 'block';
  }
  if (!key || !pts.length) { showFallback(); return; }
  var s = document.createElement('script');
  s.src = 'https://webapi.amap.com/maps?v=2.0&key=' + encodeURIComponent(key);
  s.onerror = showFallback;
  s.onload = function(){ try { initMap(); } catch(e) { showFallback(); } };
  document.head.appendChild(s);
  function initMap(){
    var map = new AMap.Map('rb-map', { zoom: 11, resizeEnable: true, viewMode: '2D' });
    var colors = { attraction: '#17365d', meal: '#ea580c', hotel: '#7c3aed' };
    var markers = [], labels = [];
    for (var i = 0; i < pts.length; i++) {
      (function(p){
        var content = p.type === 'attraction'
          ? '<div class="rb-mk" style="background:' + colors.attraction + '">' + p.day + '-' + p.order + '</div>'
          : '<div class="rb-mk" style="background:' + colors[p.type] + '">' + (p.type === 'meal' ? '\\u{1F35C}' : '\\u{1F3E8}') + '</div>';
        var mk = new AMap.Marker({ position: [p.lng, p.lat], content: content, offset: new AMap.Pixel(-13, -13) });
        mk.on('click', function(){
          var goHere = (window.__RB_I18N__ && window.__RB_I18N__.goHere) || '到这里去';
          var nav = 'amapuri://route/plan/?dlat=' + p.lat + '&dlon=' + p.lng + '&dname=' + encodeURIComponent(p.textName) + '&dev=0&t=0';
          var web = 'https://uri.amap.com/navigation?to=' + p.lng + ',' + p.lat + ',' + encodeURIComponent(p.textName) + '&mode=car&coordinate=gaode';
          var iw = new AMap.InfoWindow({
            content: '<div class="rb-iw"><div class="rb-iw-title">' + p.name + '</div><a class="navbtn navbtn-mini" href="' + nav + '" data-web="' + web + '">' + goHere + '</a></div>',
            offset: new AMap.Pixel(0, -18)
          });
          iw.open(map, [p.lng, p.lat]);
        });
        markers.push(mk);
        labels.push(new AMap.Text({
          text: p.textName,
          position: [p.lng, p.lat],
          offset: new AMap.Pixel(12, -8),
          style: { 'background': 'rgba(255,255,255,.92)', 'border': '1px solid #d5dce6', 'border-radius': '4px',
                   'padding': '1px 6px', 'font-size': '11px', 'color': '#17202b', 'white-space': 'nowrap' }
        }));
      })(pts[i]);
    }
    map.add(markers);
    if (markers.length) map.setFitView(markers, false, [46, 20, 20, 20]);
    var shown = false;
    if (btn) btn.onclick = function(){
      shown = !shown;
      if (shown) { map.add(labels); btn.classList.add('on'); btn.textContent = btn.getAttribute('data-hide'); }
      else { map.remove(labels); btn.classList.remove('on'); btn.textContent = btn.getAttribute('data-show'); }
    };
  }
})();
`

// ---------- 交互地图数据 ----------

export interface RoadbookMapConfig {
  key: string
  securityCode: string
}

interface RoadbookMapPoint {
  type: 'attraction' | 'meal' | 'hotel'
  name: string // HTML 转义后（InfoWindow innerHTML 用）
  textName: string // 原文（AMap.Text 标签与导航深链用）
  lng: number
  lat: number
  day: number
  order: number
}

const hasCoords = (loc?: { longitude?: number; latitude?: number } | null): boolean =>
  !!loc && !!loc.longitude && !!loc.latitude

/** 收集地图上渲染的点位（InfoWindow 只展示名称 + 导航，无需属性行） */
export const collectMapPoints = (plan: TripPlan): RoadbookMapPoint[] => {
  const points: RoadbookMapPoint[] = []
  ;(plan.days || []).forEach((day, di) => {
    ;(day.attractions || []).forEach((a, ai) => {
      if (!hasCoords(a.location)) return
      points.push({
        type: 'attraction',
        name: esc(a.name),
        textName: a.name,
        lng: (a.location as { longitude: number }).longitude,
        lat: (a.location as { latitude: number }).latitude,
        day: di + 1,
        order: ai + 1,
      })
    })
    ;(day.meals || []).forEach((m) => {
      if (!hasCoords(m.location)) return
      points.push({
        type: 'meal',
        name: esc(m.name),
        textName: m.name,
        lng: (m.location as { longitude: number }).longitude,
        lat: (m.location as { latitude: number }).latitude,
        day: di + 1,
        order: 0,
      })
    })
    const h = day.hotel
    if (h && hasCoords(h.location)) {
      points.push({
        type: 'hotel',
        name: esc(h.name),
        textName: h.name,
        lng: (h.location as { longitude: number }).longitude,
        lat: (h.location as { latitude: number }).latitude,
        day: di + 1,
        order: 0,
      })
    }
  })
  return points
}

const renderMapSection = (plan: TripPlan, mapConfig: RoadbookMapConfig): string => {
  const points = collectMapPoints(plan)
  // </script> 逃逸与 XSS 双保险：所有 < 转为 <
  const pointsJson = JSON.stringify(points).replace(/</g, '\\u003c')
  const secCodeScript = mapConfig.securityCode
    ? `window._AMapSecurityConfig = { securityJsCode: ${JSON.stringify(mapConfig.securityCode).replace(/</g, '\\u003c')} };`
    : ''
  return `<section>
<div class="sec-title"><span class="bar"></span>${esc(t('result.roadbook.mapTitle'))}</div>
<div class="map-box">
<div id="rb-map"></div>
<button type="button" id="rb-labels-btn" class="map-labels-btn" data-show="${esc(t('result.roadbook.mapShowLabels'))}" data-hide="${esc(t('result.roadbook.mapHideLabels'))}">${esc(t('result.roadbook.mapShowLabels'))}</button>
<div id="rb-map-fallback" class="map-fallback">${esc(t('result.roadbook.mapFallback'))}</div>
</div>
</section>
<script>window.__RB_POINTS__ = ${pointsJson}; window.__RB_AMAP_KEY__ = ${JSON.stringify(mapConfig.key || '')}; window.__RB_I18N__ = { goHere: ${JSON.stringify(t('result.roadbook.goHere')).replace(/</g, '\\u003c')} }; ${secCodeScript}</script>
<script>${MAP_JS}</script>`
}

/** 从运行时读取高德 JS Key（设置页/localStorage/env）与安全密钥（vite 构建期注入的全局） */
const resolveMapConfig = (): RoadbookMapConfig => {
  let key = ''
  let securityCode = ''
  try {
    key = getRuntimeMapJsKey() || ''
  } catch {
    key = ''
  }
  try {
    if (typeof window !== 'undefined') {
      securityCode = (window as unknown as { _AMapSecurityConfig?: { securityJsCode?: string } })._AMapSecurityConfig?.securityJsCode || ''
    }
  } catch {
    securityCode = ''
  }
  return { key, securityCode }
}

// ---------- 区块渲染 ----------

const renderWeather = (list: WeatherInfo[]): string => {
  if (!list || !list.length) return ''
  const cards = list
    .map(
      (w) =>
        `<div class="wk"><div class="city">${esc(w.city)}<small>${esc(fmtDate(w.date))}</small></div>
<div class="t"><b>${esc(w.day_temp)}°</b>/${esc(w.night_temp)}° ${esc(w.day_weather || '')}</div></div>`
    )
    .join('')
  return `<section><div class="sec-title"><span class="bar"></span>${esc(t('result.roadbook.weatherTitle'))}</div>
<div class="weather-grid">${cards}</div>
<div class="src-note">${esc(label0(list))}</div></section>`

  function label0(ws: WeatherInfo[]): string {
    const first = fmtDate(ws[0]?.date)
    const last = fmtDate(ws[ws.length - 1]?.date)
    return first && last && first !== last ? `${first} - ${last}` : ''
  }
}

const renderStop = (a: Attraction, order: number, imageDataUrl?: string, relatedMeals: Meal[] = []): string => {
  const metaParts: string[] = []
  if (num(a.visit_duration)) metaParts.push(`${esc(a.visit_duration)}${esc(t('result.minuteUnit'))}`)
  if (num(a.ticket_price)) metaParts.push(`¥${esc(a.ticket_price)}`)
  else if (a.ticket_price === 0) metaParts.push(esc(t('result.ticketFree')))
  const meta = metaParts.length ? `<span class="spot-meta">${metaParts.join(' · ')}</span>` : ''
  const img = imageDataUrl ? `<img class="spot-img" src="${imageDataUrl}" alt="${esc(a.name)}">` : ''
  const addr = a.address
    ? `<div class="d"><span class="tag addr">${esc(t('result.roadbook.tagAddress'))}</span><span>${esc(a.address)}</span></div>`
    : ''
  const desc = a.description
    ? `<div class="d"><span class="tag desc">${esc(t('result.roadbook.tagDesc'))}</span><span>${esc(a.description)}</span></div>`
    : ''
  // 附属餐饮：关联到本景点的餐饮渲染在景点条目内（带「到这里去」导航）
  const food = relatedMeals.length
    ? `<div class="d"><span class="tag food">${esc(t('result.roadbook.tagFood'))}</span><span>${relatedMeals.map((m) => esc(mealText(m)) + navLink(m.name, m.location)).join('；')}</span></div>`
    : ''
  const resv = a.reservation_required
    ? `<div class="d"><span class="tag resv">${esc(t('result.roadbook.tagReservation'))}</span><span>${esc(a.reservation_tips || t('result.roadbook.reservationDefault'))}</span></div>`
    : ''
  const navUri = amapNavUri(a)
  const nav = navUri
    ? `<a class="navbtn" href="${esc(navUri)}" data-web="${esc(amapWebUri(a))}">${esc(t('result.roadbook.navButton'))}</a>`
    : ''
  return `<div class="idx">${String(order).padStart(2, '0')}</div><div class="axis"><div class="dot"></div></div>
<div class="cnt"><div class="spot-name">${esc(a.name)}${meta}</div>${img}${addr}${desc}${food}${resv}${nav}</div>`
}

/** 站点间交通段（如"二号线虎泉站A口上，江汉路B口出"） */
const renderTransferLeg = (text: string): string =>
  `<div class="idx"></div><div class="axis"><div class="dot leg"></div></div>
<div class="cnt leg-cnt">🚇 ${esc(text)}</div>`

const renderDay = (day: DayPlan, index: number, images: Record<string, string>): string => {
  const headCity = day.city ? `<span class="day-city">${esc(day.city)}</span>` : ''
  const headTransfer = day.is_transfer_day
    ? `<span class="day-transfer">🚄 ${esc(t('result.transferDay'))}</span>`
    : ''
  const transferInfo =
    day.is_transfer_day && day.transfer_info
      ? `<div class="transfer-info">🚄 ${esc(day.transfer_info)}</div>`
      : ''
  const desc = day.description ? `<div class="day-desc">${esc(day.description)}</div>` : ''

  const attractions = day.attractions || []
  const stops = attractions
    .map((a, ai) => {
      // 关联到本景点的附属餐饮
      const relatedMeals = (day.meals || []).filter((m) => m.related_attraction && m.related_attraction === a.name)
      let html = renderStop(a, ai + 1, images[a.name], relatedMeals)
      // 站间交通段（最后一个景点之后不渲染）
      if (a.transfer_to_next && ai < attractions.length - 1) {
        html += renderTransferLeg(a.transfer_to_next)
      }
      return html
    })
    .join('')
  const timeline = stops ? `<div class="tl">${stops}</div>` : ''

  // 天底餐饮汇总：只列未关联景点的（关联的已渲染进对应景点条目）；带「到这里去」导航
  const mealsText = (day.meals || [])
    .filter((m) => !m.related_attraction)
    .map((m) => esc(mealText(m)) + navLink(m.name, m.location))
    .join('　')
  const footRows: string[] = []
  if (mealsText) {
    footRows.push(
      `<div class="foot-row"><span class="tag food">${esc(t('result.roadbook.tagFood'))}</span><span>${mealsText}</span></div>`
    )
  }
  const hotelText = day.hotel
    ? `${esc(day.hotel.name)}${day.hotel.price_range ? ` · ${esc(day.hotel.price_range)}` : ''}${num(day.hotel.estimated_cost) ? ` · ¥${num(day.hotel.estimated_cost)}` : ''}${navLink(day.hotel.name, day.hotel.location)}`
    : esc(day.accommodation || '')
  if (hotelText) {
    footRows.push(
      `<div class="foot-row"><span class="tag hotel">${esc(t('result.roadbook.tagHotel'))}</span><span>${hotelText}</span></div>`
    )
  }
  if (day.transportation) {
    footRows.push(
      `<div class="foot-row"><span class="tag trans">${esc(t('result.roadbook.tagTransport'))}</span><span>${esc(day.transportation)}</span></div>`
    )
  }
  const foot = footRows.length ? `<div class="day-foot">${footRows.join('')}</div>` : ''

  return `<div class="day">
<div class="day-head"><span class="day-badge">D${index + 1}</span>
<span class="day-date">${esc(fmtDate(day.date))}</span>${headCity}${headTransfer}</div>
${desc}${transferInfo}${timeline}${foot}</div>`
}

const renderDays = (plan: TripPlan, images: Record<string, string>): string => {
  const days = (plan.days || []).map((d, i) => renderDay(d, i, images)).join('')
  return `<section><div class="sec-title"><span class="bar"></span>${esc(t('result.roadbook.daysTitle'))}</div>${days}</section>`
}

const renderTickets = (plan: TripPlan): string => {
  const rows: string[] = []
  for (const day of plan.days || []) {
    for (const a of day.attractions || []) {
      if (num(a.ticket_price) || a.reservation_required) {
        const price = num(a.ticket_price) ? `¥${num(a.ticket_price)}` : '—'
        const book = a.reservation_required
          ? a.reservation_tips || t('result.roadbook.reservationDefault')
          : t('result.roadbook.noReservationNeeded')
        rows.push(`<tr><td>${esc(a.name)}</td><td class="price">${esc(price)}</td><td>${esc(book)}</td></tr>`)
      }
    }
  }
  if (!rows.length) return ''
  return `<section><div class="sec-title"><span class="bar"></span>${esc(t('result.roadbook.ticketsTitle'))}</div>
<table class="tk"><tr><th style="width:32%">${esc(t('result.roadbook.ticketName'))}</th>
<th style="width:22%">${esc(t('result.roadbook.ticketPrice'))}</th>
<th>${esc(t('result.roadbook.ticketBook'))}</th></tr>${rows.join('')}</table>
<div class="src-note">${esc(t('result.roadbook.ticketsNote'))}</div></section>`
}

const renderBudget = (plan: TripPlan): string => {
  const b = plan.budget
  if (!b) return ''
  const items: Array<[string, number]> = [
    [t('result.budget.attraction'), num(b.total_attractions)],
    [t('result.budget.hotel'), num(b.total_hotels)],
    [t('result.budget.meal'), num(b.total_meals)],
    [t('result.budget.transport'), num(b.total_transportation)],
  ]
  const interCity = num((b as { total_inter_city_transport?: number }).total_inter_city_transport)
  if (interCity) items.push([t('result.roadbook.budgetInterCity'), interCity])
  const cards = items
    .filter(([, v]) => v > 0)
    .map(([label, v]) => `<div class="bk"><div class="bl">${esc(label)}</div><div class="bv">¥${v}</div></div>`)
    .join('')
  const total = `<div class="bk total"><div class="bl">${esc(t('result.roadbook.budgetTotal'))}</div><div class="bv">¥${num(b.total)}</div></div>`
  if (!cards && !num(b.total)) return ''
  return `<section><div class="sec-title"><span class="bar"></span>${esc(t('result.roadbook.budgetTitle'))}</div>
<div class="budget-grid">${cards}${total}</div></section>`
}

const renderTips = (plan: TripPlan): string => {
  const raw = (plan.overall_suggestions || '').trim()
  if (!raw) return ''
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.replace(/^\s*(?:[-•*·]|\d+[.、)])\s*/, '').trim())
    .filter(Boolean)
  if (!lines.length) return ''
  return `<section><div class="sec-title"><span class="bar"></span>${esc(t('result.roadbook.tipsTitle'))}</div>
<ul class="tips">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></section>`
}

// ---------- 图片内联 ----------

const fetchAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!resp.ok) return null
    const blob = await resp.blob()
    if (!blob.size || blob.size > 4 * 1024 * 1024) return null // 超 4MB 的图放弃内联
    return await new Promise<string | null>((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = () => resolve(null)
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * 抓取景点图片并转 base64（并发限 4，失败静默跳过——路书仍可无图导出）
 * @param photos Result.vue 已加载的 景点名→代理URL 映射
 * @param fallbackUrlOf 无缓存时的兜底 URL 构造（image_url 走代理）
 */
const loadImagesAsDataUrls = async (
  plan: TripPlan,
  photos: Record<string, string>,
  fallbackUrlOf: (a: Attraction) => string
): Promise<Record<string, string>> => {
  const names: string[] = []
  const urlOf = new Map<string, string>()
  for (const day of plan.days || []) {
    for (const a of day.attractions || []) {
      if (!a.name || urlOf.has(a.name)) continue
      const url = photos[a.name] || fallbackUrlOf(a)
      if (url) {
        names.push(a.name)
        urlOf.set(a.name, url)
      }
    }
  }
  const result: Record<string, string> = {}
  let cursor = 0
  const worker = async () => {
    while (cursor < names.length) {
      const name = names[cursor]
      cursor += 1
      const dataUrl = await fetchAsDataUrl(urlOf.get(name) as string)
      if (dataUrl) result[name] = dataUrl
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, names.length) }, worker))
  return result
}

// ---------- 组装与导出 ----------

const buildRoadbookHTML = (plan: TripPlan, images: Record<string, string>, mapConfig: RoadbookMapConfig): string => {
  const cities = (plan.cities && plan.cities.length ? plan.cities : [plan.city]).filter(Boolean)
  const dayCount = (plan.days || []).length
  const subtitleParts = [
    dayCount ? t('result.roadbook.subtitleDays', { days: dayCount }) : '',
    fmtDate(plan.start_date) && fmtDate(plan.end_date)
      ? `${fmtDate(plan.start_date)} - ${fmtDate(plan.end_date)}`
      : '',
    cities.length > 1 ? cities.join(' → ') : '',
  ].filter(Boolean)
  const title =
    (plan.title || '').trim() || `${cities[0] || plan.city || ''} ${t('result.roadbook.docTitle')}`.trim()

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<header>🧭 ${esc(t('result.roadbook.eyebrow'))}</header>
<h1>${esc(title)}</h1>
<p class="lead">${esc(subtitleParts.join(' · '))}</p>
<div class="wechat-tip">${esc(t('result.roadbook.wechatTip'))}</div>
${renderMapSection(plan, mapConfig)}
${renderWeather(plan.weather_info || [])}
${renderDays(plan, images)}
${renderTickets(plan)}
${renderBudget(plan)}
${renderTips(plan)}
<footer>${esc(t('result.roadbook.footerText'))}<br>${esc(new Date().toLocaleString())}</footer>
</div>
<script>${JS}</script>
</body>
</html>`
}

// ---------- Markdown 导出（旅行结束后写 blog 二次创作） ----------

const buildRoadbookMarkdown = (plan: TripPlan): string => {
  const cities = (plan.cities && plan.cities.length ? plan.cities : [plan.city]).filter(Boolean)
  const lines: string[] = []
  const dayCount = (plan.days || []).length

  lines.push(
    `# ${(plan.title || '').trim() || `${cities.join(' → ')} · ${t('result.roadbook.subtitleDays', { days: dayCount })}`}`
  )
  lines.push('')
  const dateRange =
    plan.start_date && plan.end_date ? `${plan.start_date} ~ ${plan.end_date}` : ''
  lines.push(`> ${[dateRange, 'TRIPXU · AI 规划 + 手动编辑'].filter(Boolean).join('｜')}`)
  lines.push('')

  // 天气速览
  if (plan.weather_info?.length) {
    lines.push(`## 🌤 ${t('result.roadbook.weatherTitle')}`)
    lines.push('')
    lines.push('| 日期 | 城市 | 白天 | 夜间 | 温度 |')
    lines.push('|---|---|---|---|---|')
    for (const w of plan.weather_info) {
      lines.push(
        `| ${w.date || ''} | ${w.city || ''} | ${w.day_weather || ''} | ${w.night_weather || ''} | ${w.day_temp}°/${w.night_temp}° |`
      )
    }
    lines.push('')
  }

  // 每日行程
  lines.push(`## 📅 ${t('result.roadbook.daysTitle')}`)
  ;(plan.days || []).forEach((day, di) => {
    lines.push('')
    const head = [
      `Day ${di + 1}`,
      day.date || '',
      day.city || '',
      day.is_transfer_day ? `🚄 ${t('result.transferDay')}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
    lines.push(`### ${head}`)
    lines.push('')
    if (day.description) {
      lines.push(day.description)
      lines.push('')
    }
    if (day.is_transfer_day && day.transfer_info) {
      lines.push(`> 🚄 ${day.transfer_info}`)
      lines.push('')
    }

    const relatedMealsOf = (name: string) =>
      (day.meals || []).filter((m) => m.related_attraction && m.related_attraction === name)

    ;(day.attractions || []).forEach((a, ai) => {
      lines.push(`#### ${ai + 1}. ${a.name}`)
      lines.push('')
      const facts: string[] = []
      if (a.address) facts.push(`- 📍 ${t('result.roadbook.tagAddress')}：${a.address}`)
      if (num(a.visit_duration)) facts.push(`- ⏱ ${a.visit_duration} ${t('result.minuteUnit')}`)
      if (num(a.ticket_price)) facts.push(`- 🎫 ¥${a.ticket_price}`)
      else if (a.ticket_price === 0) facts.push(`- 🎫 ${t('result.ticketFree')}`)
      if (a.reservation_required) {
        facts.push(`- 📋 ${t('result.roadbook.tagReservation')}：${a.reservation_tips || t('result.roadbook.reservationDefault')}`)
      }
      if (facts.length) {
        lines.push(...facts)
        lines.push('')
      }
      if (a.description) {
        lines.push(a.description)
        lines.push('')
      }
      const related = relatedMealsOf(a.name)
      if (related.length) {
        lines.push(`🍜 **${t('result.roadbook.tagFood')}**：${related.map(mealText).join('；')}`)
        lines.push('')
      }
      if (a.transfer_to_next && ai < (day.attractions || []).length - 1) {
        lines.push(`🚇 **${t('result.transferToNext')}**：${a.transfer_to_next}`)
        lines.push('')
      }
    })

    const looseMeals = (day.meals || []).filter((m) => !m.related_attraction)
    if (looseMeals.length) {
      lines.push(`**${t('result.roadbook.tagFood')}**`)
      for (const m of looseMeals) {
        lines.push(`- ${mealText(m)}${m.description ? ` — ${m.description}` : ''}`)
      }
      lines.push('')
    }
    if (day.hotel) {
      const h = day.hotel
      const detail = [h.price_range, h.rating ? `${t('result.fieldRating')} ${h.rating}` : '', num(h.estimated_cost) ? `¥${num(h.estimated_cost)}` : '']
        .filter(Boolean)
        .join(' · ')
      lines.push(`**${t('result.roadbook.tagHotel')}**：${h.name}${detail ? `（${detail}）` : ''}`)
      lines.push('')
    } else if (day.accommodation) {
      lines.push(`**${t('result.roadbook.tagHotel')}**：${day.accommodation}`)
      lines.push('')
    }
    if (day.transportation) {
      lines.push(`**${t('result.roadbook.tagTransport')}**：${day.transportation}`)
      lines.push('')
    }
  })

  // 门票与预约
  const ticketRows: string[] = []
  for (const day of plan.days || []) {
    for (const a of day.attractions || []) {
      if (num(a.ticket_price) || a.reservation_required) {
        const price = num(a.ticket_price) ? `¥${num(a.ticket_price)}` : '—'
        const book = a.reservation_required
          ? a.reservation_tips || t('result.roadbook.reservationDefault')
          : t('result.roadbook.noReservationNeeded')
        ticketRows.push(`| ${a.name} | ${price} | ${book} |`)
      }
    }
  }
  if (ticketRows.length) {
    lines.push('')
    lines.push(`## 🎫 ${t('result.roadbook.ticketsTitle')}`)
    lines.push('')
    lines.push(`| ${t('result.roadbook.ticketName')} | ${t('result.roadbook.ticketPrice')} | ${t('result.roadbook.ticketBook')} |`)
    lines.push('|---|---|---|')
    lines.push(...ticketRows)
    lines.push('')
  }

  // 预算
  const b = plan.budget
  if (b) {
    lines.push('')
    lines.push(`## 💰 ${t('result.roadbook.budgetTitle')}`)
    lines.push('')
    lines.push('| 项目 | 金额 |')
    lines.push('|---|---|')
    const budgetRows: Array<[string, number]> = [
      [t('result.budget.attraction'), num(b.total_attractions)],
      [t('result.budget.hotel'), num(b.total_hotels)],
      [t('result.budget.meal'), num(b.total_meals)],
      [t('result.budget.transport'), num(b.total_transportation)],
    ]
    const interCity = num((b as { total_inter_city_transport?: number }).total_inter_city_transport)
    if (interCity) budgetRows.push([t('result.roadbook.budgetInterCity'), interCity])
    for (const [label, v] of budgetRows) {
      if (v > 0) lines.push(`| ${label} | ¥${v} |`)
    }
    lines.push(`| **${t('result.roadbook.budgetTotal')}** | **¥${num(b.total)}** |`)
    lines.push('')
  }

  // 贴士
  const tips = (plan.overall_suggestions || '')
    .split(/\r?\n/)
    .map((s) => s.replace(/^\s*(?:[-•*·]|\d+[.、)])\s*/, '').trim())
    .filter(Boolean)
  if (tips.length) {
    lines.push('')
    lines.push(`## 💡 ${t('result.roadbook.tipsTitle')}`)
    lines.push('')
    for (const tip of tips) lines.push(`- ${tip}`)
    lines.push('')
  }

  lines.push('---')
  lines.push(`*TRIPXU · ${new Date().toLocaleString()}*`)
  return lines.join('\n')
}

/**
 * 导出 Markdown 行程（纯文本，便于博客二次创作；不含图片——AI 搜图有版权风险，博客建议用自己的实拍图）
 */
export async function exportRoadbookMarkdown(plan: TripPlan): Promise<void> {
  const md = buildRoadbookMarkdown(plan)
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${plan.city || 'trip'}-${t('result.roadbook.mdFileSuffix')}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 导出路书：抓取图片内联 → 渲染单文件 HTML（含交互地图）→ 触发浏览器下载
 * @param mapConfig 高德 JS Key 与安全密钥，缺省从运行时设置读取（key 缺失时路书地图区显示配置提示）
 */
export async function exportRoadbook(
  plan: TripPlan,
  photos: Record<string, string>,
  fallbackUrlOf: (a: Attraction) => string,
  mapConfig: RoadbookMapConfig = resolveMapConfig()
): Promise<void> {
  const images = await loadImagesAsDataUrls(plan, photos, fallbackUrlOf)
  const html = buildRoadbookHTML(plan, images, mapConfig)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${plan.city || 'trip'}-${t('result.roadbook.fileSuffix')}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
