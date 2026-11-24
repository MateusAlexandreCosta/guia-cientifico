/* Recursos globais — não interfere no app.js existente. */
(() => {
  'use strict';
  const doc = document;
  const body = doc.body;
  const make = (tag, attrs = {}, content = '') => {
    const el = doc.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (content) el.textContent = content;
    return el;
  };
  const main = doc.querySelector('main');
  if (main) {
    if (!main.id) main.id = 'conteudo';
    const skip = make('a', {href:'#' + main.id, class:'gc-skip-link'}, 'Pular para o conteúdo');
    body.prepend(skip);
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  }
  const isHome = /(?:^|\/)index\.html$/.test(location.pathname) || location.pathname.endsWith('/');
  const navList = doc.querySelector('.site-header .navbar-nav');
  const footerContainer = doc.querySelector('.site-footer .container') || doc.querySelector('.site-footer');
  const toggle = make('button', {type:'button',class:'gc-tool gc-a11y-toggle',title:'Opções de acessibilidade','aria-label':'Abrir opções de acessibilidade','aria-expanded':'false','aria-controls':'gc-a11y-panel'}, '◐');
  if (navList) {
    const item = make('li',{class:'nav-item gc-access-nav'});
    item.append(toggle);
    navList.append(item);
  } else body.prepend(toggle);
  const footerToggle = make('button',{type:'button',class:'gc-tool gc-footer-a11y',title:'Opções de acessibilidade','aria-label':'Abrir opções de acessibilidade','aria-expanded':'false','aria-controls':'gc-a11y-panel'},'◐');
  const top = make('button',{type:'button',class:'gc-tool gc-footer-top',title:'Voltar ao topo','aria-label':'Voltar ao topo'},'↑');
  if (footerContainer) {
    const footerActions = make('div',{class:'gc-footer-actions'});
    footerActions.append(footerToggle,top);
    footerContainer.append(footerActions);
  }
  if (!isHome && main) {
    const back = make('a',{href:'index.html',class:'gc-back-link','aria-label':'Voltar à página inicial'},'← Voltar ao início');
    main.prepend(back);
  }
  const panel = make('section', {id:'gc-a11y-panel',class:'gc-a11y-panel',role:'region','aria-label':'Opções de acessibilidade'});
  panel.hidden = true;
  panel.append(make('h2', {}, 'Acessibilidade'));
  const actions = make('div', {class:'gc-a11y-actions'});
  const status = make('p', {class:'gc-a11y-status',role:'status','aria-live':'polite'}, 'Selecione um texto e clique em “Ler seleção”.');
  const btn = (name, callback) => { const b = make('button',{type:'button'},name); b.addEventListener('click',callback); actions.append(b); return b; };
  const setStatus = message => { status.textContent = message; };
  const supportedSpeech = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let currentSpeech = null;
  const stopSpeech = () => { if (supportedSpeech) window.speechSynthesis.cancel(); currentSpeech = null; };
  const speak = text => {
    if (!supportedSpeech) return setStatus('Este navegador não disponibiliza leitura em voz alta.');
    if (!text) return setStatus('Selecione primeiro um trecho de texto da página.');
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 5000));
    utterance.lang = 'pt-BR'; utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.toLowerCase() === 'pt-br') || voices.find(v => v.lang.toLowerCase().startsWith('pt'));
    if (voice) utterance.voice = voice;
    utterance.onerror = () => setStatus('Não foi possível reproduzir o áudio neste navegador.');
    currentSpeech = utterance;
    window.speechSynthesis.speak(utterance);
    setStatus('Reproduzindo o texto selecionado.');
  };
  // Guarda a seleção antes do clique no painel, que pode retirar o foco do texto.
  let selectedText = '';
  doc.addEventListener('selectionchange', () => {
    const text = window.getSelection()?.toString().trim();
    if (text && !panel.contains(window.getSelection()?.anchorNode)) selectedText = text;
  });
  btn('Aumentar letras', () => {body.classList.add('gc-large-text'); localStorage.setItem('gc-large-text','1');});
  btn('Tamanho normal', () => {body.classList.remove('gc-large-text');localStorage.removeItem('gc-large-text');});
  btn('Alto contraste', () => {const on=body.classList.toggle('gc-high-contrast');localStorage.setItem('gc-high-contrast',on?'1':'0');});
  btn('Reduzir animações', () => {const on=body.classList.toggle('gc-no-motion');localStorage.setItem('gc-no-motion',on?'1':'0');});
  btn('Ler seleção', () => speak(selectedText || window.getSelection()?.toString().trim()));
  btn('Parar leitura', () => {stopSpeech();setStatus('Leitura interrompida.');});
  btn('Restaurar opções', () => {['gc-large-text','gc-high-contrast','gc-no-motion'].forEach(c=>{body.classList.remove(c);localStorage.removeItem(c);});stopSpeech();setStatus('Preferências restauradas.');});
  panel.append(actions,status);
  body.append(panel);
  top.addEventListener('click',()=>window.scrollTo({top:0,behavior:body.classList.contains('gc-no-motion')?'auto':'smooth'}));
  const toggles = [toggle,footerToggle];
  const syncToggles = () => toggles.forEach(b=>b.setAttribute('aria-expanded',String(!panel.hidden)));
  toggles.forEach(b=>b.addEventListener('click',()=>{panel.hidden=!panel.hidden;syncToggles();}));
  doc.addEventListener('keydown', e=>{if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;syncToggles();toggle.focus();}});
  doc.addEventListener('pointerdown',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!toggles.some(b=>b.contains(e.target))){panel.hidden=true;syncToggles();}});
  ['gc-large-text','gc-high-contrast','gc-no-motion'].forEach(c=>{try{if(localStorage.getItem(c)==='1')body.classList.add(c);}catch(e){}});
  // Fallback para o menu móvel quando o Bootstrap não carregar.
  const menuButton = doc.querySelector('.navbar-toggler[data-bs-target="#mainNav"]');
  const menu = doc.getElementById('mainNav');
  if(menuButton&&menu){
    menuButton.addEventListener('click',()=>{
      if(window.bootstrap?.Collapse)return;
      const open=menu.classList.toggle('show');
      menuButton.setAttribute('aria-expanded',String(open));
    });
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      if(window.matchMedia('(max-width:991.98px)').matches){menu.classList.remove('show');menuButton.setAttribute('aria-expanded','false');}
    }));
  }
})();
