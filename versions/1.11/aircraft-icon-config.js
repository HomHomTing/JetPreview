(function () {
  const sourceDate = "2026-08-05T18:39:00+08:00";
  const iconAssetSet = "fr24-template-shadow-fr24yellow";
  const iconAssetBasePath = `assets/aircraft-icons/${iconAssetSet}`;
  const defaultIconKey = "LJ60";
  const sizeClasses = ["light", "midsize", "super-midsize", "long-range", "ultra-long"];
  const categoryOptions = [
    "Business Jet",
    "Light Aircraft",
    "Turboprop",
    "Glider",
    "Commercial Jet",
    "Regional Jet",
    "Widebody Jet",
    "Helicopter",
    "Balloon",
    "Drone",
    "Military",
    "Ground",
    "Spacecraft",
    "Special"
  ];

  const iconPaths = {
    LJ60: "M32 4.5c2.8 0 4.6 13.4 5.3 19.7l17.8 7.2c1.1.4 1.8 1.4 1.8 2.6v3.3L38 33.6l-1 8.7 7.4 4.4V50l-10.1-2L32 59.5 29.7 48l-10.1 2v-3.3l7.4-4.4-1-8.7-18.9 3.7V34c0-1.2.7-2.2 1.8-2.6l17.8-7.2c.7-6.3 2.5-19.7 5.3-19.7Z",
    C206: "M32 11c1.8 0 3.2 8.8 3.9 13.5l17.5 3.2c1 .2 1.7 1.1 1.7 2.2v3L36.8 31l-.7 7.6 5.6 3.5v2.9l-7.8-1.7L32 53l-1.9-9.7-7.8 1.7v-2.9l5.6-3.5-.7-7.6L8.9 32.9v-3c0-1.1.7-2 1.7-2.2l17.5-3.2C28.8 19.8 30.2 11 32 11Z",
    C303: "M32 8.8c1.9 0 3.3 9.7 4 15.2l17.2 4.8c1 .3 1.7 1.2 1.7 2.3v2.9L36.9 31.8l-.8 7.8 6 3.8v3l-8.3-1.8L32 53.8l-1.8-9.2-8.3 1.8v-3l6-3.8-.8-7.8L9.1 34v-2.9c0-1.1.7-2 1.7-2.3L28 24c.7-5.5 2.1-15.2 4-15.2Zm-12.8 18.6h4.2v6.4h-4.2Zm21.4 0h4.2v6.4h-4.2Z",
    Q300: "M32 7.8c2.2 0 3.7 10.9 4.5 16.4l18.6 5.2c1.1.3 1.8 1.3 1.8 2.4v3.1l-19.5-2.1-.9 8.7 6.7 4.2v3.1l-9.1-2L32 56l-2.1-9.2-9.1 2v-3.1l6.7-4.2-.9-8.7-19.5 2.1v-3.1c0-1.1.7-2.1 1.8-2.4l18.6-5.2c.8-5.5 2.3-16.4 4.5-16.4Zm-14.5 20h4.7v6.8h-4.7Zm24.3 0h4.7v6.8h-4.7Z",
    ASW20: "M32 18.5c1.2 0 2.1 6 2.6 10.2l27 1.1c1 .1 1.8.9 1.8 1.9v1.4L34.9 35l-.4 5.6 9.3 2.8v2.2L33.6 45 32 53.5 30.4 45l-10.2.6v-2.2l9.3-2.8-.4-5.6L.6 33.1v-1.4c0-1 .8-1.8 1.8-1.9l27-1.1c.5-4.2 1.4-10.2 2.6-10.2Z",
    A320: "M32 6.5c2.8 0 4.7 13 5.4 18.7l17.8 7.5c1.1.5 1.7 1.5 1.7 2.6v3.1l-19-4.2-1 9.2 7.2 4.6v3.4l-9.8-2.1L32 58.5l-2.3-9.2-9.8 2.1V48l7.2-4.6-1-9.2-19 4.2v-3.1c0-1.1.6-2.1 1.7-2.6l17.8-7.5c.7-5.7 2.6-18.7 5.4-18.7ZM21 36.2h4.1v3H21Zm17.9 0H43v3h-4.1Z",
    B738: "M32 6c2.9 0 4.8 13.4 5.6 19.1L56 32.9c1.1.5 1.7 1.5 1.7 2.7v3.2l-19.6-4.4-1.1 9.4 7.5 4.8v3.5l-10.2-2.2L32 59l-2.3-9.1-10.2 2.2v-3.5l7.5-4.8-1.1-9.4-19.6 4.4v-3.2c0-1.2.6-2.2 1.7-2.7l18.4-7.8C27.2 19.4 29.1 6 32 6ZM20 36.2h4.6v3.2H20Zm19.4 0H44v3.2h-4.6Z",
    B736: "M32 8c2.5 0 4.2 11.5 4.9 16.7l16.6 7.2c1 .4 1.6 1.4 1.6 2.5v2.9l-17.8-4-1 8.3 6.7 4.2v3.2l-9.1-2L32 55.8l-1.9-8.8-9.1 2v-3.2l6.7-4.2-1-8.3-17.8 4v-2.9c0-1.1.6-2.1 1.6-2.5l16.6-7.2C27.8 19.5 29.5 8 32 8Z",
    B757: "M32 3.8c3.2 0 5.1 14.7 6 21l18.9 8.3c1.1.5 1.8 1.6 1.8 2.8v3.5l-20.2-4.8-1.1 10.7 8.4 5.4v3.7l-11.1-2.5L32 60.5l-2.7-8.6-11.1 2.5v-3.7l8.4-5.4-1.1-10.7-20.2 4.8v-3.5c0-1.2.7-2.3 1.8-2.8L26 24.8c.9-6.3 2.8-21 6-21Z",
    FOKKER100: "M32 6.8c2.6 0 4.2 12 4.8 17.7l15.8 6.1c1 .4 1.6 1.4 1.6 2.5v3L37.2 33l-.8 8.4 6.8 4.4V49l-9.2-2L32 56.8 30 47l-9.2 2v-3.2l6.8-4.4-.8-8.4-17 3.1v-3c0-1.1.6-2.1 1.6-2.5l15.8-6.1c.6-5.7 2.2-17.7 4.8-17.7Zm-9.8 20.7h5v5.8h-5Zm14.6 0h5v5.8h-5Z",
    RJ85: "M32 7.2c2.6 0 4.3 12.5 5 17.4l20 4.3c1.2.3 2 1.3 2 2.5v3.1l-21.2-2.1-.9 9.2 7 4.4v3.3l-9.7-2.1L32 57.5l-2.2-10.3-9.7 2.1V46l7-4.4-.9-9.2L5 34.5v-3.1c0-1.2.8-2.2 2-2.5l20-4.3c.7-4.9 2.4-17.4 5-17.4ZM14.7 29.6h3.9v3.1h-3.9Zm7.5-.8h3.9v3.1h-3.9Zm15.7 0h3.9v3.1h-3.9Zm7.5.8h3.9v3.1h-3.9Z",
    B767: "M32 4.5c3.1 0 5.1 14.4 6 20.5l19.2 8.1c1.1.5 1.8 1.6 1.8 2.8v3.5l-20.5-4.8-1.2 10.2 8.2 5.2v3.6l-10.9-2.4L32 59.7l-2.6-8.5-10.9 2.4V50l8.2-5.2-1.2-10.2L5 39.4v-3.5c0-1.2.7-2.3 1.8-2.8L26 25c.9-6.1 2.9-20.5 6-20.5ZM19 35.8h5.1v3.5H19Zm20.9 0H45v3.5h-5.1Z",
    A330: "M32 3.5c3.3 0 5.4 15.1 6.3 21.6l20 8.6c1.1.5 1.8 1.6 1.8 2.8v3.8l-21.4-5.1-1.3 11.2 9 5.8V56l-11.7-2.6L32 61l-2.7-7.6L17.6 56v-3.8l9-5.8-1.3-11.2-21.4 5.1v-3.8c0-1.2.7-2.3 1.8-2.8l20-8.6C26.6 18.6 28.7 3.5 32 3.5ZM18.3 36h5.4v3.6h-5.4Zm22 0h5.4v3.6h-5.4Z",
    B777: "M32 2.8c3.5 0 5.7 15.7 6.7 22.1l21.1 8.8c1.2.5 1.9 1.6 1.9 2.9v3.8l-22.5-5.3-1.3 11.5 9.1 5.7v4l-12.1-2.7L32 61.8l-2.9-8.2L17 56.3v-4l9.1-5.7-1.3-11.5-22.5 5.3v-3.8c0-1.3.7-2.4 1.9-2.9l21.1-8.8c1-6.4 3.2-22.1 6.7-22.1ZM18 35.8h5.8v3.8H18Zm22.2 0H46v3.8h-5.8Z",
    MD11: "M32 3.7c3.3 0 5.3 14.4 6.1 20.5l20 8.3c1.1.5 1.8 1.6 1.8 2.8v3.6l-21.3-4.9-1.1 10.5 8.5 5.3v3.7L34.6 51 32 59.8 29.4 51 18 53.5v-3.7l8.5-5.3-1.1-10.5-21.3 4.9v-3.6c0-1.2.7-2.3 1.8-2.8l20-8.3c.8-6.1 2.8-20.5 6.1-20.5Zm-2.3 20.2h4.6v6h-4.6Zm-11.2 11.6h5v3.4h-5Zm22 0h5v3.4h-5Z",
    A343: "M32 3.3c3.3 0 5.4 14.9 6.3 21.1l20.5 8.5c1.2.5 1.9 1.6 1.9 2.9v3.7l-21.8-5-1.2 10.9 8.7 5.5v3.8l-11.6-2.6L32 60.5l-2.8-8.4-11.6 2.6v-3.8l8.7-5.5-1.2-10.9-21.8 5v-3.7c0-1.3.7-2.4 1.9-2.9l20.5-8.5c.9-6.2 3-21.1 6.3-21.1ZM14.8 35h4v3h-4Zm7.3.7h4v3h-4Zm15.8 0h4v3h-4Zm7.3-.7h4v3h-4Z",
    A346: "M32 2.5c3.6 0 5.7 16.3 6.6 22.8l21.7 8.8c1.2.5 2 1.6 2 2.9v3.9l-23-5.3-1.4 11.7 9.4 6v4l-12.4-2.8L32 62l-2.9-7.5-12.4 2.8v-4l9.4-6-1.4-11.7-23 5.3V37c0-1.3.8-2.4 2-2.9l21.7-8.8c.9-6.5 3-22.8 6.6-22.8ZM13.8 35.4h4.2v3.1h-4.2Zm8.2.7h4.2v3.1H22Zm15.8 0H42v3.1h-4.2Zm8.2-.7h4.2v3.1H46Z",
    B747: "M32 3.5c3.5 0 5.5 15 6.5 21.5l20.8 8.3c1.2.5 1.9 1.6 1.9 2.9v3.9l-22.3-5.2-1.2 11.1 9.1 5.7v4l-12.1-2.7L32 61l-2.7-8-12.1 2.7v-4l9.1-5.7-1.2-11.1-22.3 5.2v-3.9c0-1.3.7-2.4 1.9-2.9L25.5 25C26.5 18.5 28.5 3.5 32 3.5ZM14.7 35.6h4.5v3.1h-4.5Zm44.3.2h-4.5v3.1H59Zm-39.4-2.2h4.3v2.9h-4.3Zm24.5 0h4.3v2.9h-4.3Z",
    A380: "M32 2.5c3.8 0 5.9 15.9 6.9 22.6l22.2 8.6c1.3.5 2.1 1.7 2.1 3.1v4.1l-24-5.6-1.4 11.7 9.8 6.1v4.2l-12.8-2.9L32 62l-2.8-7.6-12.8 2.9v-4.2l9.8-6.1-1.4-11.7-24 5.6v-4.1c0-1.4.8-2.6 2.1-3.1l22.2-8.6c1-6.7 3.1-22.6 6.9-22.6ZM13.9 35.8h5.4v3.2h-5.4Zm30.8 0h5.4v3.2h-5.4Z",
    A225: "M32 2.2c4.1 0 6.3 16.8 7.3 23.3l22.8 8.8c1.3.5 2.1 1.7 2.1 3.1v4.1l-24.2-5.4-1.5 11.5 10 6.2v4.1l-13.1-2.9L32 62.5 28.6 55l-13.1 2.9v-4.1l10-6.2L24 36.1-.2 41.5v-4.1c0-1.4.8-2.6 2.1-3.1l22.8-8.8c1-6.5 3.2-23.3 7.3-23.3ZM8.4 35.9h3.8v2.9H8.4Zm7.3.4h3.8v2.9h-3.8Zm7.3.4h3.8v2.9H23Zm14.2 0H41v2.9h-3.8Zm7.3-.4h3.8v2.9h-3.8Zm7.3-.4h3.8v2.9h-3.8Z",
    A3ST: "M32 4.2c5.8 0 9.4 7.8 9.8 17.8l17.7 8c1.2.5 1.9 1.7 1.9 3v3.8l-21.6-4.1-1.2 10.2 8.4 5.3v3.7L35.5 49.4 32 58.5l-3.5-9.1L17 51.9v-3.7l8.4-5.3-1.2-10.2-21.6 4.1V33c0-1.3.7-2.5 1.9-3l17.7-8c.4-10 4-17.8 9.8-17.8Z",
    EC: "M30.5 14h3v13.2l21.5-1.4c1.1-.1 2 .8 2 1.9v2.1L38 32l6.5 5.9h8.7c1.1 0 2 .9 2 2v2.3H43.1l-6.7-4.5-1.1 9.1 5.9 3.7v3l-8.1-1.8L32 59l-1.1-7.3-8.1 1.8v-3l5.9-3.7-1.1-9.1-6.7 4.5H8.8v-2.3c0-1.1.9-2 2-2h8.7L26 32 7 29.8v-2.1c0-1.1.9-2 2-1.9l21.5 1.4V14Zm-20-3.2h43v2.8h-43Z",
    BALL: "M32 6c8.2 0 14.6 6.7 14.6 15.4 0 8.5-5.2 17.1-12.2 20.9l2.4 5.7h4.6v4H22.6v-4h4.6l2.4-5.7c-7-3.8-12.2-12.4-12.2-20.9C17.4 12.7 23.8 6 32 6Zm-8 15.2c0 6.2 3.2 12.9 8 16.4 4.8-3.5 8-10.2 8-16.4C40 15.4 36.5 11 32 11s-8 4.4-8 10.2Z",
    DRON: "M30 29h4v6h-4v-6Zm-15-14a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm34 0a5 5 0 1 1 0 10 5 5 0 0 1 0-10ZM15 39a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm34 0a5 5 0 1 1 0 10 5 5 0 0 1 0-10ZM20 22l10 7-2.2 3.2-10-7L20 22Zm24 0 2.2 3.2-10 7L34 29l10-7ZM17.8 38.8l10-7L30 35l-10 7-2.2-3.2Zm28.4 0L44 42l-10-7 2.2-3.2 10 7Z",
    FGTR: "M32 4c2.6 0 4.2 13.7 4.8 20.2l20.5 10.2v3.4L37.5 34l-2.4 10 8.4 7.2v3.4L33.7 51 32 60l-1.7-9-9.8 3.6v-3.4l8.4-7.2-2.4-10L6.7 37.8v-3.4l20.5-10.2C27.8 17.7 29.4 4 32 4Z",
    GRND: "M25 10h14c1.4 0 2.5 1.1 2.5 2.5v39c0 1.4-1.1 2.5-2.5 2.5H25c-1.4 0-2.5-1.1-2.5-2.5v-39c0-1.4 1.1-2.5 2.5-2.5Zm2.5 4.8v8h9v-8h-9Zm-1 11.7v11h11v-11h-11Zm1 14.7v8h9v-8h-9Zm-8-18.7h3v7h-3v-7Zm0 12h3v7h-3v-7Zm22-12h3v7h-3v-7Zm0 12h3v7h-3v-7Z",
    SI2: "M32 20c1.1 0 1.9 5.3 2.3 8.6l28.5.9c.7 0 1.2.6 1.2 1.3v1.4l-29.4 2.1-.5 6.2 7.2 3.4v2.3L33.4 45 32 53.5 30.6 45l-7.9 1.2v-2.3l7.2-3.4-.5-6.2L0 32.2v-1.4c0-.7.5-1.3 1.2-1.3l28.5-.9c.4-3.3 1.2-8.6 2.3-8.6Z",
    CONC: "M32 3c2.4 0 4.3 15.5 5 22.2l23.5 13.5v4L37.4 35l-2.1 10.5 10.4 6.8v3.8L33.8 53 32 61l-1.8-8-11.9 3.1v-3.8l10.4-6.8L26.6 35 3.5 42.7v-4L27 25.2C27.7 18.5 29.6 3 32 3Z",
    SAT: "M25 23h14v14H25V23Zm-16-8 11 6.4-2.5 4.3-11-6.4L9 15Zm46 0 2.5 4.3-11 6.4-2.5-4.3L55 15ZM6.5 44.7l11-6.4 2.5 4.3-11 6.4-2.5-4.3Zm51 0L55 49l-11-6.4 2.5-4.3 11 6.4ZM29 27v6h6v-6h-6Z",
    ISS: "M28 24h8v16h-8V24Zm-24 2h18v4H4v-4Zm38 0h18v4H42v-4ZM4 34h18v4H4v-4Zm38 0h18v4H42v-4ZM25 17h14v4H25v-4Zm0 24h14v4H25v-4Zm-7-5h8v4h-8v-4Zm20 0h8v4h-8v-4Zm-20-12h8v4h-8v-4Zm20 0h8v4h-8v-4Z"
  };

  const fr24IconStyle = {
    fill: "#FDB813",
    stroke: "rgb(18, 25, 32)",
    glow: "rgba(253, 184, 19, 0.18)",
    hoverGlow: "rgba(253, 184, 19, 0.3)"
  };
  const iconStyles = Object.fromEntries(
    [...Object.keys(iconPaths), "GL7T", "GL8T", "GA7C"].map((iconKey) => [iconKey, { ...fr24IconStyle }])
  );

  const groups = [
    { iconKey: "GL7T", displayName: "四客舱旗舰公务机 / Bombardier Global 7500", category: "Business Jet", sizeClass: "ultra-long", count: 1, codes: "GL7T" },
    { iconKey: "GL8T", displayName: "四客舱旗舰公务机 / Bombardier Global 8000", category: "Business Jet", sizeClass: "ultra-long", count: 1, codes: "GL8T" },
    { iconKey: "GA7C", displayName: "四客舱旗舰公务机 / Gulfstream G700", category: "Business Jet", sizeClass: "ultra-long", count: 1, codes: "GA7C" },
    { iconKey: "LJ60", displayName: "公务机 / 私人喷气机", category: "Business Jet", sizeClass: "long-range", count: 74, codes: "ASTR BE40 C500 C501 C510 C525 C25A C25B C25C C25M C550 C551 C560 C56X C55B C650 C680 C68A C700 C750 CL30 CL35 CL60 GL5T GLEX LJ25 LJ31 LJ35 LJ36 LJ40 LJ45 LJ55 LJ60 LJ70 LJ75 LJ85 LRJ GLF2 GLF3 GLF4 GLF5 GLF6 G150 G200 G250 G280 GALX GA5C GA6C F2TH FA10 FA20 FA30 FA40 FA50 FA7X FA8X F900 E50P E55P E545 E550 EA50 H25B H25C HA4T PRM1 SBR1 SBR2 WW24 MU30 L29B E35L HDJT SF50" },
    { iconKey: "C206", displayName: "轻型单发螺旋桨", category: "Light Aircraft", sizeClass: "light", count: 66, codes: "C150 C152 C162 C170 C172 C175 C177 C180 C182 C185 C195 C205 C206 C207 C208 C210 C240 C337 SR20 SR22 S22T TBM7 TBM8 TBM9 TB20 TB21 PC12 PC6T P750 M20P M20T M600 PA24 PA28 PA32 PA38 PA46 P28A P28R P32R P32T P46T P210 DA40 DV20 DA20 G115 G58 AA5 BE33 BE35 BE36 RV6 RV7 RV8 RV9 RV10 RV12 KODI GA8 HUSK DHC2 AN2 T206 T210 EPIC" },
    { iconKey: "C303", displayName: "轻型双发", category: "Light Aircraft", sizeClass: "light", count: 50, codes: "AC50 AC80 AC90 AC95 AEST BE10 BE18 BE50 BE55 BE56 BE58 BE60 BE65 BE76 BE80 BE95 BE96 C303 C310 C320 C335 C340 C401 C402 C404 C414 C421 C21T D28T DA42 DA62 F406 MU2 P34A P68 P180 PA23 PA27 PA30 PA31 PA34 PA44 PA60 SW2 SW3 CL2T B58T GA7 BN2P BN2T" },
    { iconKey: "Q300", displayName: "双发涡桨 / 支线涡桨", category: "Turboprop", sizeClass: "midsize", count: 55, codes: "BE20 BE30 BE90 BE99 BE9L BE9T C425 C441 A400 A748 AN12 AN24 AN26 AT42 AT43 AT44 AT45 AT46 AT72 AT73 AT74 AT75 AT76 ATP B190 B350 C30J C130 C212 CN35 D228 D328 DC3 DC3T DC6 DHC6 DHC7 DH8A DH8B DH8C DH8D E110 E120 F50 JS31 JS32 JS41 L188 L410 SC7 SF34 SB20 SH33 SH36 SW4" },
    { iconKey: "ASW20", displayName: "滑翔机", category: "Glider", sizeClass: "light", count: 14, codes: "GLID GLIM G109 SF25 ASW20 ULAC VENT DISC DIMO PIK DG40 LS8 STD3 ARCE" },
    { iconKey: "A320", displayName: "空客 A320 系列", category: "Commercial Jet", sizeClass: "long-range", count: 4, codes: "A320 A321 A20N A21N" },
    { iconKey: "B738", displayName: "窄体客机（737 / E-Jet / A220）", category: "Commercial Jet", sizeClass: "long-range", count: 32, codes: "B733 B734 B735 B737 B738 B739 B37M B38M B39M B73H B732 A318 A319 A19N BCS1 BCS3 E170 E175 E75L E75S E190 E195 E275 E290 E295 S100 SU95 MRJ9 A148 A158 A178 BER2" },
    { iconKey: "B736", displayName: "波音 737-600 短机身", category: "Commercial Jet", sizeClass: "long-range", count: 1, codes: "B736" },
    { iconKey: "B757", displayName: "波音 757 / Tu-204", category: "Commercial Jet", sizeClass: "long-range", count: 4, codes: "B752 B753 T204 T214" },
    { iconKey: "FOKKER100", displayName: "尾吊发动机机", category: "Regional Jet", sizeClass: "midsize", count: 30, codes: "MD80 MD81 MD82 MD83 MD87 MD88 MD90 B712 B717 B721 B722 DC91 DC93 DC95 CRJ CRJ1 CRJ2 CRJ7 CRJ9 CRJX E135 E145 E45X F70 F100 IL62 T154 YK42 AJ27 R721" },
    { iconKey: "RJ85", displayName: "高翼四发支线 / 军用运输", category: "Regional Jet", sizeClass: "long-range", count: 10, codes: "B461 B462 B463 RJ1H RJ70 RJ85 RJ100 J328 C17 IL76" },
    { iconKey: "B767", displayName: "波音 767", category: "Widebody Jet", sizeClass: "ultra-long", count: 3, codes: "B762 B763 B764" },
    { iconKey: "A330", displayName: "宽体双发", category: "Widebody Jet", sizeClass: "ultra-long", count: 14, codes: "A300 A30B A306 A310 A330 A332 A333 A338 A339 A359 B787 B788 B789 B78X" },
    { iconKey: "B777", displayName: "波音 777 / A350-1000", category: "Widebody Jet", sizeClass: "ultra-long", count: 7, codes: "B772 B773 B77L B77W B778 B779 A35K" },
    { iconKey: "MD11", displayName: "三发宽体", category: "Widebody Jet", sizeClass: "ultra-long", count: 2, codes: "DC10 MD11" },
    { iconKey: "A343", displayName: "空客 A340 / 老式四发", category: "Widebody Jet", sizeClass: "ultra-long", count: 14, codes: "A340 A342 A343 B703 DC86 DC87 E6 IL76 IL86 IL96 C135 E3CF R135 K35R" },
    { iconKey: "A346", displayName: "空客 A340-600", category: "Widebody Jet", sizeClass: "ultra-long", count: 2, codes: "A345 A346" },
    { iconKey: "B747", displayName: "波音 747", category: "Widebody Jet", sizeClass: "ultra-long", count: 9, codes: "A124 B741 B742 B743 B744 B747 B74S B748 BLCF" },
    { iconKey: "A380", displayName: "空客 A380", category: "Widebody Jet", sizeClass: "ultra-long", count: 3, codes: "A380 A388 A389" },
    { iconKey: "A225", displayName: "Antonov An-225", category: "Special", sizeClass: "ultra-long", count: 1, codes: "A225" },
    { iconKey: "A3ST", displayName: "Airbus Beluga", category: "Special", sizeClass: "ultra-long", count: 1, codes: "A3ST" },
    { iconKey: "EC", displayName: "直升机", category: "Helicopter", sizeClass: "light", count: 46, codes: "R22 R44 R66 A109 A119 A139 A169 A189 AS50 AS55 AS65 AS32 B06 B06T B212 B407 B412 B429 EC20 EC25 EC30 EC35 EC45 EC55 EC75 H160 H500 H60 H64 H47 H53 MI8 MI26 KA32 KA50 KA52 LYNX NH90 PUMA S61 S76 S92 UH1 V22 GAZL BK17" },
    { iconKey: "BALL", displayName: "气球", category: "Balloon", sizeClass: "light", count: 2, codes: "BALL LOON" },
    { iconKey: "DRON", displayName: "无人机", category: "Drone", sizeClass: "light", count: 1, codes: "DRON" },
    { iconKey: "FGTR", displayName: "战斗机", category: "Military", sizeClass: "midsize", count: 15, codes: "F16 F15 F18 F22 F35 EUFI TYPH RFAL GRIP A10 SU27 SU57 MIG29 J10 J20" },
    { iconKey: "GRND", displayName: "地面车辆", category: "Ground", sizeClass: "light", count: 1, codes: "GRND" },
    { iconKey: "SI2", displayName: "太阳能飞机", category: "Special", sizeClass: "ultra-long", count: 1, codes: "SOL2" },
    { iconKey: "CONC", displayName: "Concorde", category: "Special", sizeClass: "long-range", count: 1, codes: "CONC" },
    { iconKey: "SAT", displayName: "卫星", category: "Spacecraft", sizeClass: "light", count: 1, codes: "SAT" },
    { iconKey: "ISS", displayName: "国际空间站", category: "Spacecraft", sizeClass: "ultra-long", count: 1, codes: "ISS" }
  ];
  const iconImagePaths = Object.fromEntries(
    groups.map((group) => [group.iconKey, `${iconAssetBasePath}/${group.iconKey}.png`])
  );

  const modelOverrides = {
    GLF6: { manufacturer: "Gulfstream", modelNames: ["Gulfstream G650ER"], sizeClass: "ultra-long" },
    GL7T: { manufacturer: "Bombardier", modelNames: ["Bombardier Global 7500"], sizeClass: "ultra-long" },
    GL8T: { manufacturer: "Bombardier", modelNames: ["Bombardier Global 8000"], sizeClass: "ultra-long" },
    GA7C: { manufacturer: "Gulfstream", modelNames: ["Gulfstream G700"], sizeClass: "ultra-long" },
    FA8X: { manufacturer: "Dassault", modelNames: ["Dassault Falcon 8X"], sizeClass: "long-range" },
    C700: { manufacturer: "Cessna", modelNames: ["Cessna Citation Longitude"], sizeClass: "midsize" },
    GLF5: { manufacturer: "Gulfstream", modelNames: ["Gulfstream G550"], sizeClass: "long-range" },
    GLEX: { manufacturer: "Bombardier", modelNames: ["Bombardier Global 6000"], sizeClass: "long-range" },
    E550: { manufacturer: "Embraer", modelNames: ["Embraer Praetor 600"], sizeClass: "super-midsize" },
    PC24: { manufacturer: "Pilatus", modelNames: ["Pilatus PC-24"], sizeClass: "light" },
    CL35: { manufacturer: "Bombardier", modelNames: ["Bombardier Challenger 350"], sizeClass: "super-midsize" },
    FA7X: { manufacturer: "Dassault", modelNames: ["Dassault Falcon 7X"], sizeClass: "long-range" },
    GA5C: { manufacturer: "Gulfstream", modelNames: ["Gulfstream G500"], sizeClass: "long-range" },
    A388: { manufacturer: "Airbus", modelNames: ["Airbus A380-800"] },
    B744: { manufacturer: "Boeing", modelNames: ["Boeing 747-400"] },
    B77W: { manufacturer: "Boeing", modelNames: ["Boeing 777-300ER"] },
    B738: { manufacturer: "Boeing", modelNames: ["Boeing 737-800"] },
    A20N: { manufacturer: "Airbus", modelNames: ["Airbus A320neo"] },
    E190: { manufacturer: "Embraer", modelNames: ["Embraer E190"] },
    AT76: { manufacturer: "ATR", modelNames: ["ATR 72-600"] },
    C172: { manufacturer: "Cessna", modelNames: ["Cessna 172"] },
    EC35: { manufacturer: "Airbus Helicopters", modelNames: ["Airbus H135"] },
    C310: { manufacturer: "Cessna", modelNames: ["Cessna 310"] },
    ASW20: { manufacturer: "Schleicher", modelNames: ["Schleicher ASW 20"] },
    B736: { manufacturer: "Boeing", modelNames: ["Boeing 737-600"] },
    B752: { manufacturer: "Boeing", modelNames: ["Boeing 757-200"] },
    F100: { manufacturer: "Fokker", modelNames: ["Fokker 100"] },
    B463: { manufacturer: "BAe", modelNames: ["BAe 146-300"] },
    B763: { manufacturer: "Boeing", modelNames: ["Boeing 767-300"] },
    A333: { manufacturer: "Airbus", modelNames: ["Airbus A330-300"] },
    MD11: { manufacturer: "McDonnell Douglas", modelNames: ["McDonnell Douglas MD-11"] },
    A343: { manufacturer: "Airbus", modelNames: ["Airbus A340-300"] },
    A346: { manufacturer: "Airbus", modelNames: ["Airbus A340-600"] },
    A225: { manufacturer: "Antonov", modelNames: ["Antonov An-225"] },
    A3ST: { manufacturer: "Airbus", modelNames: ["Airbus Beluga"] },
    BALL: { manufacturer: "Multiple", modelNames: ["Hot Air Balloon"] },
    DRON: { manufacturer: "Multiple", modelNames: ["Survey Drone"] },
    F16: { manufacturer: "Lockheed Martin", modelNames: ["F-16 Fighting Falcon"] },
    GRND: { manufacturer: "Airport", modelNames: ["Airport Ground Vehicle"] },
    SOL2: { manufacturer: "Solar Impulse", modelNames: ["Solar Impulse 2"] },
    CONC: { manufacturer: "Aerospatiale/BAC", modelNames: ["Concorde"] },
    SAT: { manufacturer: "Spacecraft", modelNames: ["Satellite"] },
    ISS: { manufacturer: "Spacecraft", modelNames: ["International Space Station"] }
  };

  function codeList(value) {
    return value.trim().split(/\s+/).filter(Boolean);
  }

  const typeCodeIconMap = {};
  const typeMappings = [];
  const conflicts = [];

  groups.forEach((group) => {
    codeList(group.codes).forEach((code) => {
      if (typeCodeIconMap[code]) {
        conflicts.push({ aircraftTypeCode: code, keptIconKey: typeCodeIconMap[code], duplicateIconKey: group.iconKey });
        return;
      }
      const meta = modelOverrides[code] || {};
      typeCodeIconMap[code] = group.iconKey;
      typeMappings.push({
        aircraftTypeCode: code,
        manufacturer: meta.manufacturer || "Multiple",
        modelNames: meta.modelNames || [`${code} (${group.displayName})`],
        aircraftCategory: group.category,
        sizeClass: meta.sizeClass || group.sizeClass,
        fr24IconKey: group.iconKey,
        iconKey: group.iconKey,
        colorOverride: "",
        status: "Active",
        effectiveFrom: "",
        effectiveTo: "",
        notes: `Source: 航空器地图图标 · 机型代码对照规范 / ${group.iconKey}`,
        updatedAt: sourceDate,
        updatedBy: "Template shadow FR24 yellow asset set"
      });
    });
  });

  const compatibilityMappings = [
    {
      aircraftTypeCode: "GL7T",
      manufacturer: "Bombardier",
      modelNames: ["Bombardier Global 7500"],
      aircraftCategory: "Business Jet",
      sizeClass: "ultra-long",
      fr24IconKey: defaultIconKey,
      iconKey: defaultIconKey,
      colorOverride: "",
      status: "Active",
      effectiveFrom: "",
      effectiveTo: "",
      notes: "Compatibility: existing sample business jet code, rendered by the source rule that all business jets use LJ60.",
      updatedAt: sourceDate,
      updatedBy: "Template shadow FR24 yellow asset set"
    }
  ];

  compatibilityMappings.forEach((item) => {
    if (typeCodeIconMap[item.aircraftTypeCode]) {
      return;
    }
    typeCodeIconMap[item.aircraftTypeCode] = item.fr24IconKey;
    typeMappings.push(item);
  });

  const iconAssets = groups.map((group) => ({
    iconKey: group.iconKey,
    displayName: group.displayName,
    category: group.category,
    sourceMode: "template-shadow-fr24yellow-png-1024",
    assetPath: iconImagePaths[group.iconKey],
    imagePath: iconImagePaths[group.iconKey],
    viewBox: "0 0 64 64",
    defaultFill: iconStyles[group.iconKey].fill,
    defaultStroke: iconStyles[group.iconKey].stroke,
    defaultSizeClass: group.sizeClass,
    status: "Active",
    licenseRef: "user-provided-reference-template-shadow-fr24yellow",
    checksum: `fr24-template-shadow-fr24yellow-1024-${group.iconKey}-20260803`,
    updatedAt: sourceDate,
    updatedBy: "Template shadow FR24 yellow asset set"
  }));

  const sampleTypeCatalog = Object.fromEntries(
    Object.entries({
      "Gulfstream G650ER": "GLF6",
      "Bombardier Global 7500": "GL7T",
      "Bombardier Global 8000": "GL8T",
      "Gulfstream G700": "GA7C",
      "Dassault Falcon 8X": "FA8X",
      "Cessna Citation Longitude": "C700",
      "Gulfstream G550": "GLF5",
      "Bombardier Global 6000": "GLEX",
      "Embraer Praetor 600": "E550",
      "Pilatus PC-24": "PC24",
      "Bombardier Challenger 350": "CL35",
      "Dassault Falcon 7X": "FA7X",
      "Gulfstream G500": "GA5C",
      "Airbus A380-800": "A388",
      "Boeing 747-400": "B744",
      "Boeing 777-300ER": "B77W",
      "Boeing 737-800": "B738",
      "Airbus A320neo": "A20N",
      "Embraer E190": "E190",
      "ATR 72-600": "AT76",
      "Cessna 172": "C172",
      "Airbus H135": "EC35",
      "Cessna 310": "C310",
      "Schleicher ASW 20": "ASW20",
      "Boeing 737-600": "B736",
      "Boeing 757-200": "B752",
      "Fokker 100": "F100",
      "BAe 146-300": "B463",
      "Boeing 767-300": "B763",
      "Airbus A330-300": "A333",
      "McDonnell Douglas MD-11": "MD11",
      "Airbus A340-300": "A343",
      "Airbus A340-600": "A346",
      "Antonov An-225": "A225",
      "Airbus Beluga": "A3ST",
      "Hot Air Balloon": "BALL",
      "Survey Drone": "DRON",
      "F-16 Fighting Falcon": "F16",
      "Airport Ground Vehicle": "GRND",
      "Solar Impulse 2": "SOL2",
      "Concorde": "CONC",
      "Satellite": "SAT",
      "International Space Station": "ISS"
    }).map(([model, code]) => {
      const mapping = typeMappings.find((item) => item.aircraftTypeCode === code);
      const meta = modelOverrides[code] || {};
      return [model, {
        manufacturer: meta.manufacturer || mapping?.manufacturer || "Multiple",
        aircraftTypeCode: code,
        sizeClass: meta.sizeClass || mapping?.sizeClass || "long-range",
        fr24IconKey: mapping?.fr24IconKey || typeCodeIconMap[code] || defaultIconKey
      }];
    })
  );

  const demoAircraftSamples = [
    { id: "SPC201", callsign: "C310LAB", registration: "N310TW", model: "Cessna 310", category: "light", family: "C310", operator: "Icon Lab", from: "KTEB", to: "KVNY", altitude: 9200, speed: 182, verticalSpeed: 0, squawk: "7201", progress: 0.21, status: "Cruise", source: "Icon sample", depart: "08:10", arrive: "14:20", route: [[40.8501, -74.0608], [39.2, -96.0], [34.2098, -118.489]] },
    { id: "SPC202", callsign: "ASW20", registration: "D-GLID", model: "Schleicher ASW 20", category: "light", family: "ASW20", operator: "Icon Lab", from: "LSGG", to: "LSGG", altitude: 6400, speed: 72, verticalSpeed: 120, squawk: "7202", progress: 0.66, status: "Soaring", source: "Icon sample", depart: "11:00", arrive: "13:00", route: [[46.2381, 6.109], [46.8, 7.6], [46.1, 8.1], [46.2381, 6.109]] },
    { id: "SPC203", callsign: "B736LAB", registration: "D-AB36", model: "Boeing 737-600", category: "long-range", family: "B736", operator: "Icon Lab", from: "EGGW", to: "LFPB", altitude: 31000, speed: 420, verticalSpeed: 0, squawk: "7203", progress: 0.48, status: "Cruise", source: "Icon sample", depart: "10:35", arrive: "11:45", route: [[51.8747, -0.3683], [50.6, 1.4], [48.9694, 2.4414]] },
    { id: "SPC204", callsign: "B752LAB", registration: "N752VX", model: "Boeing 757-200", category: "long-range", family: "B752", operator: "Icon Lab", from: "KTEB", to: "EGGW", altitude: 35000, speed: 456, verticalSpeed: 0, squawk: "7204", progress: 0.39, status: "Cruise", source: "Icon sample", depart: "07:20", arrive: "18:10", route: [[40.8501, -74.0608], [48.2, -36.5], [51.8747, -0.3683]] },
    { id: "SPC205", callsign: "F100LAB", registration: "PH-F100", model: "Fokker 100", category: "midsize", family: "F100", operator: "Icon Lab", from: "LFPB", to: "LSGG", altitude: 28000, speed: 382, verticalSpeed: -200, squawk: "7205", progress: 0.57, status: "Descent", source: "Icon sample", depart: "12:10", arrive: "13:00", route: [[48.9694, 2.4414], [47.8, 4.4], [46.2381, 6.109]] },
    { id: "SPC206", callsign: "B463LAB", registration: "G-BAE3", model: "BAe 146-300", category: "long-range", family: "B463", operator: "Icon Lab", from: "EGGW", to: "LSGG", altitude: 27000, speed: 352, verticalSpeed: 0, squawk: "7206", progress: 0.33, status: "Cruise", source: "Icon sample", depart: "15:05", arrive: "17:05", route: [[51.8747, -0.3683], [49.2, 2.8], [46.2381, 6.109]] },
    { id: "SPC207", callsign: "B763LAB", registration: "N763GX", model: "Boeing 767-300", category: "ultra-long", family: "B763", operator: "Icon Lab", from: "KTEB", to: "SBGR", altitude: 38000, speed: 468, verticalSpeed: 0, squawk: "7207", progress: 0.52, status: "Cruise", source: "Icon sample", depart: "01:10", arrive: "11:35", route: [[40.8501, -74.0608], [10.0, -65.0], [-23.4356, -46.4731]] },
    { id: "SPC208", callsign: "A333LAB", registration: "B-A333", model: "Airbus A330-300", category: "ultra-long", family: "A333", operator: "Icon Lab", from: "OMDB", to: "WSSS", altitude: 40000, speed: 482, verticalSpeed: 0, squawk: "7208", progress: 0.41, status: "Cruise", source: "Icon sample", depart: "08:45", arrive: "15:20", route: [[25.2532, 55.3657], [12.8, 82.2], [1.3644, 103.9915]] },
    { id: "SPC209", callsign: "MD11LAB", registration: "N111MD", model: "McDonnell Douglas MD-11", category: "ultra-long", family: "MD11", operator: "Icon Lab", from: "SBGR", to: "EGGW", altitude: 37000, speed: 474, verticalSpeed: 0, squawk: "7209", progress: 0.29, status: "Cruise", source: "Icon sample", depart: "02:25", arrive: "15:40", route: [[-23.4356, -46.4731], [9.5, -30.0], [51.8747, -0.3683]] },
    { id: "SPC210", callsign: "A343LAB", registration: "F-A343", model: "Airbus A340-300", category: "ultra-long", family: "A343", operator: "Icon Lab", from: "LFPB", to: "RJTT", altitude: 39000, speed: 472, verticalSpeed: 0, squawk: "7210", progress: 0.37, status: "Cruise", source: "Icon sample", depart: "09:50", arrive: "05:40", route: [[48.9694, 2.4414], [56.0, 72.0], [35.5494, 139.7798]] },
    { id: "SPC211", callsign: "A346LAB", registration: "D-A346", model: "Airbus A340-600", category: "ultra-long", family: "A346", operator: "Icon Lab", from: "FACT", to: "EGGW", altitude: 41000, speed: 480, verticalSpeed: 0, squawk: "7211", progress: 0.43, status: "Cruise", source: "Icon sample", depart: "19:10", arrive: "07:10", route: [[-33.9715, 18.6021], [-6.0, 10.5], [51.8747, -0.3683]] },
    { id: "SPC212", callsign: "AN225", registration: "UR-82060", model: "Antonov An-225", category: "ultra-long", family: "A225", operator: "Icon Lab", from: "EGGW", to: "OMDB", altitude: 33000, speed: 430, verticalSpeed: 0, squawk: "7212", progress: 0.62, status: "Cruise", source: "Icon sample", depart: "04:35", arrive: "14:55", route: [[51.8747, -0.3683], [42.5, 30.0], [25.2532, 55.3657]] },
    { id: "SPC213", callsign: "BELUGA", registration: "F-GSTB", model: "Airbus Beluga", category: "ultra-long", family: "A3ST", operator: "Icon Lab", from: "LFPB", to: "EGGW", altitude: 24000, speed: 360, verticalSpeed: 0, squawk: "7213", progress: 0.51, status: "Cruise", source: "Icon sample", depart: "09:35", arrive: "10:45", route: [[48.9694, 2.4414], [50.4, 1.0], [51.8747, -0.3683]] },
    { id: "SPC214", callsign: "BALLOON", registration: "N-BALL", model: "Hot Air Balloon", category: "light", family: "BALL", operator: "Icon Lab", from: "KVNY", to: "KVNY", altitude: 1800, speed: 12, verticalSpeed: 50, squawk: "7214", progress: 0.15, status: "Drift", source: "Icon sample", depart: "06:30", arrive: "08:30", route: [[34.2098, -118.489], [34.6, -118.1], [34.8, -117.7], [34.2098, -118.489]] },
    { id: "SPC215", callsign: "DRON01", registration: "UAS-01", model: "Survey Drone", category: "light", family: "DRON", operator: "Icon Lab", from: "YSSY", to: "YSSY", altitude: 900, speed: 38, verticalSpeed: 0, squawk: "7215", progress: 0.72, status: "Survey", source: "Icon sample", depart: "14:10", arrive: "15:20", route: [[-33.9399, 151.1753], [-34.2, 151.6], [-33.7, 151.8], [-33.9399, 151.1753]] },
    { id: "SPC216", callsign: "F16LAB", registration: "AF-016", model: "F-16 Fighting Falcon", category: "midsize", family: "F16", operator: "Icon Lab", from: "KTEB", to: "KTEB", altitude: 28000, speed: 520, verticalSpeed: 0, squawk: "7216", progress: 0.79, status: "Training", source: "Icon sample", depart: "13:00", arrive: "14:00", route: [[40.8501, -74.0608], [42.5, -72.0], [40.5, -70.0], [40.8501, -74.0608]] },
    { id: "SPC217", callsign: "GRND01", registration: "OPS-01", model: "Airport Ground Vehicle", category: "light", family: "GRND", operator: "Icon Lab", from: "OMDB", to: "OMDB", altitude: 0, speed: 18, verticalSpeed: 0, squawk: "7217", progress: 0.24, status: "Ground", source: "Icon sample", depart: "00:00", arrive: "00:30", route: [[25.2532, 55.3657], [25.28, 55.39], [25.24, 55.42], [25.2532, 55.3657]] },
    { id: "SPC218", callsign: "SOLAR2", registration: "HB-SIB", model: "Solar Impulse 2", category: "ultra-long", family: "SOL2", operator: "Icon Lab", from: "VHHH", to: "WSSS", altitude: 22000, speed: 45, verticalSpeed: 0, squawk: "7218", progress: 0.44, status: "Cruise", source: "Icon sample", depart: "06:00", arrive: "18:00", route: [[22.308, 113.9185], [12.0, 109.0], [1.3644, 103.9915]] },
    { id: "SPC219", callsign: "CONC01", registration: "G-BOAC", model: "Concorde", category: "long-range", family: "CONC", operator: "Icon Lab", from: "EGGW", to: "KTEB", altitude: 56000, speed: 1160, verticalSpeed: 0, squawk: "7219", progress: 0.46, status: "Supersonic", source: "Icon sample", depart: "09:00", arrive: "08:40", route: [[51.8747, -0.3683], [52.5, -32.0], [40.8501, -74.0608]] },
    { id: "SPC220", callsign: "SAT01", registration: "SAT-01", model: "Satellite", category: "light", family: "SAT", operator: "Icon Lab", from: "RJTT", to: "RJTT", altitude: 120000, speed: 16500, verticalSpeed: 0, squawk: "7220", progress: 0.11, status: "Orbit", source: "Icon sample", depart: "00:00", arrive: "00:10", route: [[35.5494, 139.7798], [20.0, 160.0], [0.0, 178.0], [35.5494, 139.7798]] },
    { id: "SPC221", callsign: "ISS", registration: "ISS", model: "International Space Station", category: "ultra-long", family: "ISS", operator: "Icon Lab", from: "WSSS", to: "WSSS", altitude: 1312000, speed: 15000, verticalSpeed: 0, squawk: "7221", progress: 0.88, status: "Orbit", source: "Icon sample", depart: "00:00", arrive: "00:09", route: [[1.3644, 103.9915], [18.0, 138.0], [42.0, 166.0], [1.3644, 103.9915]] }
  ];

  const root = typeof window !== "undefined" ? window : globalThis;
  root.AIRCRAFT_ICON_CONFIG = {
    schemaVersion: "1.7.0",
    sourceVersion: "aircraft-icons-template-shadow-fr24yellow-20260803-gl7t-ultralong",
    publishedVersion: "icon-map-1.8-gl7t-ultralong",
    sourceTitle: "航空器地图图标 · 机型代码对照规范",
    sourceUrl: "https://claude.ai/code/artifact/6971bd08-1eac-4ffc-beb6-e16e3ca9dab1",
    sourceDate,
    iconAssetSet,
    iconAssetBasePath,
    defaultIconKey,
    sizeClasses,
    categoryOptions,
    iconPaths,
    iconImagePaths,
    iconStyles,
    groups,
    iconAssets,
    typeMappings,
    typeCodeIconMap,
    sampleTypeCatalog,
    demoAircraftSamples,
    compatibilityMappings,
    conflicts,
    conflictResolutionNotes: [
      "IL76 appears under RJ85 and A343 in the source document. The active mapping keeps IL76 -> RJ85 because the source also labels RJ85 as high-wing quad / military transport."
    ]
  };
})();
