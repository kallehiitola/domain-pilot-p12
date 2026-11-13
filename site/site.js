import {calculate} from './calculators.mjs';
const topic=JSON.parse(document.querySelector('#topic-data').textContent);
const form=document.querySelector('#calculator');
const result=document.querySelector('#results');
const error=document.querySelector('#error');
const system=document.querySelector('#units');
const currency=document.querySelector('#currency');
const conversions={m:['ft',1/0.3048],cm:['in',1/2.54],m2:['ft²',1/0.09290304],m3:['ft³',1/0.028316846592],lux:['foot-candles',0.09290304],L:['ft³',1/28.316846592]};
let currentSystem='metric';
const canonical=new Map(topic.fields.filter(f=>f.type==='number').map(f=>[f.id,f.value]));
const shown=new Map(topic.fields.filter(f=>f.type==='number').map(f=>[f.id,form.elements.namedItem(f.id).value]));
const showNumber=v=>String(Number(v.toFixed(4)));
function converted(unit,mode){return mode==='imperial'&&conversions[unit]?conversions[unit]:[unit,1];}
function values(){return Object.fromEntries(topic.fields.map(f=>{
 const input=form.elements.namedItem(f.id);
 if(f.type==='checkbox')return[f.id,input.checked];
 if(f.type==='select')return[f.id,input.value];
 return[f.id,input.value===shown.get(f.id)?canonical.get(f.id):Number(input.value)/converted(f.unit,system.value)[1]];
}));}
function format(r){
 let [unit,factor]=converted(r.unit,system.value),v=r.value*factor;
 if(unit==='money')return new Intl.NumberFormat('en-US',{style:'currency',currency:currency.value,minimumFractionDigits:r.digits,maximumFractionDigits:r.digits}).format(v);
 if(unit==='count')unit='';
 if(unit==='m2')unit='m²';if(unit==='m3')unit='m³';
 let precision=r.unit==='mL'?Math.max(4,r.digits):r.digits;
 if(v!==0&&Math.abs(v)<10**(-precision))precision=Math.min(12,Math.ceil(-Math.log10(Math.abs(v)))+3);
 return new Intl.NumberFormat('en-US',{maximumFractionDigits:precision,minimumFractionDigits:Math.min(r.digits,2)}).format(v)+(unit?' '+unit:'');
}
function syncShape(){if(topic.id!=='P10')return;const shape=form.elements.namedItem('shape').value;for(const id of ['length','width','diameter']){const wrap=document.querySelector(`[data-field="${id}"]`);const visible=id==='diameter'?shape==='cylinder':shape==='rectangle';wrap.hidden=!visible;form.elements.namedItem(id).disabled=!visible;}for(const id of ['partA','partB']){const visible=form.elements.namedItem('volumeRatio').checked;document.querySelector(`[data-field="${id}"]`).hidden=!visible;form.elements.namedItem(id).disabled=!visible;}}
function run(focus=false){
 error.textContent='';
 try{
  syncShape();
  if(!form.checkValidity()){form.reportValidity();return;}
  const rows=calculate(topic.id,values());result.replaceChildren();
  for(const r of rows){const wrap=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');label.textContent=r.label;value.textContent=format(r);wrap.append(label,value);result.append(wrap);}
  if(focus)document.querySelector('#result-heading').focus();
 }catch(e){error.textContent=e.message;result.replaceChildren();if(focus)error.focus();}
}
form.addEventListener('submit',e=>{e.preventDefault();run(true);});
form.addEventListener('change',()=>{syncShape();});
system.addEventListener('change',()=>{
 for(const f of topic.fields.filter(f=>f.type==='number')){
  const input=form.elements.namedItem(f.id),from=converted(f.unit,currentSystem)[1],to=converted(f.unit,system.value)[1];
  const base=input.value===shown.get(f.id)?canonical.get(f.id):Number(input.value)/from;
  canonical.set(f.id,base);input.value=showNumber(base*to);shown.set(f.id,input.value);
  input.min=showNumber(f.min*to);
  document.querySelector(`[data-unit="${f.id}"]`).textContent=f.unit==='count'?'':converted(f.unit,system.value)[0]==='money'?currency.value:converted(f.unit,system.value)[0];
 }
 currentSystem=system.value;run();
});
currency.addEventListener('change',()=>{for(const f of topic.fields.filter(f=>f.unit==='money'))document.querySelector(`[data-unit="${f.id}"]`).textContent=currency.value;run();});
document.querySelector('#reset').addEventListener('click',()=>{for(const f of topic.fields){const input=form.elements.namedItem(f.id);if(f.type==='checkbox')input.checked=f.value;else if(f.type==='number'){canonical.set(f.id,f.value);input.value=showNumber(f.value*converted(f.unit,system.value)[1]);shown.set(f.id,input.value);}else input.value=f.value;}run();});
system.value='imperial';system.dispatchEvent(new Event('change'));
document.documentElement.dataset.calculatorReady='true';
