// Ju Smile 減脂日誌 v2.3
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const state = {
  date: todayStr(),
  data: loadData(),
  reportRange: 7
};

function todayStr(d=new Date()){
  const now = d instanceof Date ? d : new Date(d);
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const day = String(now.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function loadData(){
  try{
    const j = localStorage.getItem('juDataV2');
    return j ? JSON.parse(j) : {};
  }catch(e){ return {}; }
}
function saveData(){ localStorage.setItem('juDataV2', JSON.stringify(state.data)); }
function getDayObj(dateStr){
  if(!state.data[dateStr]){
    state.data[dateStr] = { water:{goal:2000, logs:[]}, foods:[], workouts:[], weight:null };
  }else{
    if(!state.data[dateStr].water) state.data[dateStr].water = {goal:2000, logs:[]};
    if(!('weight' in state.data[dateStr])) state.data[dateStr].weight = null;
  }
  return state.data[dateStr];
}
function setDate(dStr){ state.date = dStr; renderAll(); }
function shiftDate(days){
  const d = new Date(state.date);
  d.setDate(d.getDate()+days);
  setDate(todayStr(d));
}
function sum(arr){ return arr.reduce((a,b)=>a+Number(b||0),0); }

document.addEventListener('DOMContentLoaded', () => {
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js'); }
  initUI(); renderAll();
});

function initUI(){
  // Tabs
  $$('.tabs .tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.tabs .tab').forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $$('.tab-panel').forEach(p=> p.classList.add('hidden'));
      $(`.tab-panel[data-panel="${tab}"]`).classList.remove('hidden');
      if(tab==='report'){ renderWeightChart(); }
    });
  });

  // 日期
  $('#datePicker').value = state.date;
  $('#datePicker').addEventListener('change', e=> setDate(e.target.value));
  $('#todayBtn').addEventListener('click', ()=> setDate(todayStr(new Date())));
  $('#prevDay').addEventListener('click', ()=> shiftDate(-1));
  $('#nextDay').addEventListener('click', ()=> shiftDate(1));

  // 體重
  $('#saveWeight').addEventListener('click', ()=>{
    const n = Number($('#weightInput').value);
    const d = getDayObj(state.date);
    if(n>0){ d.weight = n; saveData(); showToast('已保存今日體重'); }
  });

  // 喝水
  $('#addWater').addEventListener('click', ()=> {
    const n = Number($('#waterInput').value);
    if(n>0){ addWater(n); $('#waterInput').value=''; }
  });
  $$('button[data-water]').forEach(btn=> btn.addEventListener('click', ()=> addWater(Number(btn.dataset.water))));
  $('#waterGoal').addEventListener('change', e=>{
    const v = Math.max(0, Number(e.target.value||0));
    const d = getDayObj(state.date);
    d.water.goal = v || 2000; saveData(); renderWater();
  });

  // 食物 / 運動
  $('#addFood').addEventListener('click', ()=> addFoodItem());
  $('#addWorkout').addEventListener('click', ()=> addWorkoutItem());

  // 匯出匯入 + 同步說明
  $('#btnExport').addEventListener('click', exportJSON);
  $('#btnImport').addEventListener('click', ()=> $('#importFile').click());
  $('#importFile').addEventListener('change', importJSON);
  $('#btnSyncHelp').addEventListener('click', openSyncHelp);

  // Modal 關閉
  $$('#syncModal [data-close], #syncModal .modal-backdrop').forEach(el=> el.addEventListener('click', closeSyncHelp));

  // 報表範圍按鈕
  $$('[data-range]').forEach(b=> b.addEventListener('click', ()=>{
    state.reportRange = Number(b.dataset.range);
    renderWeightChart();
  }));
}

// 喝水
function addWater(amount){
  const d = getDayObj(state.date);
  d.water.logs.push(amount);
  saveData();
  renderWater();
}
function renderWater(){
  const d = getDayObj(state.date);
  $('#waterGoal').value = d.water.goal || 2000;
  const total = sum(d.water.logs);
  $('#waterBar').style.width = Math.min(100, Math.round((total/(d.water.goal||2000))*100)) + '%';
  const ul = $('#waterList'); ul.innerHTML = '';
  d.water.logs.forEach((ml, i)=>{
    const li = document.createElement('li');
    li.textContent = `${i+1}. ${ml} ml`;
    ul.appendChild(li);
  });
  renderCapsules();
}

