/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./features/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary — warm ember orange (Portl's signature accent)
        ember50: "#FFF4EC",
        ember100: "#FFE4D1",
        ember200: "#FFC7A3",
        ember300: "#FFA36B",
        ember400: "#FF8A47",
        ember500: "#FF7A30",
        ember600: "#F0611A",
        ember700: "#C74E13",
        ember800: "#9E3F14",
        ember900: "#7A3313",

        // Ink — warm near-black neutral for text
        ink50: "#F7F5F3",
        ink100: "#EDE9E5",
        ink200: "#D8D1C9",
        ink300: "#B4A99C",
        ink400: "#8A7D6E",
        ink500: "#655A4D",
        ink600: "#4A4038",
        ink700: "#362E27",
        ink800: "#251F1A",
        ink900: "#18140F",

        // Status
        moss50: "#EFF7EE",
        moss400: "#4FA35C",
        moss500: "#3B8A47",
        moss600: "#2F6E39",
        rust50: "#FDEEEC",
        rust400: "#E8604A",
        rust500: "#D6462D",
        rust600: "#B33823",
        gold50: "#FFF8E8",
        gold400: "#E8B33D",
        gold500: "#D19A22",
        teal50: "#EAF6F5",
        teal400: "#3F9C93",
        teal500: "#2E837A",

        cream: "#FFF8F1",
        paper: "#FFFFFF",
      },
      fontFamily: {
        display: ["SpaceGrotesk_700Bold"],
        "display-medium": ["SpaceGrotesk_500Medium"],
        body: ["Inter_400Regular"],
        "body-medium": ["Inter_500Medium"],
        "body-semibold": ["Inter_600SemiBold"],
        "body-bold": ["Inter_700Bold"],
      },
      borderRadius: {
        xl2: "20px",
        xl3: "28px",
      },
    },
  },
  plugins: [],
};
