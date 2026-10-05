# SKYRAIL implementation contract

Browser ES modules, Three r180 vendored in vendor/three.module.js and vendor/three.core.js. No build step. Import THREE from '../vendor/three.module.js'. Native meters, Y up, forward -Z. Assets use their base at Y=0. Character height 1.8, faces -Z. Moving platform groups only translate; child geometry may animate. Root implements world/physics/combat/missions.

## assets.js (art agent)
- createCar({kind='cargo',index=0,length=22,width=9,color}={}): THREE.Group. Deck top y=0, body below deck. Detailed roof/deck walkable surface. All obstacles above y=0 exposed in group.userData.obstacles as {x,z,width,depth,height}. Grapple anchor spots group.userData.anchors as {x,y,z}. Car centered x,z; length along Z. No unwalkable roofs covering main path.
- createLocomotive(): same convention as car, length 26 width 9.
- createAirship({boss=false}={}): group, long axis Z, gondola/deck at y=0, hull above and sides. Boss deck walkable width 20,length 72; body above must leave central deck clear. Normal background airship free layout.
- createCharacter({enemy=false,type='guard'}={}): group, userData rig references. animateCharacter(group,{time,speed,grounded,state,aim,attack,weapon},dt).
- createProp(type): fuel/crate/turret/generator/panel. Base at 0. createGlider(): group centered above head. createWeapon(type): group.

## atmosphere.js (atmosphere/audio agent)
- createAtmosphere(scene): {update(dt,{time,player,camera,speed,storm,biome,combat,boss}),setQuality(quality),dispose()}. Own sky, cloudscape, distant mountains/structures, scenery drift, sun/hemisphere lights, rain/lightning. Main vehicles have world z approximately -300..100 and y 0..30, player follows -Z. Keep near transit corridor x -35..35,z -500..100 free. Lighting cinematic cyan/ivory sky, warm sun, atmospheric distance. Shadow target follows player. main game can set scene fog.
- createEffects(scene): {burst(position,color,count=20,power=8),trail(from,to,color=0xffdd88,lifetime=.12),update(dt),setQuality(quality)}. Pooled/disposed effects, capped.
- createAudio(): {unlock(),update(dt,{speed,combat,boss,storm,grinding,paused,listener}),play(name,position),setVolumes({master,music,sfx})}. Procedural WebAudio spatial SFX, adaptive score.

## ui.js + style.css (UI agent)
- createUI(callbacks): object. Appends own div#ui to body. Callbacks onStart,onContinue,onResume,onMenu,onSettings(settings),onWeapon(index),onUpgrade(id),onRoute(id),onWorkshop(id),onRetry,onHub. onStart new run; onHub for base.
- methods show(screen,data={}), update(data), toast(title,subtitle='',kind='info'), setSave(save), getSettings(). show screens menu/hud/pause/settings/loadout/workshop/upgrades/routes/victory/death/hub. HUD update {health,maxHealth,ammo,maxAmmo,weapon,weaponIndex,speed,grappleMode,grappleReady,dashCooldown,objective,subobjective,progress,kills,scrap,combo,bossHealth,bossMax,bossPhase,hint,act,location,upgrades,elapsed,hookTarget,hookDistance}. Can allow absent fields.
- exports WEAPONS,UPGRADES (>=20),DEFAULT_SETTINGS. Weapons {id,name,damage,rate,ammo,reload,range,color,description} root may override balancing. Upgrades {id,name,description,tag} root handles effects. Settings {quality,renderScale,shadows,clouds,particles,fov,sensitivity,cameraShake,autoMantle,toggleSprint,master,music,sfx}.
- Design exceptional editorial aviation UI, cream ink/yellow accents/teal, cinematic large SKYRAIL menu title, live unobstructed world behind. English titles + Russian helpful controls/copy. No mock graphics replacing actual game. All settings and controls wired.

Root owns index.html, server.cjs, src/main.js, src/game.js, src/physics.js, src/world.js, src/combat.js, tests and README. Agents must only write assigned files. No other project files modified.
