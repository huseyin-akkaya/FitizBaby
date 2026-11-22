import test from 'node:test';
import assert from 'node:assert/strict';
import {companionMessage,localCompanionReply} from '../../src/utils/companionMessages.js';
test('Companion uses only enabled styles and substitutes only the supplied name',()=>{
 const styles={fun:false,funny:false,serious:true,absurd:false};
 for(let i=0;i<8;i++)assert.match(companionMessage('welcome',styles,'Ayşe',i),/Hoş geldin Ayşe/);
 assert.equal(companionMessage('welcome',{},'Ayşe'),null);
 assert.match(companionMessage('snacks',{absurd:true},'Deniz'),/Kraker uzay üssü/);
 assert.match(companionMessage('welcome',{fun:true,serious:true},'Deniz',1),/Hoş geldin Deniz/);
});
test('Companion local chat is explicit about its limits and discourages sharing credentials',()=>{
 assert.match(localCompanionReply('Parolamı yazayım mı'),/yazma/);
 assert.match(localCompanionReply('Nasıl konuşuyorsun?'),/dışarıdaki bir yapay zekâya bağlı değilim/);
 assert.match(localCompanionReply('Kalori planı'),/uzman/);
});

test('Story invitations honor selected styles, vary content, and remain opt-in data',async()=>{
 const {chooseCompanionStory}=await import('../../src/utils/companionStories.js');
 assert.equal(chooseCompanionStory({},0),null);
 const first=chooseCompanionStory({fun:true},0),second=chooseCompanionStory({fun:true},1);
 assert.equal(first.style,'fun');assert.notEqual(first.kind,second.kind);
 assert.ok(first.invite&&first.text);assert.ok(!first.invite.includes(first.text));
 assert.equal(chooseCompanionStory({absurd:true},5).style,'absurd');
});
