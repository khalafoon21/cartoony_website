import { useId } from "react";
import type { ArtTheme, CategorySymbol } from "@/lib/movies";

const palettes: Record<ArtTheme, { sky: string; glow: string; moon: string; hills: string; leaf: string; ground: string }> = {
  forest: { sky: "#13273A", glow: "#467C83", moon: "#C2DACB", hills: "#244D55", leaf: "#568F7B", ground: "#213C43" },
  space: { sky: "#25223F", glow: "#6C6294", moon: "#D7CCE7", hills: "#423C66", leaf: "#8D82AF", ground: "#39344F" },
  ocean: { sky: "#12313F", glow: "#398894", moon: "#B4DDD8", hills: "#225969", leaf: "#55A5A4", ground: "#214751" },
  desert: { sky: "#372B38", glow: "#AA775F", moon: "#F5D4A6", hills: "#75554E", leaf: "#BA8160", ground: "#54434A" },
  sky: { sky: "#2E314A", glow: "#A07F9A", moon: "#EAD9DA", hills: "#68627E", leaf: "#B195AA", ground: "#514C66" },
};

// Original vector placeholders. No artwork or characters from the reference image.
export function SceneArt({ theme = "forest", compact = false }: { theme?: ArtTheme; compact?: boolean }) {
  const id = useId().replaceAll(":", "");
  const p = palettes[theme];
  return (
    <svg className="scene-art" viewBox="0 0 1200 850" preserveAspectRatio="xMidYMid slice" role="img" aria-label="رسم خيالي أصلي لبطلين صغيرين في رحلة تحت ضوء القمر">
      <defs>
        <linearGradient id={`${id}-sky`} x2="0.7" y2="1"><stop stopColor={p.sky} /><stop offset="1" stopColor="#121B32" /></linearGradient>
        <radialGradient id={`${id}-aura`}><stop stopColor={p.glow} stopOpacity=".48" /><stop offset="1" stopColor={p.glow} stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-moon`} x2=".7" y2="1"><stop stopColor={p.moon} /><stop offset="1" stopColor={p.glow} /></linearGradient>
        <linearGradient id={`${id}-cape`} x2="1" y2="1"><stop stopColor="#EEAF62" /><stop offset="1" stopColor="#BB643F" /></linearGradient>
        <linearGradient id={`${id}-rock`} x2="0" y2="1"><stop stopColor={p.ground} /><stop offset="1" stopColor="#111B30" /></linearGradient>
      </defs>
      <path fill={`url(#${id}-sky)`} d="M0 0h1200v850H0z" />
      <ellipse cx="500" cy="310" rx="570" ry="410" fill={`url(#${id}-aura)`} />
      <g fill="#E9D9B7" opacity=".55">{Array.from({ length: compact ? 12 : 42 }, (_, i) => <circle key={i} cx={(i * 137 + 68) % 1140} cy={(i * 71 + 29) % 470} r={i % 4 === 0 ? 2.2 : 1.1} />)}</g>
      <circle cx="480" cy="280" r="170" fill={`url(#${id}-moon)`} opacity=".9" />
      <circle cx="450" cy="230" r="27" fill={p.glow} opacity=".16" /><circle cx="539" cy="330" r="44" fill={p.glow} opacity=".15" /><circle cx="400" cy="300" r="17" fill={p.glow} opacity=".18" />
      {theme === "space" && <ellipse cx="480" cy="280" rx="255" ry="46" fill="none" stroke="#C5B4D6" strokeWidth="14" opacity=".45" transform="rotate(-24 480 280)" />}
      <path d="M0 462 140 337l85 94 119-160 167 177 89-82 133 77 120-122 130 124 217-111v516H0Z" fill={p.hills} opacity=".5" />
      <path d="m0 546 153-95 103 71 163-129 191 133 140-61 109 73 141-86 200 104v294H0Z" fill={p.ground} />
      <g fill={p.leaf} opacity=".35"><path d="m193 407-50-76 19 4-31-57-29 57 19-4-50 76h45v65h31v-65Z" /><path d="m842 454-60-88 22 5-35-65-34 65 21-5-59 88h54v70h36v-70Z" /><path d="m1014 490-46-72 17 4-29-53-27 53 17-4-46 72h42v60h29v-60Z" /></g>
      <g opacity=".9"><path d="M0 6c83 119 76 317 22 540l45 62C126 395 140 196 90 0Z" fill="#132D37" /><path d="M81 202 215 98l-6-24L76 143Z" fill="#132D37" /><path d="M39 77C88-25 226-12 268 41c-58 62-163 92-229 36" fill={p.leaf} opacity=".55" /><path d="M-31 303c104-75 223-19 246 54-79 26-178 3-246-54" fill={p.leaf} opacity=".6" /><path d="M121 135c35-78 147-91 196-40-48 43-134 64-196 40" fill={p.leaf} opacity=".5" /></g>
      <path d="M70 683q205-85 465-29t378 15l-67 181H0Z" fill={`url(#${id}-rock)`} />
      <path d="M63 685q220-79 474-27t376 12" fill="none" stroke={p.leaf} strokeWidth="9" opacity=".6" />
      <path d="M167 690 149 730l65 4-22 116M729 702l-23 62 45 20-17 66M467 720l-19 46 33 22-16 62" fill="none" stroke="#54716A" strokeWidth="3" opacity=".22" />
      <ellipse cx="420" cy="681" rx="190" ry="19" fill="#0C1527" opacity=".5" />
      {/* A small original fox explorer, with a satchel and a warm yellow cape. */}
      <g transform="translate(290 350)">
        <path d="M47 215c-111-28-147 71-75 100 33 14 61-8 72-35" fill="#C8794E" /><path d="M-41 286c-20-26-5-60 23-65-6 27-1 46 17 57Z" fill="#F1D4AF" />
        <path d="m44 183-33 130 113-9-5-125Z" fill={`url(#${id}-cape)`} />
        <path d="m51 300-9 31h27l12-32m18 0 2 32h26l-11-36" fill="#1A2A39" />
        <path d="M33 53 30-6l54 35 33-15 47-29-8 79" fill="#C98153" stroke="#272C36" strokeWidth="5" />
        <path d="m42 17 4 39 23-20m73-34-27 28 23 16" fill="#E8B394" />
        <path d="M29 79c0-71 132-79 136 2 3 62-31 105-69 104-42-1-70-41-67-106Z" fill="#D99D69" />
        <path d="M30 107c20-10 48 1 65 26 19-27 48-41 69-26-3 43-30 75-67 76-39 0-65-33-67-76" fill="#F3DFC0" />
        <ellipse cx="65" cy="99" rx="10" ry="15" fill="#172534" /><ellipse cx="128" cy="99" rx="10" ry="15" fill="#172534" /><circle cx="68" cy="94" r="3.8" fill="#fff" /><circle cx="131" cy="94" r="3.8" fill="#fff" />
        <path d="M84 136q12-9 24 0l-12 12Z" fill="#22313A" /><path d="M84 155q12 11 24 0" fill="none" stroke="#695345" strokeWidth="3" strokeLinecap="round" />
        <path d="m28 176 76 13 38-14-8 32-41 8-65-15Z" fill="#4E8980" /><path d="m112 206 39 58-29 6-24-58" fill="#4E8980" />
        <path d="m43 218-12 52q9 15 22 2l13-44m53-10 20 36q14 6 19-5l-17-43" fill="#D99D69" />
        <path d="m63 215 44 90" stroke="#695146" strokeWidth="9" /><rect x="77" y="264" width="49" height="39" rx="10" fill="#765445" /><rect x="97" y="265" width="9" height="15" rx="3" fill="#DBB975" />
      </g>
      {/* A friendly leaf creature carrying a tiny lantern. */}
      <g transform="translate(548 496)">
        <path d="M37 16Q18-31 63-47q14 31-10 57M62 16q9-47 45-31-4 37-41 45" fill={p.leaf} />
        <path d="M11 88c-12-84 99-114 123-26 10 36-7 94-59 96-50 2-61-37-64-70" fill="#639A8A" />
        <path d="M35 89c-6-37 63-49 77-10 13 37-11 60-35 60-25 0-37-20-42-50" fill="#B9CCAB" />
        <ellipse cx="54" cy="84" rx="6" ry="9" fill="#203842" /><ellipse cx="94" cy="82" rx="6" ry="9" fill="#203842" /><path d="M65 106q11 9 20-2" fill="none" stroke="#38534E" strokeWidth="3" strokeLinecap="round" />
        <path d="m41 147-7 20h23l7-15m26 0 5 15h24l-11-23M125 93l24 7" stroke="#639A8A" strokeWidth="13" strokeLinecap="round" />
        <path d="M148 109v-10a12 12 0 0 1 24 0v10" fill="none" stroke="#D7BB7B" strokeWidth="3" /><rect x="146" y="107" width="29" height="33" rx="7" fill="#E8B561" /><rect x="153" y="112" width="15" height="22" rx="5" fill="#FFE6A5" />
      </g>
      <g fill="#EDCB82">{[ [225, 510], [515, 472], [715, 570], [276, 618], [738, 374], [181, 421], [570, 399] ].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="8" opacity=".06" /><circle cx={x} cy={y} r="2.5" opacity=".8" /></g>)}</g>
      <g fill={p.leaf} opacity=".8"><path d="M171 705q-58-67-59-14 31-10 59 14m-16-4q16-78 39-42-27 15-39 42M791 709q-12-92 27-65-7 32-27 65m5-8q44-60 56-22-20-3-56 22" /></g>
      <path d="M0 810q90-98 190-17t192 38 208-4 209-26 401 17v32H0Z" fill="#121B32" />
    </svg>
  );
}