// 食物
function addFoodItem(it){
  const wrap = $('#foodList');
  const node = document.createElement('div');
  node.className = 'item';
  node.innerHTML = `
    <div class="col">
      <label class="label">食物名稱（可搜尋）</label>
      <input type="text" list="foodMaster" placeholder="例如：雞胸肉" class="food-name">
    </div>
    <div class="col">
      <label class="label">份量</label>
      <input type="number" min="0" step="0.1" placeholder="1" class="food-serv">
    </div>
    <div class="col">
      <label class="label">熱量 / 份 (kcal)</label>
      <input type="number" min="0" step="1" placeholder="165" class="food-kcal">
    </div>
    <div class="col">
      <label class="label">蛋白質 / 份 (g)</label>
      <input type="number" min="0" step="0.1" placeholder="31" class="food-protein">
    </div>
    <div class="col">
      <label class="label">碳水 / 份 (g)</label>
      <input type="number" min="0" step="0.1" placeholder="0" class="food-carb">
    </div>
    <div class="col">
      <label class="label">脂肪 / 份 (g)</label>
      <input type="number" min="0" step="0.1" placeholder="0" class="food-fat">
    </div>
    <div class="actions">
      <button class="btn-ghost save" type="button">保存</button>
      <button class="btn-ghost del" type="button">刪除</button>
    </div>`;
  wrap.appendChild(node);
  if(it){
    node.querySelector('.food-name').value = it.name||'';
    node.querySelector('.food-serv').value = it.serv||1;
    node.querySelector('.food-kcal').value = it.kcal||0;
    node.querySelector('.food-protein').value = it.protein||0;
    node.querySelector('.food-carb').value = it.carb||0;
    node.querySelector('.food-fat').value = it.fat||0;
  }

  node.querySelector('.save').addEventListener('click', ()=>{
    const item = {
      name: node.querySelector('.food-name').value.trim(),
      serv: Number(node.querySelector('.food-serv').value||0),
      kcal: Number(node.querySelector('.food-kcal').value||0),
      protein: Number(node.querySelector('.food-protein').value||0),
      carb: Number(node.querySelector('.food-carb').value||0),
      fat: Number(node.querySelector('.food-fat').value||0),
    };
    const d = getDayObj(state.date);
    const idx = Array.from(wrap.children).indexOf(node);
    d.foods[idx] = item; saveData(); renderFoodTotals();
  });
  node.querySelector('.del').addEventListener('click', ()=>{
    const d = getDayObj(state.date);
    const idx = Array.from(wrap.children).indexOf(node);
    d.foods.splice(idx,1); node.remove(); saveData(); renderFoodTotals();
  });
}
function renderFoods(){
  const d = getDayObj(state.date);
  const wrap = $('#foodList'); wrap.innerHTML = '';
  d.foods.forEach(it=> addFoodItem(it));
  renderFoodTotals();
}
function renderFoodTotals(){
  const d = getDayObj(state.date);
  const totals = d.foods.reduce((acc,it)=>{
    acc.kcal += (it.kcal||0)*(it.serv||0);
    acc.protein += (it.protein||0)*(it.serv||0);
    acc.carb += (it.carb||0)*(it.serv||0);
    acc.fat += (it.fat||0)*(it.serv||0);
    return acc;
  }, {kcal:0,protein:0,carb:0,fat:0});
  $('#calTotal').textContent = Math.round(totals.kcal);
  $('#proteinTotal').textContent = (Math.round(totals.protein*10)/10).toFixed(1);
  renderNetCalories();
  renderCapsules();
}

