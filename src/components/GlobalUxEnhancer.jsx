import { useEffect } from "react";

const SEARCH_HINT = /search|find|type .*name|name.*search|تلاش|نام لکھ/i;

const normalize = (value) => String(value || "").trim();

export default function GlobalUxEnhancer() {
  useEffect(() => {
    const lists = new Map();

    const enhance = (input, index) => {
      if (!(input instanceof HTMLInputElement)) return;
      if (input.dataset.noAutocomplete === "true") return;
      if (!["", "text", "search"].includes(input.type)) return;

      const hint = `${input.placeholder || ""} ${input.getAttribute("aria-label") || ""} ${input.name || ""}`;
      if (!SEARCH_HINT.test(hint)) return;

      const listId = input.dataset.globalDatalist || `global-search-suggestions-${index}`;
      let list = document.getElementById(listId);
      if (!list) {
        list = document.createElement("datalist");
        list.id = listId;
        document.body.appendChild(list);
      }
      input.dataset.globalDatalist = listId;
      input.setAttribute("list", listId);
      input.setAttribute("autocomplete", "off");
      lists.set(input, list);

      const refresh = () => {
        const term = normalize(input.value).toLowerCase();
        list.replaceChildren();

        const scope = input.closest("main") || input.closest("[class*='max-w']") || document;
        const values = new Set();
        scope.querySelectorAll("tbody td, option").forEach((node) => {
          const value = normalize(node.textContent);
          if (!value || value.length > 100 || /^[-₨\d.,%\s]+$/.test(value)) return;
          if (!term || value.toLowerCase().includes(term)) values.add(value);
        });

        // Empty search boxes should still expose the available list on focus.
        // Typing narrows that same list instead of forcing the user to know
        // the first letters in advance.
        [...values].slice(0, term ? 16 : 30).forEach((value) => {
          const option = document.createElement("option");
          option.value = value;
          list.appendChild(option);
        });
      };

      if (!input.dataset.globalAutocompleteBound) {
        input.addEventListener("input", refresh);
        input.addEventListener("focus", refresh);
        input.dataset.globalAutocompleteBound = "true";
      }
    };

    const scan = () => {
      document.querySelectorAll("input").forEach(enhance);
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      lists.forEach((list) => list.remove());
    };
  }, []);

  return null;
}
