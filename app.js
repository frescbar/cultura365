const KEY='cultura365-dia3-magazine-v3';
const state=JSON.parse(localStorage.getItem(KEY)||'{}');
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const GLOBAL_KEY='cultura365-global-v1';
const globalState=JSON.parse(localStorage.getItem(GLOBAL_KEY)||'{}');
const saveGlobal=()=>localStorage.setItem(GLOBAL_KEY,JSON.stringify(globalState));

const toast=(msg)=>{
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}
  t.textContent=msg;t.classList.add('show');
  clearTimeout(window.__c365toast);
  window.__c365toast=setTimeout(()=>t.classList.remove('show'),2200);
};

/* ---------- UI HELP + SMALL STYLE PATCHES ---------- */
const patch=document.createElement('style');
patch.textContent=`
.mode-help{max-width:900px;margin:14px auto 28px;padding:17px 20px;background:var(--paper);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow)}
.mode-help strong{color:var(--forest)}
.mode-help p{margin:4px 0;color:var(--muted);font-size:14px}
.mode-help .mode-status{color:var(--ink);font-weight:750;margin-top:8px}
.progress-card{max-width:900px;margin:18px auto 28px;background:linear-gradient(135deg,var(--paper),var(--sage));border:1px solid var(--line);padding:18px 20px;border-radius:16px;box-shadow:var(--shadow)}
.progress-card-top{display:flex;justify-content:space-between;gap:12px;align-items:end}.progress-card strong{font:700 24px Georgia,serif}.progress-track{height:12px;background:var(--line);border-radius:99px;overflow:hidden;margin:12px 0 6px}.progress-fill{height:100%;width:0;background:var(--gold);transition:.25s}.progress-card small{color:var(--muted)}
.parent-deep{margin-top:28px;padding-top:26px;border-top:1px solid var(--line)}
.parent-deep h3{font-size:27px}.exec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.exec-grid div{padding:15px;border-radius:12px;background:var(--sage);border:1px solid var(--line)}.exec-grid b,.exec-grid span{display:block}.exec-grid span{font-size:14px;color:var(--muted);margin-top:4px}
.age-plan{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:20px 0}.age-plan>section{padding:18px;border:1px solid var(--line);border-radius:14px;background:color-mix(in srgb,var(--paper) 88%,var(--sage))}.age-plan h4{font:700 21px Georgia,serif;margin:0 0 10px}.age-plan li{margin:8px 0}.week-plan{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0}.week-plan div{border:1px solid var(--line);border-radius:10px;padding:11px;background:var(--paper)}.week-plan b,.week-plan span{display:block}.week-plan span{font-size:13px;color:var(--muted)}
@media(max-width:700px){.exec-grid,.age-plan,.week-plan{grid-template-columns:1fr}.progress-card-top{align-items:start;flex-direction:column}}
`;
document.head.appendChild(patch);

const modes=document.querySelector('.reading-modes');
if(modes && !document.querySelector('.mode-help')){
  const help=document.createElement('section');
  help.className='mode-help';
  help.innerHTML=`<strong>Cómo usar estas tres opciones</strong>
    <p><b>Completo:</b> muestra toda la revista; los recuadros de ampliación quedan cerrados para que tú decidas si abrirlos.</p>
    <p><b>Esencial:</b> deja visibles solo los capítulos nucleares del día. No borra nada; vuelve a Completo cuando quieras.</p>
    <p><b>Profundizar:</b> muestra toda la revista y abre automáticamente todos los apartados opcionales de ampliación.</p>
    <p class="mode-status" id="modeStatus">Modo actual: Completo.</p>`;
  modes.insertAdjacentElement('afterend',help);

  const pc=document.createElement('section');
  pc.className='progress-card';
  pc.innerHTML=`<div class="progress-card-top"><div><small>PROGRESO DE LECTURA DE HOY</small><strong id="progressLarge">0 %</strong></div><span id="progressDetail">0 de 0 capítulos recorridos</span></div><div class="progress-track"><div id="progressFillLarge" class="progress-fill"></div></div><small>Se marca un capítulo cuando has avanzado aproximadamente hasta su final. Es una estimación de lectura, no un examen.</small>`;
  help.insertAdjacentElement('afterend',pc);
}

