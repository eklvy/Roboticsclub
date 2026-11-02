export default function Scene({
  sector = 0,
  hero = false,
}: {
  sector?: number;
  hero?: boolean;
}) {
  const color = [
    "#00e5ff",
    "#8b5cf6",
    "#ffd166",
    "#39ff88",
    "#ff3b5c",
    "#9fb8ff",
  ][sector];
  return (
    <svg
      className={`scene ${hero ? "hero-scene" : ""}`}
      viewBox="0 0 1200 780"
      role="img"
      aria-label="NEXUS-09 robotics facility, a dark industrial chamber illuminated by emergency lights"
    >
      <defs>
        <linearGradient id="floor" x2="0" y2="1">
          <stop stopColor="#0a1922" />
          <stop offset="1" stopColor="#030609" />
        </linearGradient>
        <linearGradient id="metal">
          <stop stopColor="#13232e" />
          <stop offset=".5" stopColor="#26333c" />
          <stop offset="1" stopColor="#071017" />
        </linearGradient>
        <radialGradient id="light">
          <stop stopColor={color} stopOpacity=".22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="door" x2="0" y2="1">
          <stop stopColor="#142530" />
          <stop offset="1" stopColor="#05090e" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <pattern
          id="grille"
          width="14"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 2H14" stroke="#22333c" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="1200" height="780" fill="#04090e" />
      <path d="M0 0H1200L920 180H300Z" fill="#101a22" />
      <path d="M0 780V0L300 180V530Z" fill="#0c151d" />
      <path d="M1200 0L920 180V530L1200 780" fill="#0b141b" />
      <path d="M0 780L300 530H920L1200 780Z" fill="url(#floor)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i} opacity={1 - i * 0.1}>
          <path
            d={`M${i * 52} 0 L${300 + i * 13} 180 M${1200 - i * 50} 0 L${920 - i * 13} 180`}
            stroke="#26303a"
            strokeWidth="9"
          />
          <path
            d={`M${i * 180 - 100} 780L${400 + i * 75} 530`}
            stroke="#1d3440"
            strokeWidth="1"
          />
        </g>
      ))}
      {[570, 630, 710].map((y) => (
        <path key={y} d={`M0 ${y}H1200`} stroke="#172a34" />
      ))}
      <rect x="300" y="180" width="620" height="350" fill="#111d26" />
      <path
        d="M310 188H910V520H310Z"
        stroke="#33404a"
        strokeWidth="3"
        fill="none"
      />
      <rect
        x="480"
        y="220"
        width="270"
        height="310"
        rx="3"
        fill="#02060b"
        stroke="#2b3e4a"
        strokeWidth="12"
      />
      <path
        d="M495 235H605V517H495ZM619 235H735V517H619Z"
        fill="url(#door)"
        stroke="#29414d"
      />
      <path d="M611 238V515" stroke={color} strokeWidth="3" />
      <path d="M485 226H744" stroke={color} strokeWidth="3" />
      <path
        d="M525 275H575V380H525ZM650 275H703V380H650Z"
        fill="#0a1119"
        stroke="#1e303c"
      />
      <text
        x="615"
        y="437"
        textAnchor="middle"
        fill="#4d6a7b"
        fontSize="13"
        fontFamily="monospace"
        letterSpacing="4"
      >
        NEXUS — 09
      </text>
      <text
        x="614"
        y="466"
        textAnchor="middle"
        fill={color}
        opacity=".7"
        fontSize="9"
        fontFamily="monospace"
        letterSpacing="3"
      >
        CONTAINMENT ACTIVE
      </text>

      {sector === 1 && (
        <g>
          <rect x="478" y="220" width="270" height="310" fill="#07101b" />
          <circle
            cx="613"
            cy="367"
            r="118"
            fill="#142032"
            stroke="#4b426b"
            strokeWidth="12"
          />
          <circle
            cx="613"
            cy="367"
            r="91"
            fill="#090e19"
            stroke={color}
            strokeWidth="2"
          />
          <path
            d="M613 282L687 324V410L613 452L539 410V324Z"
            fill="#19203b"
            stroke="#6d6290"
            strokeWidth="4"
          />
          <circle
            cx="613"
            cy="367"
            r="35"
            fill="#0b0d19"
            stroke={color}
            strokeWidth="5"
          />
          <path d="M613 342V392M588 367H638" stroke="#8f80ba" strokeWidth="6" />
          <text
            x="613"
            y="507"
            textAnchor="middle"
            fill={color}
            fontSize="10"
            fontFamily="monospace"
          >
            ENCRYPTED // VAULT 02
          </text>
        </g>
      )}
      {sector === 2 && (
        <g>
          <rect
            x="478"
            y="220"
            width="270"
            height="310"
            fill="#0d1417"
            stroke="#51606a"
            strokeWidth="4"
          />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect
                x={498 + i * 78}
                y="255"
                width="58"
                height="220"
                fill="#192328"
                stroke="#43505a"
              />
              <path
                d={`M${527 + i * 78} 265V465`}
                stroke={color}
                strokeWidth="4"
              />
              {[0, 1, 2, 3].map((j) => (
                <circle
                  key={j}
                  cx={527 + i * 78}
                  cy={290 + j * 50}
                  r="10"
                  fill="#10222b"
                  stroke={color}
                  strokeWidth="2"
                />
              ))}
            </g>
          ))}
          <text
            x="613"
            y="506"
            textAnchor="middle"
            fill={color}
            fontSize="10"
            fontFamily="monospace"
          >
            CAUTION // HIGH VOLTAGE
          </text>
        </g>
      )}
      {sector === 3 && (
        <g>
          <rect x="478" y="220" width="270" height="310" fill="#07150f" />
          <path
            d="M500 250H722V470H500Z M555 250V415H665V305H610V360 M500 470L722 250"
            fill="none"
            stroke="#275844"
            strokeWidth="8"
          />
          <circle cx="525" cy="277" r="13" fill={color} />
          <path
            d="M697 432V455H675"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <text
            x="613"
            y="507"
            textAnchor="middle"
            fill={color}
            fontSize="10"
            fontFamily="monospace"
          >
            AUTONOMOUS TEST ARRAY
          </text>
        </g>
      )}
      {sector === 4 && (
        <g>
          <rect x="478" y="220" width="270" height="310" fill="#100a12" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect
                x={491 + i * 82}
                y="237"
                width="73"
                height="267"
                fill="#1c1723"
                stroke="#443644"
              />
              {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
                <g key={j}>
                  <rect
                    x={499 + i * 82}
                    y={247 + j * 31}
                    width="57"
                    height="22"
                    fill="#0b0910"
                  />
                  <path
                    d={`M${505 + i * 82} ${257 + j * 31}h30`}
                    stroke="#534252"
                    strokeWidth="3"
                  />
                  <circle
                    cx={549 + i * 82}
                    cy={258 + j * 31}
                    r="2"
                    fill={j % 3 === 0 ? color : "#8b5cf6"}
                  />
                </g>
              ))}
            </g>
          ))}
          <circle
            cx="613"
            cy="363"
            r="50"
            fill="#170a12ee"
            stroke={color}
            strokeWidth="2"
          />
          <circle cx="613" cy="363" r="21" fill={color} opacity=".85" />
          <path d="M580 363H646M613 330V396" stroke="#ff98ad" strokeWidth="1" />
        </g>
      )}
      {sector === 5 && (
        <g>
          <rect x="478" y="220" width="270" height="310" fill="#070d18" />
          <ellipse
            cx="613"
            cy="495"
            rx="100"
            ry="22"
            fill="#1b2e46"
            stroke="#6b8aad"
          />
          <path
            d="M581 258V481M645 258V481"
            stroke="#304661"
            strokeWidth="15"
          />
          <rect
            x="592"
            y="260"
            width="42"
            height="219"
            fill={color}
            opacity=".3"
          />
          <path d="M613 265V475" stroke="#d4e4ff" strokeWidth="9" />
          {[285, 350, 415].map((y) => (
            <ellipse
              key={y}
              cx="613"
              cy={y}
              rx="80"
              ry="20"
              stroke={color}
              fill="none"
              strokeWidth="5"
            />
          ))}
          <ellipse
            cx="613"
            cy="250"
            rx="66"
            ry="20"
            fill="#26364e"
            stroke="#526b91"
          />
          <circle cx="613" cy="366" r="115" fill="url(#light)" />
        </g>
      )}
      <rect
        x="330"
        y="238"
        width="106"
        height="165"
        fill="#070e15"
        stroke="#2c3d49"
      />
      <rect x="340" y="248" width="86" height="75" fill="#071d26" />
      <path
        d="M350 280H365L372 266L380 304L387 278H416"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M345 ${340 + i * 14}H419`}
          stroke="#2a3c48"
          strokeWidth="4"
        />
      ))}
      <rect
        x="780"
        y="250"
        width="100"
        height="170"
        fill="url(#grille)"
        stroke="#253c49"
      />
      <circle cx="803" cy="450" r="4" fill="#ff3b5c" />
      <circle cx="821" cy="450" r="4" fill={color} />
      <path
        d="M58 80L274 205V521L58 700Z"
        fill="#0a1219"
        stroke="#223541"
        strokeWidth="8"
      />
      <path d="M77 111L252 214V493L77 627Z" fill="url(#grille)" />
      <path d="M89 124L235 213" stroke={color} strokeWidth="4" />
      <path
        d="M1070 88L946 193V532L1070 650Z"
        fill="#0c151d"
        stroke="#263845"
        strokeWidth="8"
      />
      <path d="M1110 80V680M1152 20V745" stroke="#172b37" strokeWidth="17" />
      <path d="M1128 110V670" stroke={color} strokeWidth="3" />
      <path
        d="M350 552L135 765M875 552L1095 765"
        stroke={color}
        strokeWidth="3"
        opacity=".7"
      />
      <path
        d="M350 552L135 765M875 552L1095 765M611 238V515"
        stroke={color}
        strokeWidth="13"
        filter="url(#glow)"
        opacity=".35"
      />
      <path d="M391 140H806" stroke="#90d5e1" strokeWidth="5" />
      <path
        d="M391 140H806"
        stroke={color}
        strokeWidth="17"
        opacity=".3"
        filter="url(#glow)"
      />
      <ellipse cx="610" cy="445" rx="500" ry="360" fill="url(#light)" />
      <g transform="translate(850 465)">
        <path d="M0 0L70 -15L103 12L29 30Z" fill="#243643" />
        <path d="M0 0V80L29 105V30Z" fill="#0f1b25" />
        <path d="M29 30L103 12V86L29 105Z" fill="#182833" />
        <path d="M40 50L91 39" stroke={color} strokeWidth="3" />
        <path d="M40 64L91 53" stroke="#314552" strokeWidth="3" />
      </g>
      <g className="drone" transform="translate(225 443)">
        <path
          d="M0 0L51 -16L85 1V50L33 66L0 44Z"
          fill="url(#metal)"
          stroke="#456071"
        />
        <path d="M17 11L66 -1V23L17 36Z" fill="#030a10" />
        <path d="M26 19L55 11" stroke={color} strokeWidth="5" />
        <path d="M13 57L5 82M63 55L76 76" stroke="#3c4e5a" strokeWidth="9" />
      </g>
      <text
        x="333"
        y="209"
        fill="#567181"
        fontSize="9"
        fontFamily="monospace"
        letterSpacing="2"
      >
        SECTOR {String(sector + 1).padStart(2, "0")} / RESTRICTED ACCESS
      </text>
    </svg>
  );
}