// 運動
function addWorkoutItem(item){
  const wrap = $('#workoutList');
  const node = document.createElement('div');
  node.className = 'item';
  node.innerHTML = `
    <div class="col">
      <label class="label">運動名稱（可搜尋）</label>
      <input type="text" list="workoutMaster" placeholder="例如：健走" class="wo-name">
    </div>
    <div class="col">
      <label class="label">時長（分鐘）</label>
      <input type="number" min="0" step="1" placeholder="30" class="wo-min">
    </div>
    <div class="col">
      <label class="label">消耗熱量 (kcal)</label>
      <input type="number" min="0" step="1" placeholder="120" class="wo-kcal">
    </div>
    <div class="col">
      <label class="label">強度/備註</label>
      <input type="text" placeholder="RPE 6-7" class="wo-note">
    </div>
    <div class="actions">
      <button class="btn-ghost save" type="button">保存</button>
      <button class="btn-ghost del" type="button">刪除</button>
    </div>`;
  wrap.appendChild(node);
  if(item){
    node.querySelector('.wo-name').value = item.name||'';
    node.querySelector('.wo-min').value = item.min||0;
    node.querySelector('.wo-kcal').value = item.kcal||0;
    node.querySelector('.wo-note').value = item.note||'';
  }

  node.querySelector('.save').addEventListener('click', ()=>{
    const it = {
      name: node.querySelector('.wo-name').value.trim(),
      min: Number(node.querySelector('.wo-min').value||0),
      kcal: Number(node.querySelector('.wo-kcal').value||0),
      note: node.querySelector('.wo-note').value.trim(),
    };
    const d = getDayObj(state.date);
    const idx = Array.from(wrap.children).indexOf(node);
    d.workouts[idx] = it; saveData(); renderWorkoutTotals();
  });
  node.querySelector('.del').addEventListener('click', ()=>{
    const d = getDayObj(state.date);
    const idx = Array.from(wrap.children).indexOf(node);
    d.workouts.splice(idx,1); node.remove(); saveData(); renderWorkoutTotals();
  });
}
function renderWorkouts(){
  const d = getDayObj(state.date);
  const wrap = $('#workoutList'); wrap.innerHTML = '';
  d.workouts.forEach(it=> addWorkoutItem(it));
  renderWorkoutTotals();
}
function renderWorkoutTotals(){
  const d = getDayObj(state.date);
  const totalK = sum(d.workouts.map(w=> w.kcal||0));
  const totalM = sum(d.workouts.map(w=> w.min||0));
  $('#burnTotal').textContent = Math.round(totalK);
  $('#durationTotal').textContent = Math.round(totalM);
  renderNetCalories();
  renderCapsules();
}

function renderNetCalories(){
  const d = getDayObj(state.date);
  const kcalIn = d.foods.reduce((acc,it)=> acc + (it.kcal||0)*(it.serv||0), 0);
  const kcalOut = sum(d.workouts.map(w=> w.kcal||0));
  const el = $('#netCalories');
  if(el) el.textContent = Math.round(kcalIn - kcalOut);
  return {kcalIn, kcalOut, net: Math.round(kcalIn - kcalOut)};
}

// 今日概況膠囊
function renderCapsules(){
  const d = getDayObj(state.date);
  const calIn = d.foods.reduce((acc,it)=> acc + (it.kcal||0)*(it.serv||0), 0);
  const proteinIn = d.foods.reduce((acc,it)=> acc + (it.protein||0)*(it.serv||0), 0);
  const carbIn = d.foods.reduce((acc,it)=> acc + (it.carb||0)*(it.serv||0), 0);
  const fatIn = d.foods.reduce((acc,it)=> acc + (it.fat||0)*(it.serv||0), 0);
  const burn = sum(d.workouts.map(w=> w.kcal||0));
  const water = sum(d.water.logs);
  const net = Math.round(calIn - burn);
  const wrap = $('#todayCapsules');
  wrap.innerHTML = '';
  const items = [
    {cls:'intake', label:'攝取', val:`${Math.round(calIn)} kcal`},
    {cls:'protein', label:'蛋白', val:`${(Math.round(proteinIn*10)/10).toFixed(1)} g`},
    {cls:'protein', label:'碳水', val:`${(Math.round(carbIn*10)/10).toFixed(1)} g`},
    {cls:'protein', label:'脂肪', val:`${(Math.round(fatIn*10)/10).toFixed(1)} g`},
    {cls:'burn', label:'運動消耗', val:`${Math.round(burn)} kcal`},
    {cls:'net', label:'淨熱量', val:`${net} kcal`},
    {cls:'water', label:'喝水', val:`${water} ml`},
  ];
  items.forEach(it=>{
    const el = document.createElement('div');
    el.className = `cap ${it.cls}`;
    el.innerHTML = `${it.label}：<span class="k">${it.val}</span>`;
    wrap.appendChild(el);
  });
}