/* ---------- READING MODES ---------- */
function setMode(mode){
  document.body.classList.remove('mode-essential','mode-deep');
  if(mode==='essential') document.body.classList.add('mode-essential');
  if(mode==='deep') document.body.classList.add('mode-deep');
  document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  document.querySelectorAll('details.deep').forEach(d=>{
    if(mode==='deep') d.open=true;
    if(mode==='essential') d.open=false;
    if(mode==='all') d.open=false;
  });
  const labels={all:'Completo — toda la revista visible.',essential:'Esencial — solo el núcleo del día.',deep:'Profundizar — revista completa + ampliaciones abiertas.'};
  const s=document.getElementById('modeStatus'); if(s)s.textContent='Modo actual: '+labels[mode];
  state.mode=mode;save();
  setTimeout(updateProgress,50);
  toast(labels[mode]);
}
document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
setMode(state.mode||'all');

/* ---------- DARK MODE + TOP ---------- */
const themeBtn=document.getElementById('themeBtn');
if(themeBtn) themeBtn.addEventListener('click',()=>{document.body.classList.toggle('dark');state.dark=document.body.classList.contains('dark');save();});
if(state.dark)document.body.classList.add('dark');
const topBtn=document.getElementById('toTop'); if(topBtn)topBtn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

/* ---------- ROBUST READING PROGRESS ---------- */
function visibleTracks(){return [...document.querySelectorAll('.track')].filter(el=>getComputedStyle(el).display!=='none');}
function trackKey(el,i){return el.id||el.dataset.key||('track-'+i);}
function markByScroll(){
  const tracks=visibleTracks();
  state.read=state.read||{};
  tracks.forEach((el,i)=>{
    const r=el.getBoundingClientRect();
    const key=trackKey(el,i);
    const absoluteTop=window.scrollY+r.top;
    const threshold=absoluteTop+Math.max(120,el.offsetHeight*.78);
    const cursor=window.scrollY+window.innerHeight*.72;
    if(cursor>=threshold){state.read[key]=true;globalState.lastSection=key;}
  });
  globalState.lastScroll=window.scrollY;
  save();saveGlobal();updateProgress();
}
function updateProgress(){
  const tracks=visibleTracks();
  let done=0;
  tracks.forEach((el,i)=>{if(state.read?.[trackKey(el,i)])done++;});
  const pct=tracks.length?Math.min(100,Math.round(done/tracks.length*100)):0;
  const bar=document.getElementById('progressBar'); if(bar)bar.style.width=pct+'%';
  const txt=document.getElementById('progressText'); if(txt)txt.textContent=pct+'% leído';
  const large=document.getElementById('progressLarge');if(large)large.textContent=pct+' %';
  const fill=document.getElementById('progressFillLarge');if(fill)fill.style.width=pct+'%';
  const det=document.getElementById('progressDetail');if(det)det.textContent=`${done} de ${tracks.length} capítulos recorridos`;
  globalState.day3Progress={pct,done,total:tracks.length};saveGlobal();
  updateLearningCenterStats();
}
window.addEventListener('scroll',markByScroll,{passive:true});
window.addEventListener('resize',updateProgress,{passive:true});
markByScroll();

