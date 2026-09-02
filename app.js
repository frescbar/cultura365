const KEY='cultura365-dia3-magazine';
const state=JSON.parse(localStorage.getItem(KEY)||'{}');
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const toast=(msg)=>{const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)};

function setMode(mode){
  document.body.classList.remove('mode-essential','mode-deep');
  if(mode==='essential')document.body.classList.add('mode-essential');
  if(mode==='deep')document.body.classList.add('mode-deep');
  document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  state.mode=mode;save();
}
document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
setMode(state.mode||'all');

document.getElementById('themeBtn').addEventListener('click',()=>{
  document.body.classList.toggle('dark');state.dark=document.body.classList.contains('dark');save();
});
if(state.dark)document.body.classList.add('dark');

document.getElementById('toTop').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

function updateProgress(){
  const tracks=[...document.querySelectorAll('.track')].filter(el=>getComputedStyle(el).display!=='none');
  const visible=tracks.filter(el=>{const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight});
  let reached=0;
  tracks.forEach(el=>{if(state.read?.[el.id||el.dataset.key||tracks.indexOf(el)])reached++});
  const pct=tracks.length?Math.round((reached/tracks.length)*100):0;
  document.getElementById('progressBar').style.width=pct+'%';
  document.getElementById('progressText').textContent=pct+'% leído';
}
const observer=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting&&e.intersectionRatio>.45){
      state.read=state.read||{};
      const tracks=[...document.querySelectorAll('.track')];
      state.read[e.target.id||e.target.dataset.key||tracks.indexOf(e.target)]=true;
      save();updateProgress();
    }
  })
},{threshold:[.45]});
document.querySelectorAll('.track').forEach(el=>observer.observe(el));
window.addEventListener('scroll',updateProgress,{passive:true});

function paint(q,choice,answer){
  q.querySelectorAll('[data-choice]').forEach(btn=>{
    btn.classList.remove('correct','wrong');
    if(btn.dataset.choice===choice)btn.classList.add(choice===answer?'correct':'wrong');
  });
  const f=q.querySelector('.feedback');
  if(choice===answer){f.textContent='Correcto. Lo espaciaré más en futuras recuperaciones.';f.className='feedback good'}
  else{f.textContent='Incorrecto. Este concepto deberá reaparecer antes.';f.className='feedback bad'}
}

document.querySelectorAll('.q[data-answer]').forEach(q=>{
  const k=q.dataset.key,a=q.dataset.answer;
  if(state[k])paint(q,state[k],a);
  q.querySelectorAll('[data-choice]').forEach(btn=>btn.addEventListener('click',()=>{
    state[k]=btn.dataset.choice;save();paint(q,state[k],a);updateQuizSummary();
  }));
});

document.querySelectorAll('.open-q').forEach(q=>{
  const k=q.dataset.key,ta=q.querySelector('textarea'),btn=q.querySelector('.save-open');
  if(state[k])ta.value=state[k];
  btn.addEventListener('click',()=>{
    state[k]=ta.value.trim();save();
    const f=q.querySelector('.feedback');
    f.textContent=state[k]?'Guardado en este dispositivo.':'Escribe algo antes de guardar.';
    f.className=state[k]?'feedback good':'feedback bad';
    updateQuizSummary();
  });
});

function updateQuizSummary(){
  let correct=0,answered=0,total=0;
  document.querySelectorAll('.q[data-answer]').forEach(q=>{
    total++;const v=state[q.dataset.key];if(v){answered++;if(v===q.dataset.answer)correct++;}
  });
  document.getElementById('quizScore').textContent=`${correct}/${total} correctos`;
  document.getElementById('quizState').textContent=answered===total?'Cerrados completados':'En progreso';
}
updateQuizSummary();updateProgress();

document.getElementById('resetQuiz').addEventListener('click',()=>{
  document.querySelectorAll('.q[data-key],.open-q[data-key]').forEach(q=>delete state[q.dataset.key]);
  save();location.reload();
});

document.getElementById('copySummary').addEventListener('click',async()=>{
  const lines=['CULTURA365_RESULTADOS DIA3'];
  let correct=0,total=0;
  document.querySelectorAll('.q[data-answer]').forEach(q=>{total++;const v=state[q.dataset.key]||'-';const ok=v===q.dataset.answer;if(ok)correct++;lines.push(`${q.dataset.key}:${v}:${ok?'OK':'REVISAR'}`)});
  document.querySelectorAll('.open-q').forEach(q=>lines.push(`${q.dataset.key}:${(state[q.dataset.key]||'SIN_RESPUESTA').replace(/\s+/g,' ').slice(0,240)}`));
  lines.push(`CERRADAS:${correct}/${total}`);
  const text=lines.join('\n');
  try{await navigator.clipboard.writeText(text);toast('Resumen copiado. Pégalo en ChatGPT.');}
  catch{toast('No pude copiar automáticamente.');}
});