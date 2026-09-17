import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

console.log("Main.tsx executing");
createRoot(document.getElementById("root")!).render(<App />);
