/* Replaces every [data-include] element's content with the HTML file it points to (nested includes supported). */
export async function loadIncludes(root = document, fetchFn = (...a) => fetch(...a)) {
  let pending = [...root.querySelectorAll('[data-include]')];
  while (pending.length) {
    await Promise.all(pending.map(async (node) => {
      const url = node.dataset.include;
      const res = await fetchFn(url);
      if (!res.ok) throw new Error(`Cannot load ${url} (${res.status})`);
      node.removeAttribute('data-include');
      node.innerHTML = await res.text();
    }));
    pending = [...root.querySelectorAll('[data-include]')];
  }
}

export function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Cannot load ${src}`));
    document.head.append(script);
  });
}
