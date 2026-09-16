import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  isGoogleTranslatedHtml,
  observeGoogleTranslate,
} from '../lib/google-translate-spa.ts';

/** Remounts the route tree on navigation only while Chrome Translate is on. */
export function TranslateSafeTree({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [translated, setTranslated] = useState(isGoogleTranslatedHtml);

  useEffect(() => observeGoogleTranslate(setTranslated), []);

  return <Fragment key={translated ? pathname : 'app'}>{children}</Fragment>;
}
