import {Game} from './game.js';
try{
 const game=new Game(document.querySelector('#game'));
 // Read-only telemetry is available for reproducible browser playtests.
 window.skyrail={snapshot:()=>game.snapshot()};
 if(new URLSearchParams(location.search).has('test'))window.skyrail.game=game;
 document.querySelector('#boot')?.remove();
}catch(error){console.error(error);const boot=document.querySelector('#boot');boot.style.letterSpacing='1px';boot.innerHTML='<strong>SKYRAIL · Не удалось запустить WebGL</strong><p style="font:14px sans-serif;max-width:580px;line-height:1.7">Откройте игру в Chrome или Edge с включённым аппаратным ускорением. Запустите PLAY-SKYRAIL.cmd, затем откройте http://127.0.0.1:4177.</p><pre style="font-size:11px;white-space:pre-wrap"></pre>';boot.querySelector('pre').textContent=error.message;}