/* ---------- EXPAND PARENTING / EXECUTIVE FUNCTIONS ---------- */
const crianza=document.getElementById('crianza');
if(crianza && !document.getElementById('execExpanded')){
  const block=document.createElement('div');block.id='execExpanded';block.className='parent-deep';
  block.innerHTML=`
    <h3>Qué son realmente las funciones ejecutivas</h3>
    <p>No son una sola “función” ni una habilidad que se encienda de golpe. El término reúne procesos de control que permiten mantener una meta activa, frenar una respuesta automática y cambiar de estrategia cuando la situación lo exige. En la infancia están en pleno desarrollo y dependen mucho de la maduración, el sueño, el lenguaje, el estrés, la motivación y el contexto. Por eso un niño puede mostrar buen autocontrol en un juego tranquilo y perderlo por completo cuando está cansado o frustrado.</p>
    <div class="exec-grid"><div><b>Memoria de trabajo</b><span>Mantener temporalmente una regla o pequeña cantidad de información y usarla.</span></div><div><b>Control inhibitorio</b><span>Frenar una acción dominante, esperar o detener el cuerpo cuando cambia una señal.</span></div><div><b>Flexibilidad cognitiva</b><span>Cambiar de regla, perspectiva o estrategia cuando el contexto cambia.</span></div></div>
    <p><strong>Qué buscamos al jugar:</strong> práctica breve, repetida y divertida. No buscamos “acelerar el cerebro”, diagnosticar nada ni convertir cada momento familiar en estimulación cognitiva.</p>
    <h3>Para ~18 meses: microjuegos de 30 segundos a 3 minutos</h3>
    <div class="age-plan"><section><h4>1 · Vamos / Quietos</h4><p>Baila y detente cuando pares la música. Al principio modela tú la respuesta.</p><p><b>Entrena:</b> señal → pausa corporal.</p></section><section><h4>2 · Dame / Espera / Toma</h4><p>Turnos muy cortos con un objeto seguro. La espera debe ser mínima.</p><p><b>Entrena:</b> turnos e inhibición inicial.</p></section><section><h4>3 · ¿Dónde está?</h4><p>Esconde parcialmente un juguete bajo un pañuelo y deja que lo busque.</p><p><b>Entrena:</b> mantener una meta breve.</p></section><section><h4>4 · Imita y cambia</h4><p>Una palmada, luego tocar la mesa. Alterna dos acciones sencillas.</p><p><b>Entrena:</b> imitación y cambio de respuesta.</p></section></div>
    <aside class="quote"><b>Frases útiles:</b> “Ahora paramos.” · “Esperamos un poquito.” · “Te toca.” · “Ahora cambiamos.”</aside>
    <p><strong>Si no lo hace:</strong> reduce dificultad, modela la respuesta y termina mientras siga siendo juego. No conviertas una respuesta fallida en una conclusión sobre su autocontrol.</p>
    <h3>Para 5 años: reglas mentales</h3>
    <div class="age-plan"><section><h4>1 · Día / Noche invertido</h4><p>Aprende una regla y después inviértela.</p><p><b>Entrena:</b> memoria de trabajo + inhibición + flexibilidad.</p></section><section><h4>2 · Simón dice</h4><p>Solo ejecuta cuando la instrucción empieza con “Simón dice”.</p><p><b>Entrena:</b> atención a regla y frenado.</p></section><section><h4>3 · Clasifica y cambia</h4><p>Primero por color; después por tamaño.</p><p><b>Entrena:</b> abandonar una regla ya aprendida.</p></section><section><h4>4 · Plan de tres pasos</h4><p>Antes de una tarea: primero, después y al final.</p><p><b>Entrena:</b> planificación y seguimiento.</p></section></div>
    <p><strong>Metacognición útil:</strong> en lugar de “te equivocaste”, pregunta “¿qué regla estaba usando tu cerebro?” o “¿qué nos ayudaría a recordar la nueva?”.</p>
    <h3>Una semana sin convertir la casa en un laboratorio</h3>
    <div class="week-plan"><div><b>Lunes</b><span>Vamos/Quietos o Simón dice</span></div><div><b>Martes</b><span>Turnos</span></div><div><b>Miércoles</b><span>Cambiar clasificación</span></div><div><b>Jueves</b><span>Cuento: primero/después</span></div><div><b>Viernes</b><span>Baile con señales</span></div><div><b>Sábado</b><span>Planear una tarea</span></div><div><b>Domingo</b><span>Juego libre</span></div></div>
    <h3>Qué evitar</h3><p><strong>1.</strong> Practicar agotados y llamar “falta de capacidad” al cansancio. <strong>2.</strong> Dar demasiadas instrucciones. <strong>3.</strong> Convertir el juego en evaluación. <strong>4.</strong> Comparar niños. <strong>5.</strong> Usar estos juegos como diagnóstico casero.</p>
    <aside class="key"><strong>Qué recordar:</strong> retos pequeños, repetidos, ajustados a la edad y dentro de una relación tranquila. El adulto presta estructura; el niño practica.</aside>`;
  crianza.appendChild(block);
}

