/**
 * Chrome / Google Translate wraps text nodes in <font> tags.
 * React then hits NotFoundError on removeChild/insertBefore during SPA
 * route updates (facebook/react#11538). Guard those DOM ops and remount
 * the route tree after translation so each page starts from clean HTML.
 */

export function patchGoogleTranslateDom(): void {
  if (typeof Node !== 'function' || !Node.prototype) return;

  const proto = Node.prototype;

  const originalRemoveChild = proto.removeChild;
  proto.removeChild = function removeChildPatched<T extends Node>(child: T): T {
    if (child.parentNode !== this) return child;
    try {
      return originalRemoveChild.call(this, child) as T;
    } catch {
      return child;
    }
  };

  const originalInsertBefore = proto.insertBefore;
  proto.insertBefore = function insertBeforePatched<T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    try {
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    } catch {
      return newNode;
    }
  };

  const originalReplaceChild = proto.replaceChild;
  proto.replaceChild = function replaceChildPatched<T extends Node>(
    newChild: Node,
    oldChild: T,
  ): T {
    if (oldChild.parentNode !== this) return oldChild;
    try {
      return originalReplaceChild.call(this, newChild, oldChild) as T;
    } catch {
      return oldChild;
    }
  };
}

export function isGoogleTranslatedHtml(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  const body = document.body;
  return (
    root.classList.contains('translated-ltr')
    || root.classList.contains('translated-rtl')
    || Boolean(body?.classList.contains('translated-ltr'))
    || Boolean(body?.classList.contains('translated-rtl'))
  );
}

export function observeGoogleTranslate(onChange: (translated: boolean) => void): () => void {
  if (typeof document === 'undefined') return () => {};

  const emit = () => onChange(isGoogleTranslatedHtml());
  emit();

  const observer = new MutationObserver(emit);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  if (document.body) {
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  return () => observer.disconnect();
}
