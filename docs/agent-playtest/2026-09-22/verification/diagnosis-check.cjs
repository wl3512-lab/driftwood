// Source-assisted diagnostic after UI rejection; not counted as a playthrough.
const fs=require('fs'); const vm=require('vm'); const src=fs.readFileSync('sketch.js','utf8');
function section(start,end){return src.slice(src.indexOf(start),src.indexOf(end,src.indexOf(start)));}
const evaluator=section('function normalizeText','function splitReplySentences')+'\n'+section('function flawKeywordMap','function rulesStrengthForPet')+'\n'+section('function evaluateFlawGuessLocally','function _extractTopic');
const testContext=vm.createContext({});vm.runInContext(evaluator,testContext);
const options=['Reckless Advisor','Agreeableness bias','Emotional overdependence','Fabricated memory','Hallucination'];
const results=['fox','parrot','bunny','dog','cat'].map(id=>({pet:id,options:options.map(label=>({label,...testContext.evaluateFlawGuessLocally({id,name:id},label)}))}));
fs.writeFileSync(__dirname+'/diagnosis-matrix.json',JSON.stringify({method:'Source extraction and pure local evaluator; no browser game state changed',results},null,2));
console.log(results.map(r=>({pet:r.pet,accepted:r.options.filter(o=>o.correct).map(o=>o.label)})));
