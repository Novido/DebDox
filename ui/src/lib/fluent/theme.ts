import {
  webDarkTheme,
  webLightTheme,
  createDarkTheme,
  createLightTheme,
  type BrandVariants,
} from "@fluentui/react-components";

// DebDox brand palette — teal/cyan accent on dark backgrounds
const debdoxBrand: BrandVariants = {
  10: "#020c0e",
  20: "#051a1e",
  30: "#07262e",
  40: "#09333e",
  50: "#0b404f",
  60: "#0e5060",
  70: "#116172",
  80: "#147385",
  90: "#178598",
  100: "#1a97ab",
  110: "#29a6ba",
  120: "#45b5c6",
  130: "#62c4d2",
  140: "#80d3de",
  150: "#a0e2ea",
  160: "#c1f0f5",
};

export const debdoxDarkTheme = createDarkTheme(debdoxBrand);
export const debdoxLightTheme = createLightTheme(debdoxBrand);
