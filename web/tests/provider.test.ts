import test from 'node:test';
import assert from 'node:assert/strict';
import {elevenRequest} from '../lib/agent.ts';

test('provider rejection preserves a useful reason and removes the supplied key',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({detail:{status:'invalid_voice',message:'Unsupported voice model. sk_private_demo should never be displayed.'}}),{status:400});
  try{await assert.rejects(elevenRequest('/v1/convai/agents/create','sk_private_demo',{}),error=>{
    assert.ok(error instanceof Error);assert.match(error.message,/400/);assert.match(error.message,/Unsupported voice model/);assert.doesNotMatch(error.message,/sk_private_demo/);return true;
  });}finally{globalThis.fetch=original;}
});
test('validation diagnostics contain field paths but never request input',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({detail:[{loc:['body','conversation_config','tts'],msg:'Field required',input:{secret:'do-not-show'}}]}),{status:422});
  try{await assert.rejects(elevenRequest('/v1/convai/agents/create','test',{}),error=>{
    assert.ok(error instanceof Error);assert.match(error.message,/conversation_config.tts/);assert.match(error.message,/Field required/);assert.doesNotMatch(error.message,/do-not-show/);return true;
  });}finally{globalThis.fetch=original;}
});