export function CategoryArt({ symbol }: { symbol: CategorySymbol }) {
  const id = useId().replaceAll(":", "");
  return <svg viewBox="0 0 160 160" fill="none" aria-hidden="true">
    <defs><radialGradient id={id} cx=".4" cy=".3" r=".8"><stop stopColor="var(--category-light)" /><stop offset="1" stopColor="var(--category-dark)" /></radialGradient></defs>
    <circle cx="80" cy="84" r="61" fill={`url(#${id})`} /><circle cx="80" cy="84" r="52" stroke="white" strokeOpacity=".08" />
    <ellipse cx="80" cy="131" rx="32" ry="5" fill="#121B32" opacity=".2" />
    {symbol === "clapper" && <g><rect x="44" y="66" width="72" height="54" rx="10" fill="#3B4559" stroke="#F4D59B" strokeWidth="3" /><path d="m42 56 68-16 4 16-68 16Z" fill="#E89B54" /><path d="m52 54 10-14m14 11 10-14m14 11 10-14" stroke="#2B3344" strokeWidth="5" strokeLinecap="round" /><path d="m73 81 20 12-20 12Z" fill="#F8E3B5" /><circle cx="52" cy="74" r="3" fill="#F4D59B" /></g>}
    {symbol === "bolt" && <g><circle cx="80" cy="82" r="36" fill="#5B3A42" opacity=".55" /><path d="m88 38-28 44h22l-10 40 34-48H84Z" fill="#F6C467" stroke="#FFE9B3" strokeWidth="3" strokeLinejoin="round" /><path d="m46 54 8 6m60 36 8 6M48 106l8-6" stroke="#E88060" strokeWidth="4" strokeLinecap="round" /></g>}
    {symbol === "compass" && <g><path d="m51 47-9-11m67 12 10-11M49 116l-10 11m72-11 10 11" stroke="#DAB87F" strokeWidth="6" strokeLinecap="round" /><circle cx="80" cy="82" r="39" fill="#C78C4D" /><circle cx="80" cy="82" r="31" fill="#F4D59B" /><path d="m93 58-6 31-21 17 6-32Z" fill="#BE5F48" /><path d="m72 74 15 15-21 17Z" fill="#677B75" /><circle cx="80" cy="82" r="5" fill="#F8E8BC" /><path d="M80 48v6m0 56v6m-34-34h6m56 0h6" stroke="#825C3E" strokeWidth="3" /></g>}
    {symbol === "popcorn" && <g><path d="m48 75 8 51h49l9-51Z" fill="#F3D6B3" /><path d="m58 75 6 51h12V75m12 0v51h12l5-51" fill="#C76557" /><path d="M46 76c-15-8-8-27 6-27-5-21 17-29 28-16 12-13 32-2 27 14 20-2 26 21 7 29" fill="#F6DE9B" /><circle cx="59" cy="55" r="12" fill="#FFE9B3" /><circle cx="85" cy="46" r="12" fill="#FFF0C7" /><circle cx="100" cy="63" r="11" fill="#FFE9B3" /><path d="M48 78h66" stroke="#FCEDD6" strokeWidth="5" /><path d="m38 33 4-8m79 14 8 1" stroke="#E9BD76" strokeWidth="4" strokeLinecap="round" /></g>}
    {symbol === "planet" && <g transform="rotate(-25 80 80)"><circle cx="80" cy="80" r="34" fill="#D4B7DE" /><path d="M52 61q21 21 62 12m-65 2q32 28 61 17m-50 9q25 17 40 10" stroke="#9F84B3" strokeWidth="8" /><ellipse cx="80" cy="88" rx="61" ry="16" stroke="#E9D6B1" strokeWidth="8" /><path d="M135 73q25 31-55 31" stroke="#F5DFB6" strokeWidth="8" /><circle cx="38" cy="28" r="4" fill="#EAD3AF" /><path d="m124 29 2-7 2 7 7 2-7 2-2 7-2-7-7-2Z" fill="#F2DEB8" /></g>}
    {symbol === "magic" && <g><path d="m40 120 27-68h34l25 68q-43 22-86 0" fill="#8670AD" /><path d="m67 52 17-29 17 29" fill="#9F85BC" /><path d="M61 69q21 9 45 0" stroke="#E1BB74" strokeWidth="6" /><ellipse cx="83" cy="119" rx="49" ry="13" fill="#AA8ABF" /><path d="m81 84 3 9 9 1-7 6 2 9-7-5-8 5 3-9-7-6 9-1Z" fill="#EED19A" /><path d="m35 47 3-10 3 10 10 3-10 3-3 10-3-10-10-3Zm88 17 2-7 2 7 7 2-7 2-2 7-2-7-7-2Z" fill="#EAD6AB" /></g>}
    {symbol === "home" && <g><path d="M50 70h61v54H50Z" fill="#F0C2AE" /><path d="m38 72 43-36 43 36-8 10-35-29-35 29Z" fill="#BD746C" /><path d="M67 124V91h28v33" fill="#A87877" /><rect x="57" y="77" width="12" height="12" rx="2" fill="#F8E3B5" /><rect x="94" y="77" width="12" height="12" rx="2" fill="#F8E3B5" /><path d="M104 47V35h10v21" fill="#A87877" /><path d="M76 65c-10-11-17 3 5 13 22-10 15-24 5-13l-5 4Z" fill="#E7A08B" /><path d="m37 103-7-15m96 18 6-13" stroke="#91B3A0" strokeWidth="6" strokeLinecap="round" /></g>}
    {symbol === "anime" && <g><path d="M42 74c8-24 68-24 76 0-4 28-22 44-38 44S46 102 42 74Z" fill="#F4DFC8" /><path d="M38 66c8-18 76-18 84 0l-6 14c-24-8-48-8-72 0Z" fill="#D96B59" /><circle cx="80" cy="65" r="7" fill="#F6C973" /><ellipse cx="64" cy="88" rx="6" ry="8" fill="#233246" /><ellipse cx="96" cy="88" rx="6" ry="8" fill="#233246" /><circle cx="66" cy="85" r="2.5" fill="#fff" /><circle cx="98" cy="85" r="2.5" fill="#fff" /><path d="M74 103q6 6 12 0" stroke="#7A564A" strokeWidth="3" strokeLinecap="round" /><path d="m112 44 3-9 3 9 9 3-9 3-3 9-3-9-9-3Z" fill="#FFE6A5" /></g>}
    <g fill="#F7E5BD" opacity=".7"><circle cx="26" cy="78" r="2.5" /><circle cx="133" cy="111" r="2" /><circle cx="116" cy="20" r="2.5" /></g>
  </svg>;
}