// 匯出 / 匯入
function exportJSON(){
  const data = JSON.stringify(state.data, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().slice(0,10);
  a.download = `ju-smile-v2-data-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('已匯出：請把檔案傳到要同步的裝置，並在那邊按「匯入」。');
}
function importJSON(e){
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try{
      const imported = JSON.parse(evt.target.result);
      if(typeof imported === 'object'){
        state.data = imported; saveData(); renderAll();
        showToast('匯入完成：已套用檔案中的所有日期資料。');
      }else{
        alert('檔案格式不正確');
      }
    }catch(err){
      alert('讀取失敗：' + err.message);
    }
  };
  reader.readAsText(file);
}

// 同步說明 Modal
function openSyncHelp(){ $('#syncModal').classList.remove('hidden'); }
function closeSyncHelp(){ $('#syncModal').classList.add('hidden'); }

// Toast
let toastTimer = null;
function showToast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.add('hidden'), 3200);
}

// 渲染
function renderAll(){
  $('#datePicker').value = state.date;
  const w = getDayObj(state.date).weight;
  $('#weightInput').value = (w ?? '') === null ? '' : (w ?? '');
  renderWater(); renderFoods(); renderWorkouts();
  const reportPanelHidden = $(`.tab-panel[data-panel="report"]`).classList.contains('hidden');
  if(!reportPanelHidden) renderWeightChart();
}

// Report: Weight Trend
function renderWeightChart(){
  const days = collectWeightSeries(state.reportRange);
  const canvas = $('#weightChart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 900;
  const cssH = canvas.clientHeight || 360;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,cssW,cssH);
  if(days.length === 0 || days.every(d=> d.weight==null)){
    ctx.fillStyle = '#6b7280'; ctx.font = '14px system-ui';
    ctx.fillText('沒有可顯示的體重資料。請在「日誌」分頁輸入體重。', 16, 28);
    return;
  }
  const pad = {l:48, r:16, t:16, b:36};
  const plotW = cssW - pad.l - pad.r;
  const plotH = cssH - pad.t - pad.b;
  const xs = days.map(d=> d.date);
  const weights = days.map(d=> d.weight);
  const validWeights = weights.filter(v=> typeof v==='number' && !isNaN(v));
  const minY = Math.floor(Math.min(...validWeights) - 0.5);
  const maxY = Math.ceil(Math.max(...validWeights) + 0.5);
  const rangeY = Math.max(1, maxY - minY);

  // Axes
  ctx.strokeStyle = '#e9ecef';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + plotH);
  ctx.lineTo(pad.l + plotW, pad.t + plotH);
  ctx.stroke();

  // Y ticks
  ctx.fillStyle = '#6b7280';
  ctx.font = '12px system-ui';
  for(let i=0;i<=5;i++){
    const yVal = minY + i * (rangeY/5);
    const y = pad.t + plotH - ( (yVal - minY) / rangeY ) * plotH;
    ctx.strokeStyle = '#f1f5f4';
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l+plotW, y); ctx.stroke();
    ctx.fillStyle = '#6b7280';
    ctx.fillText(yVal.toFixed(1), 8, y+4);
  }

  // X labels
  const tickCount = Math.min(6, xs.length);
  for(let i=0;i<tickCount;i++){
    const idx = Math.round(i*(xs.length-1)/(tickCount-1||1));
    const x = pad.l + (idx/(xs.length-1||1)) * plotW;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(xs[idx].slice(5), x-16, pad.t + plotH + 18);
  }

  // Line
  ctx.strokeStyle = '#97d0ba';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let started = false;
  weights.forEach((w,i)=>{
    const x = pad.l + (i/(xs.length-1||1)) * plotW;
    if(typeof w === 'number' && !isNaN(w)){
      const y = pad.t + plotH - ((w - minY)/rangeY) * plotH;
      if(!started){ ctx.moveTo(x,y); started=true; }
      else ctx.lineTo(x,y);
    }
  });
  ctx.stroke();

  // Points
  ctx.fillStyle = '#213';
  weights.forEach((w,i)=>{
    if(typeof w === 'number' && !isNaN(w)){
      const x = pad.l + (i/(xs.length-1||1)) * plotW;
      const y = pad.t + plotH - ((w - minY)/rangeY) * plotH;
      ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
    }
  });
}

function collectWeightSeries(lastNDays){
  const today = new Date();
  const out = [];
  for(let i=lastNDays-1;i>=0;i--){
    const d = new Date(today); d.setDate(today.getDate()-i);
    const key = todayStr(d);
    const day = state.data[key];
    out.push({ date: key, weight: day && typeof day.weight==='number' ? day.weight : (day && day.weight || null) });
  }
  return out;
}
