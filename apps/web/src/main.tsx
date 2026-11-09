import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./style.css";

//find root element in html file
const element = document.getElementById("root");
if (!element) throw new Error("Missing React mount element #root");

//create the React root
createRoot(element).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
