import type { ReactNode } from "react";
import type { StoreKind } from "../config";

const ink = "#3b3128";

function ArtFrame({ children }: { children: ReactNode }) {
  return (
    <svg className="store-svg" viewBox="0 0 320 400" role="img" aria-hidden="true" focusable="false">
      <g stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

function BurgerIcon() {
  return (
    <g>
      <path d="M12 39C15 15 31 6 50 6s35 9 38 33Z" fill="#efb735" />
      <path d="M26 24c4-3 8-3 12 0M52 17c4-3 8-3 12 0M65 29c4-3 8-3 12 0" fill="none" strokeWidth="2" />
      <path d="m10 46 16-7 20 8 18-8 26 7-8 15H19Z" fill="#7c9a72" />
      <path d="M14 56h72v14H14z" fill="#c9573b" />
      <path d="m13 71 74-1-8 16H22Z" fill="#f5d77a" />
      <path d="M16 84h68c0 12-8 17-18 17H34c-11 0-18-5-18-17Z" fill="#efb735" />
    </g>
  );
}

function BowlIcon() {
  return (
    <g>
      <path d="M12 45h76c-3 31-18 46-38 46S15 76 12 45Z" fill="#fff3d9" />
      <path d="M7 45h86" fill="none" />
      <path d="M24 34c13-13 38-13 52 0" fill="none" stroke="#c9573b" strokeWidth="6" />
      <path d="M32 25c-8-8 7-11 0-20M51 25c-8-8 7-11 0-20M70 25c-8-8 7-11 0-20" fill="none" strokeWidth="2.5" />
      <path d="M35 92h30" fill="none" />
      <path d="m65 35 23-27M72 38l20-25" fill="none" strokeWidth="4" />
    </g>
  );
}

function LotusIcon() {
  return (
    <g>
      <path d="M50 77C25 62 20 37 50 9c30 28 25 53 0 68Z" fill="#e3ac3c" />
      <path d="M48 80C22 82 5 62 10 32c24 6 37 22 38 48ZM52 80c26 2 43-18 38-48-24 6-37 22-38 48Z" fill="#7c9a72" />
      <path d="M50 77C37 57 40 39 50 22c10 17 13 35 0 55Z" fill="#f5eedf" />
      <path d="M19 91c19-8 43-8 62 0" fill="none" />
    </g>
  );
}

function CoffeeIcon() {
  return (
    <g>
      <path d="M18 31h57v37c0 17-11 27-28 27S18 85 18 68Z" fill="#fff8e9" />
      <path d="M75 40h8c19 0 19 27 0 27h-9" fill="none" strokeWidth="6" />
      <path d="M12 97h76" fill="none" />
      <path d="M35 24c-8-8 7-10 0-19M55 24c-8-8 7-10 0-19" fill="none" />
      <path d="m31 56 10-8 9 8 10-8 8 8" fill="none" stroke="#7c9a72" />
    </g>
  );
}

function CakeIcon() {
  return (
    <g>
      <path d="M17 45h68v47H17z" fill="#f2c1ad" />
      <path d="M17 60c10-13 16 10 27-2 9-10 15 9 25-1 7-7 11-2 16 3V39H17Z" fill="#fff8e9" />
      <path d="M13 92h76" fill="none" />
      <path d="M50 38V20" fill="none" />
      <path d="M50 20c-12-8-3-17 0-17s12 9 0 17Z" fill="#efb735" />
      <path d="M26 39c0-9 14-9 14 0M61 39c0-9 14-9 14 0" fill="#c9573b" />
      <path d="M31 72h38" fill="none" stroke="#fff8e9" strokeWidth="5" />
    </g>
  );
}

function Plant({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M17 42h39l-6 39H24Z" fill="#c9573b" />
      <path d="M36 44C12 37 7 20 12 6c18 4 27 17 24 38ZM38 44c25-7 31-24 25-38-17 4-26 17-25 38Z" fill="#7c9a72" />
      <path d="M37 43V15" fill="none" strokeWidth="2" />
    </g>
  );
}

function BurgerArt() {
  return (
    <ArtFrame>
      <circle cx="260" cy="69" r="34" fill="#73bec9" stroke="none" />
      <path d="M22 365h276M40 378h240" fill="none" strokeWidth="2" />
      <path d="M57 127h206v227H57Z" fill="#ce4938" />
      <path d="M49 127h222l-14-22H63Z" fill="#382218" />
      <rect x="78" y="39" width="164" height="89" rx="10" fill="#f8d66d" />
      <g transform="translate(87 50) scale(.53)"><BurgerIcon /></g>
      <text x="174" y="91" fill="#382218" stroke="none" textAnchor="middle" fontSize="29" fontWeight="900" fontFamily="Arial, sans-serif">食刻</text>
      <text x="174" y="113" fill="#382218" stroke="none" textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">FOODSTAGE</text>
      <path d="M47 145h226l-10 48H57Z" fill="#fff3d9" />
      <path d="m68 145 5 48M104 145l2 48M140 145v48M177 145l-2 48M213 145l-5 48M249 145l-8 48" fill="none" strokeWidth="18" stroke="#efb735" />
      <path d="M47 145h226l-10 48H57Z" fill="none" />
      <path d="M57 193c8 14 24 14 32 0 8 14 24 14 32 0 8 14 24 14 32 0 8 14 24 14 32 0 8 14 24 14 32 0 8 14 24 14 32 0" fill="none" />
      <rect x="73" y="215" width="88" height="102" rx="3" fill="#bfe0df" />
      <path d="M117 215v102M73 267h88" fill="none" strokeWidth="2" />
      <g transform="translate(88 228) scale(.58)"><BurgerIcon /></g>
      <rect x="181" y="211" width="61" height="143" rx="3" fill="#fff3d9" />
      <rect x="191" y="225" width="41" height="51" rx="2" fill="#73bec9" />
      <circle cx="228" cy="296" r="4" fill="#382218" stroke="none" />
      <rect x="189" y="163" width="48" height="27" rx="3" fill="#ce3326" transform="rotate(4 189 163)" />
      <text x="213" y="182" fill="#fff3d9" stroke="none" textAnchor="middle" fontSize="12" fontWeight="800" fontFamily="Arial, sans-serif" transform="rotate(4 213 182)">OPEN</text>
      <path d="M72 333h91M181 333h62" fill="none" strokeWidth="2" />
      <g transform="translate(27 292) scale(.73)"><Plant /></g>
      <path d="m267 311 17 43h-34Z" fill="#efb735" />
      <path d="M258 335h18" fill="none" />
    </ArtFrame>
  );
}

function SiamArt() {
  return (
    <ArtFrame>
      <circle cx="56" cy="68" r="34" fill="#e3ac3c" stroke="none" />
      <path d="M22 365h276M40 378h240" fill="none" strokeWidth="2" />
      <path d="M55 116h210v238H55Z" fill="#426c58" />
      <path d="m39 116 43-43h156l43 43-28-7-14-18H81l-14 18Z" fill="#173e35" />
      <path d="m78 73 19-24h126l19 24" fill="#c9573b" />
      <rect x="81" y="89" width="158" height="78" rx="4" fill="#f5eedf" />
      <g transform="translate(91 96) scale(.54)"><LotusIcon /></g>
      <text x="179" y="122" fill="#173e35" stroke="none" textAnchor="middle" fontSize="22" fontWeight="600" fontFamily="Kaiti SC, STKaiti, serif">暹罗食刻</text>
      <text x="179" y="145" fill="#a9402b" stroke="none" textAnchor="middle" fontSize="10" fontFamily="Arial, sans-serif" letterSpacing="1">SIAM SHIKE</text>
      <path d="M48 181h224l-12 35H60Z" fill="#edcf73" />
      <path d="M60 216c8 13 20 13 28 0 8 13 20 13 28 0 8 13 20 13 28 0 8 13 20 13 28 0 8 13 20 13 28 0 8 13 20 13 28 0" fill="none" />
      <rect x="72" y="235" width="75" height="119" fill="#9a6547" />
      <rect x="82" y="247" width="55" height="57" fill="#f5d88b" />
      <path d="M109 247v57M82 275h55" fill="none" strokeWidth="2" />
      <circle cx="132" cy="323" r="4" fill="#edcf73" />
      <rect x="169" y="234" width="78" height="84" fill="#f5eedf" />
      <g transform="translate(178 238) scale(.6)"><BowlIcon /></g>
      <path d="M170 331h77M72 331h75" fill="none" strokeWidth="2" />
      <g transform="translate(237 293) scale(.72)"><Plant /></g>
      <path d="M41 345c15-19 24-18 35 0M263 347c10-15 18-15 27 0" fill="#7c9a72" />
    </ArtFrame>
  );
}

function NoodleArt() {
  return (
    <ArtFrame>
      <path d="M22 365h276M40 378h240" fill="none" strokeWidth="2" />
      <path d="M54 102h212v252H54Z" fill="#7296a0" />
      <path d="M42 103h236L260 78H60Z" fill="#385865" />
      <rect x="88" y="43" width="144" height="69" rx="5" fill="#f1dfb8" />
      <text x="160" y="87" fill="#385865" stroke="none" textAnchor="middle" fontSize="25" fontWeight="600" fontFamily="Kaiti SC, STKaiti, serif">巷口面馆</text>
      <path d="M68 139h184v48H68Z" fill="#f5eedf" />
      <path d="M68 139h184M98 139v48M130 139v48M162 139v48M194 139v48M226 139v48" fill="none" />
      <path d="M69 187c10 13 20 13 29 0 10 13 21 13 32 0 10 13 21 13 32 0 10 13 21 13 32 0 10 13 21 13 32 0 9 12 17 12 25 0" fill="none" />
      <rect x="75" y="211" width="79" height="143" fill="#365968" />
      <rect x="87" y="226" width="55" height="66" fill="#d6e2df" />
      <path d="M114 226v66" fill="none" strokeWidth="2" />
      <rect x="174" y="210" width="70" height="105" fill="#f5eedf" />
      <g transform="translate(178 217) scale(.62)"><BowlIcon /></g>
      <path d="M75 331h79M174 331h70" fill="none" strokeWidth="2" />
      <path d="M39 354h51M244 354h38" fill="none" strokeWidth="6" />
    </ArtFrame>
  );
}

function CoffeeArt() {
  return (
    <ArtFrame>
      <path d="M22 365h276M40 378h240" fill="none" strokeWidth="2" />
      <path d="M58 113h204v241H58Z" fill="#9aab83" />
      <path d="M46 113h228l-20-30H66Z" fill="#586c50" />
      <rect x="80" y="45" width="160" height="70" rx="35" fill="#f2e6cd" />
      <g transform="translate(89 54) scale(.48)"><CoffeeIcon /></g>
      <text x="179" y="86" fill="#49674c" stroke="none" textAnchor="middle" fontSize="24" fontWeight="600" fontFamily="Kaiti SC, STKaiti, serif">山野咖啡</text>
      <path d="M62 139h196v51H62Z" fill="#e7d5b4" />
      <path d="m62 139 16 51M104 139l8 51M146 139v51M188 139l-8 51M230 139l-16 51" fill="none" stroke="#f7f0df" strokeWidth="16" />
      <path d="M62 139h196v51H62Z" fill="none" />
      <rect x="77" y="216" width="72" height="138" fill="#665448" />
      <rect x="88" y="229" width="50" height="62" fill="#d8e0d0" />
      <path d="M113 229v62" fill="none" strokeWidth="2" />
      <rect x="169" y="215" width="74" height="99" fill="#f5eedf" />
      <g transform="translate(177 222) scale(.58)"><CoffeeIcon /></g>
      <path d="M77 333h72M169 333h74" fill="none" strokeWidth="2" />
      <g transform="translate(242 296) scale(.68)"><Plant /></g>
    </ArtFrame>
  );
}

function DessertArt() {
  return (
    <ArtFrame>
      <path d="M22 365h276M40 378h240" fill="none" strokeWidth="2" />
      <path d="M55 112h210v242H55Z" fill="#d59c86" />
      <path d="M45 112h230l-17-27H62Z" fill="#9f675c" />
      <rect x="72" y="42" width="176" height="73" rx="8" fill="#fff0cf" />
      <g transform="translate(80 50) scale(.5)"><CakeIcon /></g>
      <text x="181" y="84" fill="#a65347" stroke="none" textAnchor="middle" fontSize="23" fontWeight="600" fontFamily="Kaiti SC, STKaiti, serif">甜品补给站</text>
      <path d="M48 139h224l-9 52H57Z" fill="#f8d9b5" />
      <path d="m70 139 4 52M111 139l2 52M152 139v52M193 139l-2 52M234 139l-4 52" fill="none" stroke="#fff8e9" strokeWidth="17" />
      <path d="M48 139h224l-9 52H57Z" fill="none" />
      <path d="M57 191c8 13 21 13 29 0 8 13 21 13 29 0 8 13 21 13 29 0 8 13 21 13 29 0 8 13 21 13 29 0 8 13 21 13 29 0 8 13 21 13 29 0" fill="none" />
      <rect x="73" y="219" width="80" height="100" fill="#f5eedf" />
      <g transform="translate(82 224) scale(.61)"><CakeIcon /></g>
      <rect x="174" y="215" width="68" height="139" fill="#8d6258" />
      <rect x="184" y="229" width="48" height="59" fill="#f2d9c6" />
      <path d="M208 229v59" fill="none" strokeWidth="2" />
      <circle cx="226" cy="310" r="4" fill="#fff0cf" />
      <path d="M73 333h80M174 333h68" fill="none" strokeWidth="2" />
      <path d="m35 338 18-22 18 22ZM249 338l15-19 16 19Z" fill="#efb735" />
    </ArtFrame>
  );
}

export function StoreArt({ kind }: { kind: StoreKind }) {
  switch (kind) {
    case "burger": return <BurgerArt />;
    case "siam": return <SiamArt />;
    case "noodle": return <NoodleArt />;
    case "coffee": return <CoffeeArt />;
    case "dessert": return <DessertArt />;
  }
}
