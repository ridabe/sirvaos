import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./design-system/tokens.css";
import "./styles.css";

// Global Tab navigation for textareas.
// Native <input> and <select> already support Tab by default.
// <textarea> inserts a tab character instead — this handler overrides that
// so Tab/Shift+Tab moves focus to the next/previous focusable form element,
// matching the expected behavior in every current and future form.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab" || !(e.target instanceof HTMLTextAreaElement)) return;

  const textarea = e.target;
  const form = textarea.closest("form");
  if (!form) return;

  e.preventDefault();

  const focusable = Array.from(
    form.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.closest("[disabled]"));

  const index = focusable.indexOf(textarea);
  if (index === -1) return;

  const next = focusable[e.shiftKey ? index - 1 : index + 1];
  if (next) next.focus();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