/* ---------- QUIZ ---------- */
function paint(q,choice,answer){
  q.querySelectorAll('[data-choice]').forEach(btn=>{btn.classList.remove('correct','wrong');if(btn.dataset.choice===choice)btn.classList.add(choice===answer?'correct':'wrong');});
  const f=q.querySelector('.feedback');if(!f)return;
  if(choice===answer){f.textContent='Correcto. Lo espaciaré más en futuras recuperaciones.';f.className='feedback good';}
  else{f.textContent='Incorrecto. Este concepto deberá reaparecer antes.';f.className='feedback bad';}
}
document.querySelectorAll('.q[data-answer]').forEach(q=>{
  const k=q.dataset.key,a=q.dataset.answer;if(state[k])paint(q,state[k],a);
  q.querySelectorAll('[data-choice]').forEach(btn=>btn.addEventListener('click',()=>{state[k]=btn.dataset.choice;save();paint(q,state[k],a);updateQuizSummary();}));
});
document.querySelectorAll('.open-q').forEach(q=>{
  const k=q.dataset.key,ta=q.querySelector('textarea'),btn=q.querySelector('.save-open');if(state[k])ta.value=state[k];
  if(btn)btn.addEventListener('click',()=>{state[k]=ta.value.trim();save();const f=q.querySelector('.feedback');if(f){f.textContent=state[k]?'Guardado en este dispositivo.':'Escribe algo antes de guardar.';f.className=state[k]?'feedback good':'feedback bad';}updateQuizSummary();});
});
function updateQuizSummary(){let correct=0,answered=0,total=0;document.querySelectorAll('.q[data-answer]').forEach(q=>{total++;const v=state[q.dataset.key];if(v){answered++;if(v===q.dataset.answer)correct++;}});const s=document.getElementById('quizScore');if(s)s.textContent=`${correct}/${total} correctos`;const qs=document.getElementById('quizState');if(qs)qs.textContent=answered===total?'Cerrados completados':'En progreso';globalState.quiz={correct,answered,total};saveGlobal();updateLearningCenterStats();}
updateQuizSummary();
const reset=document.getElementById('resetQuiz');if(reset)reset.addEventListener('click',()=>{document.querySelectorAll('.q[data-key],.open-q[data-key]').forEach(q=>delete state[q.dataset.key]);save();location.reload();});
const copy=document.getElementById('copySummary');if(copy)copy.addEventListener('click',async()=>{const lines=['CULTURA365_RESULTADOS DIA3'];let correct=0,total=0;document.querySelectorAll('.q[data-answer]').forEach(q=>{total++;const v=state[q.dataset.key]||'-';const ok=v===q.dataset.answer;if(ok)correct++;lines.push(`${q.dataset.key}:${v}:${ok?'OK':'REVISAR'}`);});document.querySelectorAll('.open-q').forEach(q=>lines.push(`${q.dataset.key}:${(state[q.dataset.key]||'SIN_RESPUESTA').replace(/\s+/g,' ').slice(0,240)}`));lines.push(`CERRADAS:${correct}/${total}`);const text=lines.join('\n');try{await navigator.clipboard.writeText(text);toast('Resumen copiado. Pégalo en ChatGPT.');}catch{toast('No pude copiar automáticamente.');}});

