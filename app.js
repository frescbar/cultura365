const KEY='cultura365-dia3-magazine-v3';
const state=JSON.parse(localStorage.getItem(KEY)||'{}');
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));

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

  // Details are semantic accordions: CSS alone does not open them.
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
function markByScroll(){
  const tracks=visibleTracks();
  state.read=state.read||{};
  // A long chapter is marked when the viewport has passed 78% of its height.
  tracks.forEach((el,i)=>{
    const r=el.getBoundingClientRect();
    const key=el.id||el.dataset.key||('track-'+i);
    const absoluteTop=window.scrollY+r.top;
    const threshold=absoluteTop+Math.max(120,el.offsetHeight*.78);
    const cursor=window.scrollY+window.innerHeight*.72;
    if(cursor>=threshold)state.read[key]=true;
  });
  save();updateProgress();
}
function updateProgress(){
  const tracks=visibleTracks();
  let done=0;
  tracks.forEach((el,i)=>{const key=el.id||el.dataset.key||('track-'+i);if(state.read?.[key])done++;});
  const pct=tracks.length?Math.min(100,Math.round(done/tracks.length*100)):0;
  const bar=document.getElementById('progressBar'); if(bar)bar.style.width=pct+'%';
  const txt=document.getElementById('progressText'); if(txt)txt.textContent=pct+'% leído';
  const large=document.getElementById('progressLarge');if(large)large.textContent=pct+' %';
  const fill=document.getElementById('progressFillLarge');if(fill)fill.style.width=pct+'%';
  const det=document.getElementById('progressDetail');if(det)det.textContent=`${done} de ${tracks.length} capítulos recorridos`;
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
    <div class="exec-grid">
      <div><b>Memoria de trabajo</b><span>Mantener temporalmente una regla o pequeña cantidad de información y usarla: “primero guarda el coche y después trae los zapatos”.</span></div>
      <div><b>Control inhibitorio</b><span>Frenar una acción dominante o esperar: no tocar todavía, esperar turno, detener el cuerpo cuando cambia una señal.</span></div>
      <div><b>Flexibilidad cognitiva</b><span>Cambiar de regla, perspectiva o estrategia: ordenar por color y luego por forma; aceptar que un plan cambió.</span></div>
    </div>
    <p><strong>Qué buscamos al jugar:</strong> práctica breve, repetida y suficientemente divertida como para que el niño quiera seguir. No buscamos “acelerar el cerebro”, diagnosticar nada ni convertir cada momento familiar en estimulación cognitiva. La evidencia del desarrollo apoya la importancia de interacciones responsivas, juego y oportunidades de practicar autorregulación; eso es muy distinto a prometer que un juego concreto producirá una mejora general y permanente del intelecto.</p>

    <h3>Para ~18 meses: microjuegos de 30 segundos a 3 minutos</h3>
    <div class="age-plan">
      <section><h4>1 · Vamos / Quietos</h4><p>Empieza con una oposición muy clara: movimiento y pausa. Baila con él y detente cuando pares la música. Al principio tú haces de modelo; no esperes obediencia perfecta.</p><p><b>Progresión:</b> cuando entienda el juego, retrasa un segundo tu propia parada para observar si él anticipa la señal.</p></section>
      <section><h4>2 · Dame / Espera / Toma</h4><p>Con un objeto seguro, alterna turnos muy cortos. “Dame… gracias… espera… toma”. La espera debe ser mínima. El objetivo no es someterlo a frustración, sino introducir el concepto de turno.</p></section>
      <section><h4>3 · ¿Dónde está?</h4><p>Esconde parcialmente un juguete bajo un pañuelo y deja que lo busque. Después aumenta ligeramente la dificultad. Aquí trabajas mantener una representación breve del objeto y una meta de búsqueda.</p></section>
      <section><h4>4 · Imita y cambia</h4><p>Tú das una palmada y él imita. Luego golpeas suavemente la mesa. Alternar dos acciones sencillas introduce cambio de regla sin lenguaje complejo.</p></section>
    </div>
    <aside class="quote"><b>Frases útiles:</b> “Ahora paramos.” · “Esperamos un poquito.” · “Te toca.” · “Ahora cambiamos.” Cortas, concretas y acompañadas del gesto.</aside>
    <p><strong>Si no lo hace:</strong> a esta edad no concluyas “no tiene autocontrol”. Reduce la dificultad, modela tú la respuesta y termina mientras siga siendo un juego. El objetivo es crear oportunidades, no obtener una puntuación.</p>

    <h3>Para 5 años: ya podemos jugar con reglas mentales</h3>
    <div class="age-plan">
      <section><h4>1 · Día / Noche invertido</h4><p>Primero aprende una regla fácil: Día = manos arriba; Noche = suelo. Después la inviertes. La dificultad está justamente en que la regla anterior sigue compitiendo en su mente.</p></section>
      <section><h4>2 · Simón dice</h4><p>Solo se ejecuta la acción cuando aparece “Simón dice…”. Alterna instrucciones fáciles y alguna tentación divertida. Trabaja escucha, inhibición y mantenimiento de regla.</p></section>
      <section><h4>3 · Clasifica y cambia</h4><p>Usa cartas, bloques o juguetes. Primero clasifica por color. A mitad del juego anuncia: “Ahora la regla cambia: por tamaño”. No importa la velocidad; importa que pueda abandonar la regla anterior.</p></section>
      <section><h4>4 · Plan de tres pasos</h4><p>Antes de una actividad sencilla pregunta: “¿Qué hacemos primero, después y al final?”. Por ejemplo, preparar una mochila. Luego deja que compruebe su propio plan.</p></section>
    </div>
    <p><strong>La intervención adulta cambia:</strong> a los 5 años ya puedes hacer metacognición básica. En vez de decir “te equivocaste”, pregunta: “¿Qué regla estaba usando tu cerebro?” o “¿Qué podríamos hacer para recordarla?”. Así el error se convierte en información sobre la estrategia.</p>

    <h3>Una semana de práctica sin convertir la casa en un laboratorio</h3>
    <div class="week-plan">
      <div><b>Lunes</b><span>Vamos / Quietos o Simón dice · 3–5 min</span></div><div><b>Martes</b><span>Juego de turnos · 3 min</span></div><div><b>Miércoles</b><span>Clasificar y cambiar regla · 5 min</span></div><div><b>Jueves</b><span>Cuento: “¿qué pasó primero/después?”</span></div><div><b>Viernes</b><span>Baile con cambios de señal</span></div><div><b>Sábado</b><span>Planear juntos una tarea familiar</span></div><div><b>Domingo</b><span>Juego libre; observar sin dirigir</span></div>
    </div>
    <h3>Qué evitar</h3>
    <p><strong>1.</strong> Practicar cuando están agotados y después interpretar el fracaso como falta de capacidad. <strong>2.</strong> Dar cinco instrucciones simultáneas a un niño pequeño. <strong>3.</strong> Premiar cada respuesta correcta hasta convertir el juego en evaluación. <strong>4.</strong> Comparar a hermanos o compañeros. <strong>5.</strong> Usar estas actividades como prueba diagnóstica casera. La variabilidad normal es enorme y una conducta aislada no permite inferir un trastorno.</p>
    <aside class="key"><strong>Qué debes recordar:</strong> las funciones ejecutivas se ejercitan mejor mediante retos pequeños, repetidos, ajustados a la edad y dentro de una relación tranquila. El adulto presta estructura; el niño pone la práctica.</aside>
  `;
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
function updateQuizSummary(){let correct=0,answered=0,total=0;document.querySelectorAll('.q[data-answer]').forEach(q=>{total++;const v=state[q.dataset.key];if(v){answered++;if(v===q.dataset.answer)correct++;}});const s=document.getElementById('quizScore');if(s)s.textContent=`${correct}/${total} correctos`;const qs=document.getElementById('quizState');if(qs)qs.textContent=answered===total?'Cerrados completados':'En progreso';}
updateQuizSummary();
const reset=document.getElementById('resetQuiz');if(reset)reset.addEventListener('click',()=>{document.querySelectorAll('.q[data-key],.open-q[data-key]').forEach(q=>delete state[q.dataset.key]);save();location.reload();});
const copy=document.getElementById('copySummary');if(copy)copy.addEventListener('click',async()=>{const lines=['CULTURA365_RESULTADOS DIA3'];let correct=0,total=0;document.querySelectorAll('.q[data-answer]').forEach(q=>{total++;const v=state[q.dataset.key]||'-';const ok=v===q.dataset.answer;if(ok)correct++;lines.push(`${q.dataset.key}:${v}:${ok?'OK':'REVISAR'}`);});document.querySelectorAll('.open-q').forEach(q=>lines.push(`${q.dataset.key}:${(state[q.dataset.key]||'SIN_RESPUESTA').replace(/\s+/g,' ').slice(0,240)}`));lines.push(`CERRADAS:${correct}/${total}`);const text=lines.join('\n');try{await navigator.clipboard.writeText(text);toast('Resumen copiado. Pégalo en ChatGPT.');}catch{toast('No pude copiar automáticamente.');}});
