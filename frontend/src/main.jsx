// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./index.css";
import App from "./App.jsx";
// import { DataProvider } from "./DataContext.jsx";

const TOOLPAD_MODE_KEY = "toolpad-mode";
const TOOLPAD_COLOR_SCHEME_KEY = "toolpad-color-scheme";
const TOOLPAD_COLOR_SCHEME_ATTRIBUTE = "data-toolpad-color-scheme";

if (!localStorage.getItem(TOOLPAD_MODE_KEY)) {
  localStorage.setItem(TOOLPAD_MODE_KEY, "dark");
}

if (!localStorage.getItem(TOOLPAD_COLOR_SCHEME_KEY)) {
  localStorage.setItem(TOOLPAD_COLOR_SCHEME_KEY, "dark");
}

if (!document.documentElement.getAttribute(TOOLPAD_COLOR_SCHEME_ATTRIBUTE)) {
  document.documentElement.setAttribute(TOOLPAD_COLOR_SCHEME_ATTRIBUTE, "dark");
}

createRoot(document.getElementById("root")).render(
  // <StrictMode>
  // <DataProvider>
  <App />
  // </DataProvider>
  // </StrictMode>
);