/* ---------- ADVANCED LEARNING CENTER ---------- */
const adv=document.createElement('style');
adv.textContent=`
.learning-dock{position:fixed;left:18px;bottom:18px;z-index:95;display:flex;gap:8px}.learning-dock button{border:0;border-radius:999px;background:var(--ink);color:var(--paper);padding:11px 15px;box-shadow:var(--shadow);font-weight:800;cursor:pointer}.learning-dock .continue-btn{background:var(--gold);color:#17120b}
.learning-panel{position:fixed;z-index:110;top:0;right:-460px;width:min(440px,94vw);height:100vh;background:var(--paper);border-left:1px solid var(--line);box-shadow:-18px 0 50px rgba(0,0,0,.14);transition:.28s;overflow:auto;padding:24px}.learning-panel.open{right:0}.panel-head{display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:var(--paper);padding:4px 0 16px;z-index:2}.panel-head h2{font:800 30px Georgia,serif;margin:0}.panel-close{border:1px solid var(--line);background:var(--paper);color:var(--ink);border-radius:50%;width:38px;height:38px;cursor:pointer}.tool-section{border-top:1px solid var(--line);padding:18px 0}.tool-section h3{font:700 20px Georgia,serif;margin:0 0 10px}.tool-section input[type=search],.tool-section textarea{width:100%;padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);font:inherit}.search-results{display:grid;gap:7px;margin-top:10px}.search-result{display:block;padding:10px;border-radius:9px;background:var(--sage);color:var(--ink);text-decoration:none}.mini-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mini-stat{padding:12px;border:1px solid var(--line);border-radius:10px}.mini-stat b,.mini-stat span{display:block}.mini-stat b{font-size:22px;font-family:Georgia,serif}.mini-stat span{font-size:12px;color:var(--muted)}
.story-tools{display:flex;gap:7px;justify-content:flex-end;margin:-2px 0 12px}.story-tools button{border:1px solid var(--line);background:var(--paper);color:var(--ink);border-radius:999px;padding:6px 10px;cursor:pointer;font-size:12px}.story-tools button.active{background:var(--gold);color:#17120b;border-color:var(--gold)}.note-box{display:none;margin:10px 0 18px;padding:13px;background:var(--sage);border-radius:11px}.note-box.open{display:block}.note-box textarea{width:100%;min-height:90px}.note-box button{margin-top:7px;border:0;background:var(--forest);color:white;padding:8px 11px;border-radius:8px;cursor:pointer}.favorite-list,.note-list{display:grid;gap:7px}.saved-item{padding:10px;border:1px solid var(--line);border-radius:9px}.saved-item a{color:var(--forest);font-weight:750;text-decoration:none}.concept-cloud{display:flex;flex-wrap:wrap;gap:6px}.concept-chip{border:1px solid var(--line);border-radius:999px;padding:6px 9px;background:var(--paper);color:var(--ink);cursor:pointer;font-size:12px}.search-hit{outline:3px solid color-mix(in srgb,var(--gold) 55%,transparent);outline-offset:4px}.continue-card{max-width:900px;margin:16px auto;padding:15px 18px;border:1px solid var(--line);border-radius:14px;background:var(--paper);display:flex;align-items:center;justify-content:space-between;gap:15px}.continue-card button{border:0;background:var(--forest);color:#fff;padding:10px 14px;border-radius:9px;cursor:pointer;font-weight:750}.continue-card small{color:var(--muted);display:block}.week-summary{padding:13px;background:var(--sage);border-radius:10px}.route-mini{display:grid;gap:8px}.route-mini-row{display:grid;grid-template-columns:110px 1fr auto;gap:8px;align-items:center}.route-mini-bar{height:7px;border-radius:99px;background:var(--line);overflow:hidden}.route-mini-bar i{display:block;height:100%;background:var(--gold)}
@media(max-width:700px){.learning-dock{left:10px;bottom:12px}.learning-dock button{padding:10px 12px}.continue-card{align-items:flex-start;flex-direction:column}.story-tools{justify-content:flex-start}.route-mini-row{grid-template-columns:90px 1fr auto}}
`;
document.head.appendChild(adv);

function sectionTitle(el){return el.querySelector('h2')?.textContent?.trim()||el.querySelector('h3')?.textContent?.trim()||el.id||'Sección';}
function scrollToSection(el){el.scrollIntoView({behavior:'smooth',block:'start'});el.classList.add('search-hit');setTimeout(()=>el.classList.remove('search-hit'),1800);}
function nextUnread(){const tracks=visibleTracks();return tracks.find((el,i)=>!state.read?.[trackKey(el,i)])||tracks[tracks.length-1];}

