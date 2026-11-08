'use strict';
(() => {
 const $ = id => document.getElementById(id);
 const HISTORY_KEY = 'celestial-tarot-readings-v1';
 const state = {spread:3,allowReverse:true,question:'',startedAt:null,deck:[],picks:[],revealed:[],saved:false,filter:'all'};
 const SPREADS = {
   1:['此刻的指引'],
   3:['过去（已经形成的影响）','当下（此刻需要看见的处境）','下一步（可以尝试的下一步）'],
   5:['现状（问题的核心）','阻碍（需要正视的困难）','资源（可以利用的支持）','建议（可尝试的行动）','延伸（值得关注的方向）']
 };
 let toastTimer = null;
 const getCard = id => TAROT_CARDS.find(c=>c.id===id);
 function randIndex(n){
  if (globalThis.crypto?.getRandomValues){
   const arr=new Uint32Array(1),limit=0x100000000-(0x100000000%n);
   do{crypto.getRandomValues(arr);}while(arr[0]>=limit);
   return arr[0]%n;
  }
  return Math.floor(Math.random()*n);
 }
 function shuffled(cards){const a=[...cards];for(let i=a.length-1;i>0;i--){const j=randIndex(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
 function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
 function nav(view){document.querySelectorAll('.view').forEach(el=>el.classList.toggle('is-active',el.id===`${view}View`));document.querySelectorAll('.tab').forEach(el=>{el.classList.toggle('is-active',el.dataset.view===view);el.setAttribute('aria-current',el.dataset.view===view?'page':'false');});if(view==='dictionary')renderDictionary();if(view==='history')renderHistory();window.scrollTo({top:0,behavior:'smooth'});}
 function createEl(tag,cls,content){const x=document.createElement(tag);if(cls)x.className=cls;if(content!==undefined)x.textContent=content;return x;}
 function shuffleDeck(){
  if(state.picks.length&&!window.confirm('重新洗牌将清除当前未保存的抽牌结果。确定继续吗？'))return;
  state.spread=Number(document.querySelector('.choice.is-active')?.dataset.spread||3);
  state.allowReverse=$('allowReverse').checked;
  state.question=$('question').value.trim()||'关于当下生活的自我探索';
  state.startedAt=new Date();state.deck=shuffled(TAROT_CARDS.map(c=>c.id));state.picks=[];state.revealed=[];state.saved=false;
  $('deckSection').classList.remove('is-hidden');$('resultSection').classList.remove('is-hidden');
  renderDeck();renderSpread();renderActionState();
  $('deckGrid').classList.add('shuffling');setTimeout(()=>$('deckGrid').classList.remove('shuffling'),760);
  $('deckSection').scrollIntoView({behavior:'smooth',block:'start'});
  toast('78张牌已洗匀，现在由你亲自选牌 ✧');
 }
 function renderDeck(){
  const grid=$('deckGrid');grid.replaceChildren();
  const chosen=new Set(state.picks.map(p=>p.position));
  const fragment=document.createDocumentFragment();
  state.deck.forEach((id,i)=>{
   const b=createEl('button',`deck-card${chosen.has(i)?' selected':''}`);
   b.type='button';b.title=`洗牌后第${i+1}张`;b.setAttribute('aria-label',`第${i+1}张牌${chosen.has(i)?'，已选取':'，点击抽取'}`);b.style.setProperty('--order',i);
   b.disabled=chosen.has(i)||state.picks.length>=state.spread;
   b.addEventListener('click',()=>chooseCard(i));fragment.appendChild(b);
  });
  grid.appendChild(fragment);updateDeckStatus();
 }
 function updateDeckStatus(){
  const count=state.picks.length;
  $('pickedCount').textContent=count;$('requiredCount').textContent=state.spread;
  $('drawProgress').style.width=`${count/state.spread*100}%`;
  $('pickStatus').textContent=count===state.spread?'选牌完成！向下翻开你的牌阵。':`在牌背中自由选择，还需要 ${state.spread-count} 张。`;
 }
 function chooseCard(position){
  if(state.picks.length>=state.spread||state.picks.some(p=>p.position===position))return;
  state.picks.push({id:state.deck[position],position,reverse:state.allowReverse?randIndex(2)===1:false});
  state.revealed.push(false);state.saved=false;
  renderDeck();renderSpread();renderActionState();
  if(state.picks.length===state.spread){
   toast('选牌完成，点击牌阵中的卡牌逐张翻开');
   setTimeout(()=>$('resultSection').scrollIntoView({behavior:'smooth',block:'start'}),120);
  }else toast(`已选第 ${state.picks.length} 张，还需 ${state.spread-state.picks.length} 张`);
 }
 function face(card,pick){
  const el=createEl('div',`card-side card-front${pick.reverse?' is-reverse':''}`);
  const numeral=createEl('div','card-numeral',card.suit==='major'?String(card.num).padStart(2,'0'):`${card.suitCn} · ${card.num}`);
  const art=createEl('div','card-art');const mark=createEl('span',null,card.symbol);art.appendChild(mark);
  const name=createEl('div','card-name',card.cn),english=createEl('div','card-english',card.en),direction=createEl('div','card-orient',pick.reverse?'逆位 REVERSED':'正位 UPRIGHT');
  el.append(numeral,art,name,english,direction);return el;
 }
 function renderSpread(){
  const area=$('spreadGrid');area.replaceChildren();
  area.className=`spread-grid spread-${state.spread}`;
  SPREADS[state.spread].forEach((label,i)=>{
   const slot=createEl('div','spread-slot');slot.appendChild(createEl('span','slot-label',label));
   const pick=state.picks[i];
   if(!pick){slot.appendChild(createEl('div','slot-placeholder','等待选取'));slot.appendChild(createEl('div','slot-under','尚未抽取'));
   }else{
    const card=getCard(pick.id),b=createEl('button',`card-flip${state.revealed[i]?' is-revealed':''}`),inner=createEl('span','card-inner');
    b.type='button';b.setAttribute('aria-label',state.revealed[i]?`${card.cn}${pick.reverse?'逆位':'正位'}`:`翻开${label}`);
    b.disabled=state.revealed[i];
    const back=createEl('span','card-side card-back');back.appendChild(createEl('span','back-mandala','☼'));
    inner.append(back,face(card,pick));b.appendChild(inner);
    b.addEventListener('click',()=>{state.revealed[i]=true;renderSpread();renderActionState();});
    slot.append(b,createEl('div','slot-under',state.revealed[i]?`${card.cn} · ${pick.reverse?'逆位':'正位'}`:'点击翻牌'));
   }
   area.appendChild(slot);
  });
  const total=state.picks.length,opened=state.revealed.filter(Boolean).length;
  $('revealStatus').textContent=total!==state.spread?`已抽 ${total}/${state.spread} 张；继续在上方牌堆中选择。`:`已经翻开 ${opened}/${total} 张，${opened===total?'请阅读象征提示，或复制给 ChatGPT。':'点击卡背依次揭开牌面。'}`;
  renderInterpretation();
 }
 function renderInterpretation(){
  const el=$('interpretation');el.replaceChildren();
  state.picks.forEach((pick,i)=>{
   if(!state.revealed[i])return;
   const c=getCard(pick.id),block=createEl('article','meaning-row'),head=document.createElement('header');
   head.append(createEl('strong',null,`${SPREADS[state.spread][i]} · ${c.cn}`),createEl('small',null,pick.reverse?'逆位':'正位'));
   const p1=createEl('p');p1.append(createEl('b',null,'关键词：'),document.createTextNode(pick.reverse?c.reversed:c.upright));
   const p2=createEl('p');p2.append(createEl('b',null,'反思提示：'),document.createTextNode(pick.reverse?c.revAdvice:c.upAdvice));
   block.append(head,p1,p2);el.appendChild(block);
  });
  if(state.picks.length&&state.revealed.every(Boolean))el.appendChild(createEl('p','interpretation-note','牌义是象征性的思考材料，并非对未来或他人想法的可靠预测。'));
 }
 function complete(){return state.picks.length===state.spread && state.revealed.length===state.spread&&state.revealed.every(Boolean);}
 function renderActionState(){
  $('saveBtn').disabled=!complete()||state.saved;$('copyBtn').disabled=!complete();
  $('saveBtn').textContent=state.saved?'✓ 已保存至手札':'✧ 保存这次占卜';
 }
 function snapshot(){return {id:`${Date.now()}-${randIndex(100000)}`,date:state.startedAt?state.startedAt.toISOString():new Date().toISOString(),question:state.question,spread:state.spread,allowReverse:state.allowReverse,picks:state.picks.map(p=>({...p}))};}
 function readHistory(){try{const a=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(a)?a:[];}catch{return [];}}
 function writeHistory(a){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(a.slice(0,100)));return true;}catch{toast('本地存储不可用，请检查隐私模式或存储空间');return false;}}
 function saveReading(){if(!complete())return;const items=readHistory();items.unshift(snapshot());if(writeHistory(items)){state.saved=true;renderActionState();toast('已保存在这台设备的本地记录中');}}
 function displayDate(iso){return new Date(iso).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});}
 function formatReading(data){
  const lines=[
   '请用中文解读这组韦特体系塔罗牌。把牌面当作娱乐和自我反思的素材，不将牌义当成对未来的确定预测；尊重我对现实处境的判断。','',
   `【抽牌时间】${displayDate(data.date)}`,
   `【我的问题】${data.question}`,
   `【牌阵】${data.spread}张牌阵（${SPREADS[data.spread].join(' → ')}）`,
   `【方向设置】${data.allowReverse?'允许正位与逆位':'仅正位'}`,
   `【手选顺序】${data.picks.map(p=>`第 ${p.position+1} 张`).join(' → ')}（洗牌后的摆放位置）`,'',
   '【抽牌结果】'
  ];
  data.picks.forEach((p,i)=>{
    const c=getCard(p.id);if(!c)return;
    lines.push(`${i+1}. ${SPREADS[data.spread][i]}｜${c.cn} · ${c.en}｜${p.reverse?'逆位':'正位'}`);
    lines.push(`   关键词 · ${p.reverse?c.reversed:c.upright}`);
    lines.push(`   牌义参考 · ${p.reverse?c.revAdvice:c.upAdvice}`);
  });
  lines.push('','【希望得到的解读】','逐张联系牌位、象征意义和正逆位，用可能性语言解释，再分析牌与牌之间的呼应或矛盾。区分已知事实、牌面联想和需要现实核实的信息，并给出可操作的反思问题。');
  return lines.join('\n');
 }
 async function copyText(str){
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(str);toast('已复制！可以粘贴到 ChatGPT');return;}}catch{}
  const t=document.createElement('textarea');t.value=str;t.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(t);t.focus();t.select();let success=false;
  try{success=document.execCommand('copy');}catch{}
  t.remove();
  if(success)toast('已复制！可以粘贴到 ChatGPT');else{window.prompt('请长按并复制以下内容：',str);toast('请手动复制文本');}
 }
 function renderDictionary(){
  const q=$('searchCards').value.toLocaleLowerCase().trim(),filtered=TAROT_CARDS.filter(c=>(state.filter==='all'||c.suit===state.filter)&&(!q||[c.cn,c.en,c.upright,c.reversed].some(s=>s.toLowerCase().includes(q))));
  const grid=$('dictionaryGrid');grid.replaceChildren();
  if(!filtered.length){grid.appendChild(createEl('p','empty','没有找到符合条件的牌，试试其他关键词。'));return;}
  const frag=document.createDocumentFragment();
  filtered.forEach(c=>{
    const b=createEl('button','dict-card');b.type='button';
    const emblem=createEl('span','dict-symbol',c.symbol),content=createEl('span');content.append(createEl('strong',null,c.cn),createEl('small',null,c.en));b.append(emblem,content);
    b.addEventListener('click',()=>showCardDetail(c));frag.appendChild(b);
  });grid.appendChild(frag);
 }
 function openDialog(content){$('detailContent').replaceChildren(...content);$('detailDialog').showModal();}
 function showCardDetail(c){
  const nodes=[createEl('div','detail-sigil',c.symbol),createEl('h2',null,c.cn),createEl('p','detail-en',`${c.en} · ${c.suitCn}`)];
  for(const [title,meaning,advice] of [['✧ 正位',c.upright,c.upAdvice],['☾ 逆位',c.reversed,c.revAdvice]]){
   const box=createEl('div','detail-group');box.append(createEl('h3',null,title),createEl('p',null,`关键词：${meaning}`),createEl('p',null,`反思：${advice}`));nodes.push(box);
  }
  openDialog(nodes);
 }
 function showHistoryDetail(data){
  const nodes=[createEl('div','detail-sigil','☾'),createEl('h2',null,'历史占卜'),createEl('p','detail-en',displayDate(data.date))];
  const q=createEl('div','detail-group');q.append(createEl('h3',null,'提问'),createEl('p',null,data.question));nodes.push(q);
  data.picks.forEach((p,i)=>{const c=getCard(p.id);if(!c)return;const block=createEl('div','detail-group');block.append(createEl('h3',null,`${SPREADS[data.spread][i]} · ${c.cn} · ${p.reverse?'逆位':'正位'}`),createEl('p',null,p.reverse?c.reversed:c.upright),createEl('p',null,p.reverse?c.revAdvice:c.upAdvice));nodes.push(block);});
  const b=createEl('button','primary-btn','复制这一组牌给 ChatGPT');b.type='button';b.addEventListener('click',()=>copyText(formatReading(data)));nodes.push(b);openDialog(nodes);
 }
 function renderHistory(){
  const entries=readHistory(),list=$('historyList');list.replaceChildren();
  if(!entries.length){const empty=createEl('div','empty');empty.append(createEl('span','symbol','☾'),createEl('p',null,'还没有历史记录。完成抽牌并翻开卡牌后，可以点击保存。'));list.appendChild(empty);return;}
  entries.forEach(d=>{
   if(!SPREADS[d.spread]||!Array.isArray(d.picks))return;
   const row=createEl('div','history-item'),data=createEl('div');data.append(createEl('h3',null,d.question),createEl('p',null,`${displayDate(d.date)} · ${d.spread}张牌 · ${d.picks.map(x=>getCard(x.id)?.cn||'未知').join(' / ')}`));
   const actions=createEl('div','history-actions'),view=createEl('button',null,'查看'),del=createEl('button',null,'删除');view.type=del.type='button';view.addEventListener('click',()=>showHistoryDetail(d));del.addEventListener('click',()=>{if(window.confirm('确定删除这条历史记录吗？')){writeHistory(readHistory().filter(x=>x.id!==d.id));renderHistory();}});actions.append(view,del);row.append(data,actions);list.appendChild(row);
  });
 }
 function bind(){
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.view)));
  $('homeLink').addEventListener('click',e=>{e.preventDefault();nav('draw');});
  document.querySelectorAll('[data-spread]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-spread]').forEach(x=>x.classList.toggle('is-active',x===b));}));
  $('shuffleBtn').addEventListener('click',shuffleDeck);
  $('saveBtn').addEventListener('click',saveReading);
  $('copyBtn').addEventListener('click',()=>{if(complete())copyText(formatReading(snapshot()));});
  $('searchCards').addEventListener('input',renderDictionary);
  document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('is-active',x===b));renderDictionary();}));
  $('clearHistoryBtn').addEventListener('click',()=>{if(readHistory().length&&window.confirm('确定永久清空此设备上的全部历史记录吗？')){if(writeHistory([])){renderHistory();toast('历史记录已清空');}}});
  $('closeDialog').addEventListener('click',()=>$('detailDialog').close());
  $('detailDialog').addEventListener('click',e=>{if(e.target===$('detailDialog'))$('detailDialog').close();});
 }
 bind();renderActionState();
 if('serviceWorker'in navigator && (location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('离线缓存不可用：',err)));
 }
})();
