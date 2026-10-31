(() => {
  'use strict';
  const KEY = 'xunxu-routines-v1';
  const $ = id => document.getElementById(id);
  const names = ['日', '一', '二', '三', '四', '五', '六'];
  const templates = [
    { title: '复习英语单词', category: '学习', minutes: 15, frequency: 'daily', days: [] },
    { title: '整理今日笔记', category: '学习', minutes: 10, frequency: 'weekdays', days: [] }
  ];
  const validTask = t => t && typeof t.id === 'string' && typeof t.title === 'string' && ['daily','weekdays','custom'].includes(t.frequency) && Array.isArray(t.days);
  let state = { tasks: [], done: {} };
  let editingId = null;
  let currentDate = dayKey(new Date());
  let toastTimer;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.tasks) && saved.done && typeof saved.done === 'object') state = { tasks: saved.tasks.filter(validTask), done: saved.done };
  } catch (_) {}

  function dayKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
  function addDays(date, count) { const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()); d.setDate(d.getDate()+count); return d; }
  function id() { return crypto.randomUUID ? crypto.randomUUID() : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function onDay(task, date) { const day = date.getDay(); return task.frequency === 'daily' || (task.frequency === 'weekdays' && day > 0 && day < 6) || (task.frequency === 'custom' && task.days.includes(day)); }
  function isDone(key, taskId) { return Array.isArray(state.done[key]) && state.done[key].includes(taskId); }
  function schedule(task) { return task.frequency === 'daily' ? '每天' : task.frequency === 'weekdays' ? '工作日' : [...task.days].sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>`周${names[d]}`).join('、'); }
  function node(tag, className, value) { const e = document.createElement(tag); if (className) e.className = className; if (value !== undefined) e.textContent = value; return e; }
  function notify(message) { const e = $('toast'); e.textContent = message; e.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(()=>e.classList.remove('show'),2600); }
  function save() { try { localStorage.setItem(KEY,JSON.stringify(state)); return true; } catch (_) { notify('保存失败，请检查浏览器存储空间'); return false; } }

  function renderToday() {
    const today = new Date(), key = dayKey(today), tasks = state.tasks.filter(t=>onDay(t,today));
    const complete = tasks.filter(t=>isDone(key,t.id)).length;
    $('dateLabel').textContent = `${today.getFullYear()} 年 ${today.getMonth()+1} 月 ${today.getDate()} 日 · 周${names[today.getDay()]}`;
    $('progressCaption').textContent = `${complete} / ${tasks.length} 已完成`;
    const percentage = tasks.length ? Math.round(complete/tasks.length*100) : 0;
    $('progressFill').style.width = `${percentage}%`;
    $('progressBar').setAttribute('aria-valuenow',percentage);
    const list = $('todayList'); list.replaceChildren();
    if (!tasks.length) {
      const empty = node('div','empty-state');
      empty.append(node('div','empty-symbol','✓'),node('strong','',state.tasks.length ? '今天没有安排任务' : '从一个小习惯开始'),node('p','',state.tasks.length ? '好好享受空闲时间，下一次任务会按计划出现。' : '添加一个重复任务，以后每天打开就知道该做什么。'));
      if (!state.tasks.length) {
        const choices = node('div','template-actions');
        templates.forEach(t=>{ const b=node('button','template-button',`＋ ${t.title}`); b.type='button'; b.addEventListener('click',()=>{state.tasks.push({...t,id:id()});if(save()){render();notify('已添加重复任务');}});choices.append(b); });
        empty.append(choices);
      }
      list.append(empty); return;
    }
    tasks.sort((a,b)=>Number(isDone(key,a.id))-Number(isDone(key,b.id)));
    tasks.forEach(task=>{
      const done=isDone(key,task.id), row=node('div',`task-row${done?' done':''}`);
      const check=node('button','check-button',done?'✓':''); check.type='button'; check.setAttribute('aria-label',`${done?'取消完成':'完成'}${task.title}`); check.setAttribute('aria-pressed',String(done)); check.addEventListener('click',()=>toggle(task.id));
      const info=node('div','task-info'); info.append(node('div','task-title',task.title),node('div','task-meta',`${schedule(task)} · 约 ${task.minutes} 分钟`));
      const color={生活:'life',健康:'health',其他:'other'}[task.category]||'';
      row.append(check,info,node('span',`task-category ${color}`,task.category)); list.append(row);
    });
  }

  function renderUpcoming() {
    const list=$('upcomingList');list.replaceChildren();
    for(let offset=1;offset<=7;offset++){
      const date=addDays(new Date(),offset),tasks=state.tasks.filter(t=>onDay(t,date));
      const row=node('div','upcoming-row');
      row.append(node('span','upcoming-day',`${date.getMonth()+1}/${date.getDate()} 周${names[date.getDay()]}`),node('span','upcoming-tasks',tasks.length?tasks.map(t=>t.title).join('、'):'休息日'),node('span','upcoming-number',tasks.length?`${tasks.length} 项`:'—'));
      list.append(row);
    }
  }

  function renderSummary() {
    const today=new Date(),monday=addDays(today,-((today.getDay()+6)%7));
    const counts=Array.from({length:7},(_,i)=>{const value=state.done[dayKey(addDays(monday,i))];return Array.isArray(value)?value.length:0;});
    $('weeklyCount').textContent=String(counts.reduce((sum,n)=>sum+n,0));
    const max=Math.max(1,...counts),bars=$('weekBars');bars.replaceChildren();
    counts.forEach((count,i)=>{const wrap=node('div','week-bar-wrap'),bar=node('div',`week-bar${count?' has-count':''}`);bar.style.height=`${Math.max(5,count/max*43)}px`;wrap.setAttribute('aria-label',`周${['一','二','三','四','五','六','日'][i]}完成 ${count} 次`);wrap.append(bar,node('small','',['一','二','三','四','五','六','日'][i]));bars.append(wrap);});
  }

  function renderRoutines() {
    const list=$('routineList');list.replaceChildren();$('routineCount').textContent=String(state.tasks.length);
    if(!state.tasks.length){list.append(node('p','routine-empty','还没有重复任务。添加后可在这里修改周期。'));return;}
    state.tasks.forEach(task=>{
      const row=node('div','routine-item'),info=node('div','routine-item-info');info.append(node('strong','',task.title),node('small','',`${schedule(task)} · ${task.category}`));
      const edit=node('button','icon-button','✎');edit.type='button';edit.title=`编辑${task.title}`;edit.setAttribute('aria-label',edit.title);edit.addEventListener('click',()=>openDialog(task));
      const remove=node('button','icon-button','×');remove.type='button';remove.title=`删除${task.title}`;remove.setAttribute('aria-label',remove.title);remove.addEventListener('click',()=>removeTask(task));
      row.append(info,edit,remove);list.append(row);
    });
  }
  function render(){renderToday();renderUpcoming();renderSummary();renderRoutines();}
  function toggle(taskId){const key=dayKey(new Date()),set=new Set(Array.isArray(state.done[key])?state.done[key]:[]);set.has(taskId)?set.delete(taskId):set.add(taskId);state.done[key]=[...set];if(save())render();}

  function updateDays(){ $('daysField').hidden=document.querySelector('input[name="frequency"]:checked').value!=='custom'; }
  function openDialog(task){
    editingId=task?.id||null;$('taskForm').reset();$('formError').textContent='';$('dialogTitle').textContent=task?'编辑重复任务':'添加重复任务';$('saveButton').textContent=task?'保存修改':'保存任务';
    $('taskTitle').value=task?.title||'';$('taskCategory').value=task?.category||'学习';$('taskMinutes').value=String(task?.minutes||25);
    document.querySelector(`input[name="frequency"][value="${task?.frequency||'daily'}"]`).checked=true;
    document.querySelectorAll('#daysField input').forEach(input=>input.checked=task?.days.includes(Number(input.value))||false);
    updateDays();$('taskDialog').showModal();$('taskTitle').focus();
  }
  function submit(event){
    event.preventDefault();const title=$('taskTitle').value.trim(),frequency=document.querySelector('input[name="frequency"]:checked').value,days=[...document.querySelectorAll('#daysField input:checked')].map(i=>Number(i.value));
    if(!title){$('formError').textContent='请输入任务名称';$('taskTitle').focus();return;}
    if(frequency==='custom'&&!days.length){$('formError').textContent='至少选择一个星期';return;}
    const task={id:editingId||id(),title,category:$('taskCategory').value,minutes:Number($('taskMinutes').value),frequency,days:frequency==='custom'?days:[]};
    if(editingId){const index=state.tasks.findIndex(t=>t.id===editingId);if(index>=0)state.tasks[index]=task;}else state.tasks.push(task);
    if(save()){$('taskDialog').close();render();notify(editingId?'任务已更新':'任务已添加');}
  }
  function removeTask(task){
    if(!confirm(`确定删除“${task.title}”吗？历史完成记录也会清除。`))return;
    state.tasks=state.tasks.filter(t=>t.id!==task.id);
    Object.keys(state.done).forEach(key=>{if(Array.isArray(state.done[key]))state.done[key]=state.done[key].filter(id=>id!==task.id);});
    if(save()){render();notify('任务已删除');}
  }
  function exportBackup(){
    const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`循序备份-${dayKey(new Date())}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('备份已导出');
  }
  async function importBackup(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      if(!parsed||!Array.isArray(parsed.tasks)||!parsed.tasks.every(validTask)||!parsed.done||typeof parsed.done!=='object'||Array.isArray(parsed.done))throw Error('invalid');
      if(!confirm('导入备份会覆盖当前任务和完成记录，确定继续吗？'))return;
      state={tasks:parsed.tasks,done:parsed.done};if(save()){render();notify('备份已导入');}
    }catch(_){notify('备份文件无法读取，请选择循序导出的 JSON 文件');}
  }
  function registerAgentTools(){
    const context=document.modelContext;
    if(!context?.registerTool)return;
    const register=tool=>{try{Promise.resolve(context.registerTool(tool)).catch(()=>{});}catch(_){}};
    register({
      name:'list_today_tasks',title:'查看今日任务',description:'列出今天安排的重复任务及其完成状态。',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true,untrustedContentHint:false},
      execute(){const today=new Date(),key=dayKey(today);return {date:key,tasks:state.tasks.filter(t=>onDay(t,today)).map(t=>({id:t.id,title:t.title,category:t.category,minutes:t.minutes,done:isDone(key,t.id)}))};}
    });
    register({
      name:'create_recurring_task',title:'添加重复任务',description:'创建一个每天、工作日或指定星期重复的任务，并更新页面。',
      inputSchema:{type:'object',properties:{title:{type:'string',minLength:1,maxLength:60},category:{type:'string',enum:['学习','生活','健康','其他']},minutes:{type:'integer',enum:[5,10,15,25,45,60]},frequency:{type:'string',enum:['daily','weekdays','custom']},days:{type:'array',items:{type:'integer',minimum:0,maximum:6},uniqueItems:true}},required:['title','category','minutes','frequency'],additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute(input){
        if(!input||typeof input.title!=='string'||!input.title.trim()||input.title.trim().length>60||!['学习','生活','健康','其他'].includes(input.category)||![5,10,15,25,45,60].includes(input.minutes)||!['daily','weekdays','custom'].includes(input.frequency))throw Error('任务信息无效');
        const days=input.frequency==='custom'?input.days:[];
        if(!Array.isArray(days)||(input.frequency==='custom'&&!days.length)||days.some(d=>!Number.isInteger(d)||d<0||d>6)||new Set(days).size!==days.length)throw Error('重复日期无效');
        const task={id:id(),title:input.title.trim(),category:input.category,minutes:input.minutes,frequency:input.frequency,days};
        state.tasks.push(task);if(!save()){state.tasks.pop();throw Error('保存失败');}render();return {id:task.id,title:task.title,schedule:schedule(task)};
      }
    });
    register({
      name:'set_today_task_complete',title:'更新今日完成状态',description:'将今天安排的一个任务标为完成或未完成，并更新页面。',
      inputSchema:{type:'object',properties:{taskId:{type:'string'},complete:{type:'boolean'}},required:['taskId','complete'],additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute(input){
        const today=new Date(),task=state.tasks.find(t=>t.id===input?.taskId);
        if(!task||!onDay(task,today)||typeof input.complete!=='boolean')throw Error('今日任务或完成状态无效');
        const key=dayKey(today),entries=new Set(Array.isArray(state.done[key])?state.done[key]:[]);
        input.complete?entries.add(task.id):entries.delete(task.id);state.done[key]=[...entries];
        if(!save())throw Error('保存失败');render();return {taskId:task.id,date:key,complete:input.complete};
      }
    });
  }
  $('addButton').addEventListener('click',()=>openDialog());
  $('closeDialog').addEventListener('click',()=>$('taskDialog').close());
  $('cancelDialog').addEventListener('click',()=>$('taskDialog').close());
  $('taskForm').addEventListener('submit',submit);
  document.querySelectorAll('input[name="frequency"]').forEach(i=>i.addEventListener('change',updateDays));
  $('exportButton').addEventListener('click',exportBackup);
  $('importButton').addEventListener('click',()=>$('importFile').click());
  $('importFile').addEventListener('change',importBackup);
  setInterval(()=>{const next=dayKey(new Date());if(next!==currentDate){currentDate=next;render();}},60000);
  render();
  registerAgentTools();
})();