const dock=document.createElement('div');dock.className='learning-dock';dock.innerHTML=`<button class="continue-btn" id="continueReading">▶ Seguir leyendo</button><button id="openLearning">☰ Mi aprendizaje</button>`;document.body.appendChild(dock);
const panel=document.createElement('aside');panel.className='learning-panel';panel.id='learningPanel';panel.innerHTML=`
<div class="panel-head"><h2>Mi aprendizaje</h2><button class="panel-close" id="closeLearning">×</button></div>
<section class="tool-section"><h3>Estado de hoy</h3><div class="mini-stats"><div class="mini-stat"><b id="lcProgress">0%</b><span>lectura recorrida</span></div><div class="mini-stat"><b id="lcQuiz">0/0</b><span>checkpoints correctos</span></div><div class="mini-stat"><b id="lcFavs">0</b><span>favoritos</span></div><div class="mini-stat"><b id="lcNotes">0</b><span>notas personales</span></div></div></section>
<section class="tool-section"><h3>Buscar dentro de la edición</h3><input id="siteSearch" type="search" placeholder="Ej.: riesgo, Roma, música, Ingrid…"><div id="searchResults" class="search-results"></div></section>
<section class="tool-section"><h3>Biblioteca de conceptos</h3><div id="conceptCloud" class="concept-cloud"></div></section>
<section class="tool-section"><h3>Rutas activas</h3><div class="route-mini"><div class="route-mini-row"><span>Roma</span><div class="route-mini-bar"><i style="width:10%"></i></div><b>3/30</b></div><div class="route-mini-row"><span>Fotografía</span><div class="route-mini-bar"><i style="width:10%"></i></div><b>3/30</b></div><div class="route-mini-row"><span>Música</span><div class="route-mini-bar"><i style="width:4%"></i></div><b>inicio</b></div><div class="route-mini-row"><span>Geografía</span><div class="route-mini-bar"><i style="width:12%"></i></div><b>Asia E.</b></div></div></section>
<section class="tool-section"><h3>Favoritos</h3><div id="favoriteList" class="favorite-list"><small>Aún no has guardado capítulos.</small></div></section>
<section class="tool-section"><h3>Notas personales</h3><div id="noteList" class="note-list"><small>Aún no has escrito notas.</small></div></section>
<section class="tool-section"><h3>Resumen de esta edición</h3><div id="weekSummary" class="week-summary"></div></section>`;document.body.appendChild(panel);

document.getElementById('openLearning').addEventListener('click',()=>panel.classList.add('open'));
document.getElementById('closeLearning').addEventListener('click',()=>panel.classList.remove('open'));
document.getElementById('continueReading').addEventListener('click',()=>{const el=nextUnread();if(el){scrollToSection(el);toast('Continuamos por: '+sectionTitle(el));}});

const progressCard=document.querySelector('.progress-card');
if(progressCard && !document.querySelector('.continue-card')){
  const c=document.createElement('section');c.className='continue-card';c.innerHTML=`<div><b>¿Vuelves más tarde?</b><small>CULTURA 365 recuerda en este navegador por dónde ibas. El botón te lleva al primer capítulo aún no recorrido.</small></div><button id="continueInline">Seguir donde lo dejé →</button>`;progressCard.insertAdjacentElement('afterend',c);document.getElementById('continueInline').addEventListener('click',()=>{const el=nextUnread();if(el)scrollToSection(el);});
}

/* Favorite + notes controls on each substantial section */
globalState.favorites=globalState.favorites||{};globalState.notes=globalState.notes||{};
document.querySelectorAll('.story.track, .routes-grid article').forEach((el,i)=>{
  if(!el.id)el.id='section-'+i;
  const key='dia3:'+el.id;
  const title=sectionTitle(el);
  const tools=document.createElement('div');tools.className='story-tools';
  const fav=document.createElement('button');fav.type='button';fav.textContent='☆ Guardar';
  if(globalState.favorites[key]){fav.classList.add('active');fav.textContent='★ Guardado';}
  fav.addEventListener('click',()=>{if(globalState.favorites[key]){delete globalState.favorites[key];fav.classList.remove('active');fav.textContent='☆ Guardar';toast('Quitado de favoritos');}else{globalState.favorites[key]={title,id:el.id,day:3};fav.classList.add('active');fav.textContent='★ Guardado';toast('Guardado para releer');}saveGlobal();renderSaved();updateLearningCenterStats();});
  const note=document.createElement('button');note.type='button';note.textContent='✎ Nota';
  tools.append(fav,note);
  const meta=el.querySelector('.story-meta')||el.firstElementChild; if(meta)meta.insertAdjacentElement('afterend',tools);else el.prepend(tools);
  const nb=document.createElement('div');nb.className='note-box';nb.innerHTML=`<textarea placeholder="Escribe aquí tu idea, duda o conexión personal…"></textarea><button type="button">Guardar nota</button>`;tools.insertAdjacentElement('afterend',nb);
  const ta=nb.querySelector('textarea');if(globalState.notes[key])ta.value=globalState.notes[key].text;
  note.addEventListener('click',()=>nb.classList.toggle('open'));
  nb.querySelector('button').addEventListener('click',()=>{const text=ta.value.trim();if(text){globalState.notes[key]={title,id:el.id,day:3,text};toast('Nota guardada');}else{delete globalState.notes[key];toast('Nota eliminada');}saveGlobal();renderSaved();updateLearningCenterStats();});
});

