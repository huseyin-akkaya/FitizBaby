import {useEffect,useState} from 'react';
import {localDay} from '../data/personalStorage';
export default function useToday(){
 const [day,setDay]=useState(localDay);
 useEffect(()=>{let timer;function update(){setDay(localDay());clearTimeout(timer);const next=new Date();next.setHours(24,0,0,50);timer=setTimeout(update,Math.max(50,next.getTime()-Date.now()));}function visible(){if(!document.hidden)update();}update();window.addEventListener('focus',update);document.addEventListener('visibilitychange',visible);return()=>{clearTimeout(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',visible);};},[]);
 return day;
}
