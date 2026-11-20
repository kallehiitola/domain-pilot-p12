const positive=(v,k)=>{if(!Number.isFinite(v[k])||v[k]<=0)throw Error(`${k}: enter a number greater than zero.`);return v[k];};
const nonnegative=(v,k)=>{if(!Number.isFinite(v[k])||v[k]<0)throw Error(`${k}: enter zero or a positive number.`);return v[k];};
const row=(label,value,unit='',digits=2)=>({label,value,unit,digits});
export function calculate(id,v){
 let out=[];
 switch(id){
 case 'P01':{
  const run=positive(v,'wallRun')-nonnegative(v,'openingsWidth');
  if(run<=0)throw Error('Combined wall width must be greater than the skipped openings width.');
  const h=positive(v,'wallHeight')+nonnegative(v,'trim')/100,rw=positive(v,'rollWidth')/100,rl=positive(v,'rollLength');
  const match=v.matchType||'straight',rep=match==='none'?0:nonnegative(v,'repeat')/100;
  const drop=rep?Math.ceil((h-1e-10)/rep)*rep:h;
  let perRoll;
  if(match==='halfDrop'&&rep>0){
   perRoll=rl+1e-10<drop?0:1+Math.floor((rl-drop+1e-10)/(drop+0.5*rep));
  }else{
   perRoll=Math.floor((rl+1e-10)/drop);
  }
  const strips=Math.ceil((run-1e-10)/rw);
  if(perRoll<1)throw Error('One full drop will not fit on this roll. Check the roll length, wall height and repeat.');
  out=[row('Whole rolls',Math.ceil(strips/perRoll),'count',0),row('Full drops needed',strips,'count',0),row('Cut length per drop',drop,'m'),row('Full drops per roll',perRoll,'count',0)];break;}
 case 'P02':{
  const area=positive(v,'blanketWidth')*positive(v,'blanketLength'),sw=positive(v,'swatchWidth')*positive(v,'swatchHeight');
  const strands=positive(v,'strands');if(!Number.isInteger(strands))throw Error('Enter a whole number of strands.');
  const base=area/sw*positive(v,'swatchYarn')*strands,total=base*(1+nonnegative(v,'extra')/100),skeins=Math.ceil((total-1e-10)/positive(v,'skeinLength'));
  out=[row('Whole skeins',skeins,'count',0),row('Yarn including allowance',total,'yd_m',1),row('Yarn before allowance',base,'yd_m',1)];break;}
 case 'P03':{
  const perGram=nonnegative(v,'spoolPrice')/positive(v,'spoolWeight'),grams=nonnegative(v,'printWeight')*(1+nonnegative(v,'extra')/100);
  const material=perGram*grams;
  if(v.includeElectricity){
   const kwh=nonnegative(v,'printerWatts')/1000*nonnegative(v,'printHours');
   const elec=kwh*nonnegative(v,'kwhRate');
   out=[row('Material + electricity cost',material+elec,'money'),row('Material cost',material,'money'),row('Electricity cost',elec,'money'),row('Filament allowed for',grams,'g',1),row('Cost per gram',perGram,'money',4)];
  }else{
   out=[row('Material cost',material,'money'),row('Filament allowed for',grams,'g',1),row('Cost per gram',perGram,'money',4)];
  }
  break;}
 case 'P04':{
  const l=positive(v,'length'),w=positive(v,'width'),factor=positive(v,'utilization');if(factor>1)throw Error('Utilization must be between zero and one.');
  const required=l*w*positive(v,'lux'),n=Math.ceil((required/(positive(v,'fixtureLumens')*factor))-1e-10),cols=Math.max(1,Math.ceil(Math.sqrt(n*l/w))),rows=Math.ceil(n/cols);
  out=[row('Estimated minimum fixtures',n,'count',0),row('One rectangular layout: columns',cols,'count',0),row('Rows in that layout',rows,'count',0),row('Fixtures in that layout',cols*rows,'count',0),row('Grid spacing along length',l/cols,'m'),row('Grid spacing along width',w/rows,'m')];break;}
 case 'P05':{
  const shrink=nonnegative(v,'shrinkage')/100;if(shrink>=1)throw Error('Shrinkage must be below 100%.');
  const w=(positive(v,'pieceWidth')+2*nonnegative(v,'seam'))/(1-shrink),h=(positive(v,'pieceLength')+2*v.seam)/(1-shrink),bolt=positive(v,'boltWidth');
  const qty=positive(v,'pieces');if(!Number.isInteger(qty))throw Error('Enter a whole number of pieces.');
  const options=[{across:Math.floor((bolt+1e-10)/w),along:h}];if(v.rotate)options.push({across:Math.floor((bolt+1e-10)/h),along:w});
  const valid=options.filter(x=>x.across>0).map(x=>({...x,rows:Math.ceil(qty/x.across),cm:Math.ceil(qty/x.across)*x.along})).sort((a,b)=>a.cm-b.cm);
  if(!valid.length)throw Error('A cut piece does not fit the usable fabric width. Choose wider fabric or revise the piece dimensions.');
  const best=valid[0],metres=best.cm/100,increment=positive(v,'increment');
  out=[row('Buy at least',Math.ceil((metres-1e-10)/increment)*increment,'yd_m'),row('Calculated cut length',metres,'yd_m'),row('Pieces across usable width',best.across,'count',0),row('Rows of pieces',best.rows,'count',0)];break;}
 case 'P06':{
  const target=positive(v,'trackWidth')*positive(v,'fullness'),pw=positive(v,'panelWidth');let n=Math.ceil((target-1e-10)/pw);if(v.pairs&&n%2)n++;
  out=[row('Finished panels',n,'count',0),row('Combined flat panel width',n*pw,'cm'),row('Actual fullness',n*pw/v.trackWidth,'times'),row('Target flat width',target,'cm')];break;}
 case 'P07':{
  const fill=positive(v,'fill');if(fill>1)throw Error('Usable fill fraction must be between zero and one.');
  const each=positive(v,'boxLength')*positive(v,'boxWidth')*positive(v,'boxHeight')/1000,usable=each*fill,volume=nonnegative(v,'inventoryLitres')*(1+nonnegative(v,'spare')/100);
  out=[row('Boxes of this size',Math.ceil((volume-1e-10)/usable),'count',0),row('Usable capacity per box',usable,'L',1),row('Total volume with spare allowance',volume,'L',1),row('Inside box volume',each,'L',1)];break;}
 case 'P08':{
  const area=positive(v,'length')*positive(v,'width'),u=positive(v,'utilization'),m=positive(v,'maintenance');if(u>1||m>1)throw Error('Utilization and maintenance fractions must be between zero and one.');
  const delivered=area*positive(v,'lux');out=[row('Estimated installed light output',delivered/(u*m),'lm',0),row('Light reaching the target plane',delivered,'lm',0),row('Room floor area',area,'m2')];break;}
 case 'P09':{
  const area=positive(v,'length')*positive(v,'width'),tileArea=positive(v,'tileLength')*positive(v,'tileWidth')/10000,box=positive(v,'boxPieces');if(!Number.isInteger(box))throw Error('Tiles per box must be a whole number.');
  const n=Math.ceil((area/tileArea*(1+nonnegative(v,'waste')/100))-1e-10),cartons=Math.ceil(n/box);
  out=[row('Whole boxes',cartons,'count',0),row('Tiles to purchase',cartons*box,'count',0),row('Tiles including waste allowance',n,'count',0),row('Room floor area',area,'m2')];break;}
 case 'P10':{
  const count=positive(v,'pieces');if(!Number.isInteger(count))throw Error('Mold count must be a whole number.');
  const per=v.shape==='cylinder'?Math.PI*(positive(v,'diameter')/2)**2*positive(v,'depth'):positive(v,'length')*positive(v,'width')*positive(v,'depth');
  const displaced=nonnegative(v,'displacement');if(displaced>=per)throw Error('Displaced volume must be smaller than the mold volume.');
  const total=(per-displaced)*count*(1+nonnegative(v,'extra')/100);
  out=[row('Mixed resin volume',total,'mL',1)];
  if(v.volumeRatio){const a=positive(v,'partA'),b=positive(v,'partB');out.push(row('Approximate part A — by volume',total*a/(a+b),'mL',4),row('Approximate part B — by volume',total*b/(a+b),'mL',4));}
  out.push(row('Unfilled volume per mold',per-displaced,'mL',1));break;}
 case 'P11':{
  const l=positive(v,'length'),w=positive(v,'width'),r=positive(v,'rollWidth'),trim=nonnegative(v,'trim');
  const options=[{strips:Math.ceil((w-1e-10)/r),cut:l+2*trim}];if(v.rotate)options.push({strips:Math.ceil((l-1e-10)/r),cut:w+2*trim});
  options.sort((a,b)=>a.strips*a.cut-b.strips*b.cut);const best=options[0],linear=best.strips*best.cut;
  out=[row('Linear roll length',linear,'m'),row('Carpet area purchased',linear*r,'m2'),row('Full-width strips',best.strips,'count',0),row('Cut length per strip',best.cut,'m'),row('Room floor area',l*w,'m2')];break;}
 case 'P12':{
  const l=positive(v,'length'),w=positive(v,'width'),h=positive(v,'height'),pw=positive(v,'panelWidth'),ph=positive(v,'panelHeight'),panelArea=pw*ph;
  if((v.methodMode||'coverage')==='coverage'){
   const pct=positive(v,'coveragePct');if(pct>100)throw Error('Wall coverage percentage must be between 1 and 100.');
   const wallArea=2*(l+w)*h,targetArea=wallArea*(pct/100);
   out=[row('Estimated acoustic panels',Math.ceil((targetArea-1e-10)/panelArea),'count',0),row('Target panel coverage area',targetArea,'m2'),row('Total wall surface area',wallArea,'m2'),row('Area per panel',panelArea,'m2')];
  }else{
   const volume=l*w*h,oldT=positive(v,'currentRT'),target=positive(v,'targetRT'),alpha=positive(v,'panelAlpha'),base=nonnegative(v,'surfaceAlpha');
   if(alpha>1||base>=alpha)throw Error('Use a panel absorption fraction up to one, greater than the surface it replaces.');
   const delta=Math.max(0,.161*volume/target-.161*volume/oldT),each=panelArea*(alpha-base);
   out=[row('Estimated additional panels',Math.ceil((delta-1e-10)/each),'count',0),row('Additional absorption required',delta,'m2'),row('Net absorption per panel',each,'m2'),row('Room volume',volume,'m3')];
  }
  break;}
 default:throw Error('Unknown calculator.');
 }
 for(const r of out)if(Object.is(r.value,-0))r.value=0;
 if(out.some(x=>!Number.isFinite(x.value)||x.value<0))throw Error('These inputs do not produce a usable estimate. Check the quantities.');
 return out;
}
