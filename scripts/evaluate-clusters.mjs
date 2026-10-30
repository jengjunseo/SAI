import {readFile} from 'node:fs/promises';
import {evaluateClusters} from '../lib/news/evaluate.mjs';

const [filename,kArg]=process.argv.slice(2);
if(!filename)throw Error('Usage: node scripts/evaluate-clusters.mjs <reviewed-dataset.json> [k]');
const data=JSON.parse(await readFile(filename,'utf8'));
if(!Array.isArray(data.candidates)||!Array.isArray(data.labels))throw Error('Dataset must contain candidates and labels arrays');
const k=kArg===undefined?8:Number(kArg);if(!Number.isInteger(k)||k<1||k>8)throw Error('k must be 1..8');
console.log(JSON.stringify(await evaluateClusters(data.candidates,data.labels,{k}),null,2));
