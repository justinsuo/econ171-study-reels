'use strict';
const $=s=>document.querySelector(s),feed=$('#feed'),drawer=$('#drawer');
let data=[],queue=[],active=0,started=false,muted=false,speed=1,observer,serial=0,toastTimer;
let progress={};try{progress=JSON.parse(localStorage.getItem('econ171-reels-v1')||'{}')}catch{}
const save=()=>{try{localStorage.setItem('econ171-reels-v1',JSON.stringify(progress))}catch{}updateMastery()};
function updateMastery(){$('#mastery').textContent=`${Object.keys(progress).filter(id=>progress[id].attempts).length} / 36 checked`}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2400)}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function reviewWeight(s){const p=progress[s.id];return !p?4:p.lastCorrect?Math.max(.3,1/(p.correct||1)):10}
function chooseReview(){const recent=queue.slice(-4).map(q=>q.s.id),pool=data.filter(s=>!recent.includes(s.id));let n=Math.random()*pool.reduce((t,s)=>t+reviewWeight(s),0);for(const s of pool){n-=reviewWeight(s);if(n<=0)return s}return pool[0]}
function scheduleRetry(s,at){if(queue.slice(at+1,at+6).some(x=>x.s.id===s.id))return;const rec=makeReel(s,true),pos=Math.min(at+5,queue.length);feed.insertBefore(rec.article,queue[pos]?.article||null);queue.splice(pos,0,rec);observer.observe(rec.article)}
function append(s,review=false){const rec=makeReel(s,review);queue.push(rec);feed.append(rec.article);observer?.observe(rec.article)}
function go(i){if(i>=queue.length)append(chooseReview(),true);if(i<0)return;queue[i].article.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'})}
function hydrate(i){for(let j=Math.max(0,i-1);j<=Math.min(queue.length-1,i+1);j++){let r=queue[j];if(!r.v.getAttribute('src')){r.v.src=`videos/${r.s.id}.mp4`;r.v.preload=j===i?'auto':'metadata'}}}
function syncControls(){queue.forEach(r=>{r.v.muted=muted;r.v.playbackRate=speed;r.mute.textContent=muted?'Sound off':'Sound on';r.rate.value=String(speed)})}
function play(r){if(!started||!r.quiz.hidden||!r.source.hidden)return;r.v.play().then(()=>r.indicator.hidden=true).catch(()=>{r.indicator.hidden=false;r.indicator.textContent='▶'})}
function activate(rec){let i=queue.indexOf(rec);if(i<0)return;active=i;queue.forEach(r=>{if(r!==rec)r.v.pause()});hydrate(i);syncControls();play(rec);if(i>=queue.length-2)append(chooseReview(),true)}
function makeReel(s,review){
 const article=el('article','reel');article.setAttribute('aria-label',`${s.topic}: ${s.title}`);article.dataset.key=String(++serial);
 const phone=el('div','phone'),v=el('video');v.playsInline=true;v.preload='none';v.poster=`posters/${s.id}.jpg`;v.setAttribute('aria-label',s.title);v.setAttribute('tabindex','0');
 const indicator=el('div','pause-indicator','▶');indicator.hidden=true;const seek=el('div','seek'),duration=el('span','duration',`${Math.round(s.duration||25)}s${review?' · REVIEW':''}`);
 const bar=el('div','player-bar'),pause=el('button','', 'Pause'),mute=el('button','','Sound on'),rate=el('select');rate.setAttribute('aria-label','Playback speed');for(const n of [1,1.25,1.5]){let o=el('option','',`${n}×`);o.value=n;rate.append(o)}
 const reading=el('button','','Source'),next=el('button','','Next ↑');bar.append(pause,mute,rate,reading,next);
 const quiz=el('section','quiz');quiz.hidden=true;quiz.setAttribute('aria-label','Recall question');quiz.append(el('p','eyebrow',review?'BACK FOR A QUICK CHECK':'MAKE IT STICK'),el('h2','',s.question));
 const answers=s.options.map((opt,i)=>{const b=el('button','answer');b.append(el('span','',String.fromCharCode(65+i)),document.createTextNode(opt));quiz.append(b);return b});
 const feedback=el('p','feedback'),actions=el('div','quiz-actions'),replay=el('button','','↺ Replay'),again=el('button','','Again soon'),forward=el('button','next','Next reel ↑');actions.append(replay,again,forward);quiz.append(feedback,actions);
 const source=el('section','source');source.hidden=true;source.append(el('p','eyebrow','FROM YOUR COURSE'),el('h2','',s.title),el('p','',s.source));const back=el('button','pill','Back to reel');source.append(back);
 phone.append(v,indicator,duration,quiz,source,seek,bar);article.append(phone);const rec={s,article,v,indicator,seek,quiz,source,mute,rate,pause,answered:false};
 function toggle(){if(!started){started=true;$('#welcome').hidden=true}if(v.paused){play(rec)}else v.pause()}
 v.onclick=toggle;v.onkeydown=e=>{if(e.code==='Space'){e.preventDefault();e.stopPropagation();toggle()}};pause.onclick=()=>{if(!quiz.hidden){quiz.hidden=true;v.currentTime=0}toggle()};
 v.onplay=()=>{pause.textContent='Pause';indicator.hidden=true};v.onpause=()=>{pause.textContent='Play';if(quiz.hidden&&source.hidden)indicator.hidden=false};
 v.ontimeupdate=()=>seek.style.width=`${100*v.currentTime/(v.duration||1)}%`;v.onended=()=>{quiz.hidden=false;indicator.hidden=true;pause.textContent='Replay'};
 v.onerror=()=>{indicator.hidden=false;indicator.textContent='↻';toast('Video could not load. Tap to retry.')};
 mute.onclick=()=>{muted=!muted;syncControls();if(v.paused&&quiz.hidden)play(rec)};rate.onchange=()=>{speed=Number(rate.value);syncControls()};next.onclick=forward.onclick=()=>go(queue.indexOf(rec)+1);
 reading.onclick=()=>{v.pause();source.hidden=false;indicator.hidden=true};back.onclick=()=>{source.hidden=true;play(rec)};
 replay.onclick=()=>{quiz.hidden=true;v.currentTime=0;play(rec)};
 again.onclick=()=>{progress[s.id]={...(progress[s.id]||{}),lastCorrect:false};save();scheduleRetry(s,queue.indexOf(rec));toast('Queued again in a few reels');again.disabled=true};
 answers.forEach((b,i)=>b.onclick=()=>{if(rec.answered)return;rec.answered=true;answers.forEach(x=>x.disabled=true);answers[s.answer].classList.add('correct');const correct=i===s.answer;if(!correct)b.classList.add('wrong');const p=progress[s.id]||{attempts:0,correct:0};p.attempts=(p.attempts||0)+1;p.correct=(p.correct||0)+(correct?1:0);p.lastCorrect=correct;progress[s.id]=p;save();feedback.textContent=(correct?'Correct. ':'Not quite. ')+s.why+(correct?' Lower review weight now.':' We’ll bring this back soon.');if(!correct)scheduleRetry(s,queue.indexOf(rec))});
 return rec;
}
$('#start').onclick=()=>{started=true;$('#welcome').hidden=true;hydrate(active);syncControls();play(queue[active])};
$('#topics').onclick=()=>{queue[active]?.v.pause();drawer.showModal()};$('#close').onclick=()=>drawer.close();drawer.addEventListener('close',()=>play(queue[active]));
$('#search').oninput=e=>document.querySelectorAll('.topic-item').forEach(b=>b.hidden=!b.dataset.search.includes(e.target.value.toLowerCase()));
$('#reset').onclick=()=>{progress={};save();toast('Quiz progress reset')};
document.addEventListener('keydown',e=>{if(drawer.open||e.target.matches('input,select,button,video'))return;if(e.key==='ArrowDown'){e.preventDefault();go(active+1)}if(e.key==='ArrowUp'){e.preventDefault();go(active-1)}if(e.code==='Space'){e.preventDefault();queue[active]?.pause.click()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)queue[active]?.v.pause()});
fetch('reels.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(d=>{data=d;data.forEach(s=>append(s));observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting&&entry.intersectionRatio>.65){const rec=queue.find(r=>r.article===entry.target);activate(rec)}},{root:feed,threshold:[.65,.8]});queue.forEach(r=>observer.observe(r.article));hydrate(0);updateMastery();for(const s of data){const b=el('button','topic-item');b.dataset.search=[s.title,s.topic,s.narration,...s.beats].join(' ').toLowerCase();b.append(el('span','',s.id));const label=el('div','',s.title);label.append(el('small','',`${s.topic} · ${Math.round(s.duration||25)} sec`));b.append(label);b.onclick=()=>{drawer.close();go(queue.findIndex(r=>r.s.id===s.id))};$('#topic-list').append(b)}}).catch(()=>{$('.welcome-card').innerHTML='<h2>Couldn’t load the reels.</h2><p>Please reload this page.</p>'});