function renderSaved(){
  const fl=document.getElementById('favoriteList');const nl=document.getElementById('noteList');
  const favs=Object.values(globalState.favorites||{});const notes=Object.values(globalState.notes||{});
  fl.innerHTML=favs.length?favs.map(x=>`<div class="saved-item"><a href="#${x.id}" data-jump="${x.id}">${x.title}</a><small> · Día ${x.day}</small></div>`).join(''):'<small>Aún no has guardado capítulos.</small>';
  nl.innerHTML=notes.length?notes.map(x=>`<div class="saved-item"><a href="#${x.id}" data-jump="${x.id}">${x.title}</a><p>${x.text.replace(/[<>]/g,'')}</p></div>`).join(''):'<small>Aún no has escrito notas.</small>';
  panel.querySelectorAll('[data-jump]').forEach(a=>a.addEventListener('click',(e)=>{e.preventDefault();const el=document.getElementById(a.dataset.jump);if(el){panel.classList.remove('open');scrollToSection(el);}}));
}

const concepts=['hagiografía','amenaza × exposición × vulnerabilidad','conductividad térmica','asterismo','anualidad','colegialidad','patricios','plebeyos','tribuno de la plebe','ostinato','timbre','funciones ejecutivas','memoria de trabajo','control inhibitorio','flexibilidad cognitiva','riesgo relativo','riesgo absoluto','NNT','cuneiforme','conjunción aparente'];
const cc=document.getElementById('conceptCloud');cc.innerHTML=concepts.map(c=>`<button class="concept-chip" data-concept="${c}">${c}</button>`).join('');
cc.querySelectorAll('.concept-chip').forEach(b=>b.addEventListener('click',()=>{document.getElementById('siteSearch').value=b.dataset.concept;runSearch(b.dataset.concept);}));

function runSearch(term){
  const q=(term||'').trim().toLowerCase();const results=document.getElementById('searchResults');
  if(q.length<2){results.innerHTML='';return;}
  const hits=[...document.querySelectorAll('.story, .routes-grid article, .dashboard article')].filter(el=>el.textContent.toLowerCase().includes(q)).slice(0,12);
  results.innerHTML=hits.length?hits.map((el,i)=>`<a class="search-result" href="#${el.id||''}" data-search-index="${i}">${sectionTitle(el)}</a>`).join(''):'<small>No encuentro ese término en la edición de hoy.</small>';
  results.querySelectorAll('[data-search-index]').forEach((a,i)=>a.addEventListener('click',(e)=>{e.preventDefault();panel.classList.remove('open');scrollToSection(hits[i]);}));
}
document.getElementById('siteSearch').addEventListener('input',e=>runSearch(e.target.value));

function updateLearningCenterStats(){
  const p=globalState.day3Progress||{pct:0,done:0,total:0};const q=globalState.quiz||{correct:0,total:0};
  const a=document.getElementById('lcProgress');if(a)a.textContent=p.pct+'%';
  const b=document.getElementById('lcQuiz');if(b)b.textContent=`${q.correct}/${q.total}`;
  const c=document.getElementById('lcFavs');if(c)c.textContent=Object.keys(globalState.favorites||{}).length;
  const d=document.getElementById('lcNotes');if(d)d.textContent=Object.keys(globalState.notes||{}).length;
  const ws=document.getElementById('weekSummary');if(ws)ws.innerHTML=`<b>Día 3</b><p>Has recorrido <strong>${p.done}/${p.total}</strong> capítulos visibles (${p.pct} %), acertado <strong>${q.correct}/${q.total}</strong> checkpoints cerrados, guardado <strong>${Object.keys(globalState.favorites||{}).length}</strong> favoritos y escrito <strong>${Object.keys(globalState.notes||{}).length}</strong> notas.</p><small>Cuando acumulemos más días, esta tarjeta se convertirá en un resumen semanal comparativo.</small>`;
}
renderSaved();updateLearningCenterStats();
