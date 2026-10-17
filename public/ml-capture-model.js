/*
  PaperTrace Capture Classifier — lightweight supervised ML demo.
  Features: brightness, contrast, edge density, horizontal/vertical illumination gradient.
  Training examples are deliberately small prototype data; replace with validated device
  capture data before production deployment.
*/
const CAPTURE_TRAINING_DATA = [
  { label:'Screenshot / digital export', v:[.92,.18,.07,.01,.01] }, { label:'Screenshot / digital export', v:[.82,.22,.09,.02,.01] }, { label:'Screenshot / digital export', v:[.75,.16,.06,.01,.02] },
  { label:'Scanned / printed page', v:[.80,.12,.16,.03,.03] }, { label:'Scanned / printed page', v:[.68,.15,.20,.04,.04] }, { label:'Scanned / printed page', v:[.87,.11,.13,.02,.04] },
  { label:'Phone-camera photograph', v:[.56,.25,.31,.13,.11] }, { label:'Phone-camera photograph', v:[.47,.29,.37,.18,.15] }, { label:'Phone-camera photograph', v:[.66,.21,.27,.10,.12] }
];
function captureFeatures(imageData,w,h){
  const d=imageData.data; let sum=0,sumSq=0,edges=0,gradX=0,gradY=0,n=w*h;
  const gray=i=>(d[i]+d[i+1]+d[i+2])/(3*255);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,g=gray(i);sum+=g;sumSq+=g*g;if(x<w-1)edges+=Math.abs(g-gray(i+4));if(y<h-1)edges+=Math.abs(g-gray(i+w*4));if(x>w*.7)gradX+=g;else if(x<w*.3)gradX-=g;if(y>h*.7)gradY+=g;else if(y<h*.3)gradY-=g}
  const mean=sum/n, contrast=Math.sqrt(Math.max(0,sumSq/n-mean*mean));
  return [mean,contrast,Math.min(1,edges/(n*1.2)),Math.min(1,Math.abs(gradX)/(n*.4)),Math.min(1,Math.abs(gradY)/(n*.4))];
}
function classifyCapture(v){
  const distances=CAPTURE_TRAINING_DATA.map(x=>({...x,d:Math.sqrt(x.v.reduce((s,a,i)=>s+(a-v[i])**2,0))})).sort((a,b)=>a.d-b.d).slice(0,3);
  const votes={};distances.forEach(x=>votes[x.label]=(votes[x.label]||0)+1/(x.d+.02)); const best=Object.entries(votes).sort((a,b)=>b[1]-a[1])[0]; const confidence=Math.round(best[1]/Object.values(votes).reduce((a,b)=>a+b,0)*100);
  return {captureType:best[0],confidence,features:v.map(x=>Number(x.toFixed(3)))};
}
