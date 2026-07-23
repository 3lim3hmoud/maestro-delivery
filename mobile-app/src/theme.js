export const colors = {
  bg: "#0B0B10",
  bgElevated: "#131319",
  surface: "#1A1A22",
  surfaceAlt: "#20202A",
  line: "#2A2A35",
  lineSoft: "#22222C",

  // Primary brand gradient — warm amber to deep orange (premium delivery-app feel)
  primaryStart: "#FFB800",
  primaryEnd: "#FF7A18",
  primary: "#FFB800",

  white: "#FFFFFF",
  textSoft: "#9494A3",
  textFaint: "#5E5E6E",

  success: "#2ECC71",
  successBg: "rgba(46,204,113,0.12)",
  danger: "#FF4D6A",
  dangerBg: "rgba(255,77,106,0.12)",
  info: "#4DA6FF",
  infoBg: "rgba(77,166,255,0.12)",
};

export const gradients = {
  primary: [colors.primaryStart, colors.primaryEnd],
  dark: ["#1A1A22", "#0B0B10"],
  overlay: ["rgba(11,11,16,0)", "rgba(11,11,16,0.95)"],
};

export const radius = { xs: 8, sm: 12, md: 18, lg: 26, xl: 32, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const typography = {
  h1: { fontSize: 26, fontWeight: "800" },
  h2: { fontSize: 20, fontWeight: "800" },
  h3: { fontSize: 17, fontWeight: "700" },
  body: { fontSize: 15, fontWeight: "500" },
  caption: { fontSize: 12.5, fontWeight: "500" },
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  glow: {
    shadowColor: "#FFB800",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
};
