import {calculate} from './calculators.mjs';
const topic=JSON.parse(document.querySelector('#topic-data').textContent);
const form=document.querySelector('#calculator');
const result=document.querySelector('#results');
const error=document.querySelector('#error');
const system=document.querySelector('#units');
const currency=document.querySelector('#currency');
const conversions={
 m:['ft',1/0.3048],
 yd_m:['yd',1/0.9144],
 cm:['in',1/2.54],
 m2:['ft²',1/0.09290304],
 m3:['ft³',1/0.028316846592],
 lux:['foot-candles',0.09290304],
 L:['ft³',1/28.316846592],
 mL:['fl oz',1/29.5735295625]
};
let currentSystem='metric';
let userEdited=false;
const canonical=new Map(topic.fields.filter(f=>f.type==='number').map(f=>[f.id,f.value]));
const shown=new Map(topic.fields.filter(f=>f.type==='number').map(f=>[f.id,form.elements.namedItem(f.id).value]));
const showNumber=v=>String(Math.abs(v)>=1?Number(v.toFixed(2)):Number(v.toPrecision(3)));
function converted(unit,mode){
 if(mode==='imperial'&&conversions[unit])return conversions[unit];
 if(unit==='yd_m')return['m',1];
 return[unit,1];
}
function unitLabel(unit,mode){
 if(unit==='count')return '';
 if(unit==='money')return currency.value;
 return converted(unit,mode)[0];
}
function applyUnitLabels(mode){
 for(const f of topic.fields.filter(f=>f.type==='number')){
  const input=form.elements.namedItem(f.id),factor=converted(f.unit,mode)[1];
  input.min=showNumber(f.min*factor);
  const uEl=document.querySelector(`[data-unit="${f.id}"]`);
  if(uEl)uEl.textContent=unitLabel(f.unit,mode);
 }
}
function loadValues(valueMap,mode){
 for(const f of topic.fields){
  const input=form.elements.namedItem(f.id);
  const raw=valueMap&&Object.prototype.hasOwnProperty.call(valueMap,f.id)?valueMap[f.id]:f.value;
  if(f.type==='checkbox')input.checked=Boolean(raw);
  else if(f.type==='select')input.value=raw;
  else{
   const factor=converted(f.unit,mode)[1];
   canonical.set(f.id,raw/factor);
   input.value=showNumber(raw);
   shown.set(f.id,input.value);
  }
 }
 applyUnitLabels(mode);
 currentSystem=mode;
}
function loadDefaults(mode){
 if(mode==='imperial'&&topic.imperial){loadValues(topic.imperial,'imperial');}
 else{loadValues(Object.fromEntries(topic.fields.map(f=>[f.id,f.value])),'metric');}
}
function values(){
 return Object.fromEntries(topic.fields.map(f=>{
  const input=form.elements.namedItem(f.id);
  if(f.type==='checkbox')return[f.id,input.checked];
  if(f.type==='select')return[f.id,input.value];
  return[f.id,input.value===shown.get(f.id)?canonical.get(f.id):Number(input.value)/converted(f.unit,system.value)[1]];
 }));
}
function format(r){
 let [unit,factor]=converted(r.unit,system.value),v=r.value*factor;
 if(unit==='money')return new Intl.NumberFormat('en-US',{style:'currency',currency:currency.value,minimumFractionDigits:r.digits,maximumFractionDigits:r.digits}).format(v);
 if(unit==='count')unit='';
 if(unit==='m2')unit='m²';if(unit==='m3')unit='m³';
 let precision=r.unit==='mL'?Math.max(4,r.digits):r.digits;
 if(r.unit==='mL'&&system.value==='imperial')precision=Math.max(2,Math.min(4,r.digits));
 if(v!==0&&Math.abs(v)<10**(-precision))precision=Math.min(12,Math.ceil(-Math.log10(Math.abs(v)))+3);
 return new Intl.NumberFormat('en-US',{maximumFractionDigits:precision,minimumFractionDigits:Math.min(r.digits,2)}).format(v)+(unit?' '+unit:'');
}
function setVisible(id,visible){
 const wrap=document.querySelector(`[data-field="${id}"]`);
 if(!wrap)return;
 wrap.hidden=!visible;
 const el=form.elements.namedItem(id);
 if(el)el.disabled=!visible;
}
function syncConditionalFields(){
 if(topic.id==='P01'){
  setVisible('repeat',form.elements.namedItem('matchType').value!=='none');
 }else if(topic.id==='P03'){
  const show=form.elements.namedItem('includeElectricity').checked;
  for(const id of ['printHours','printerWatts','kwhRate'])setVisible(id,show);
 }else if(topic.id==='P10'){
  const shape=form.elements.namedItem('shape').value;
  for(const id of ['length','width','diameter'])setVisible(id,id==='diameter'?shape==='cylinder':shape==='rectangle');
  const ratio=form.elements.namedItem('volumeRatio').checked;
  for(const id of ['partA','partB'])setVisible(id,ratio);
 }else if(topic.id==='P12'){
  const mode=form.elements.namedItem('methodMode').value;
  setVisible('coveragePct',mode==='coverage');
  for(const id of ['currentRT','targetRT','panelAlpha','surfaceAlpha'])setVisible(id,mode==='sabine');
 }
}
function clearPresetState(){
 for(const btn of document.querySelectorAll('.preset-btn'))btn.setAttribute('aria-pressed','false');
}
function run(focus=false){
 error.textContent='';
 try{
  syncConditionalFields();
  if(!form.checkValidity()){form.reportValidity();return;}
  const rows=calculate(topic.id,values());result.replaceChildren();
  for(const r of rows){const wrap=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');label.textContent=r.label;value.textContent=format(r);wrap.append(label,value);result.append(wrap);}
  if(focus)document.querySelector('#result-heading').focus();
 }catch(e){error.textContent=e.message;result.replaceChildren();if(focus)error.focus();}
}
form.addEventListener('submit',e=>{e.preventDefault();run(true);});
form.addEventListener('input',()=>{userEdited=true;clearPresetState();});
form.addEventListener('change',()=>{userEdited=true;clearPresetState();syncConditionalFields();run();});
system.addEventListener('change',()=>{
 if(!userEdited){
  loadDefaults(system.value);
  run();
  return;
 }
 for(const f of topic.fields.filter(f=>f.type==='number')){
  const input=form.elements.namedItem(f.id),from=converted(f.unit,currentSystem)[1],to=converted(f.unit,system.value)[1];
  const base=input.value===shown.get(f.id)?canonical.get(f.id):Number(input.value)/from;
  canonical.set(f.id,base);input.value=showNumber(base*to);shown.set(f.id,input.value);
 }
 applyUnitLabels(system.value);
 currentSystem=system.value;run();
});
currency.addEventListener('change',()=>{applyUnitLabels(system.value);run();});
document.querySelector('#reset').addEventListener('click',()=>{userEdited=false;clearPresetState();loadDefaults(system.value);run();});
for(const btn of document.querySelectorAll('.preset-btn')){
 btn.addEventListener('click',()=>{
  const idx=Number(btn.dataset.preset);
  const preset=topic.presets?.[idx];
  if(!preset)return;
  userEdited=true;
  clearPresetState();
  btn.setAttribute('aria-pressed','true');
  loadValues(system.value==='imperial'?preset.imperial:preset.metric,system.value);
  run();
 });
}
system.value='imperial';
loadDefaults('imperial');
run();
document.documentElement.dataset.calculatorReady='true';
