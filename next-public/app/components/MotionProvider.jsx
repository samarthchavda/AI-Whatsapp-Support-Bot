'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Site-wide scroll reveal.
 *  - [data-reveal="up|fade|scale|left|right|draw"] (or legacy .reveal-on-scroll)
 *    gets `.is-visible` once it enters the viewport.
 *  - Children of [data-stagger] get a --i index so CSS can delay them in sequence.
 * Works with content that renders later (e.g. pricing plans from the API).
 * Respects prefers-reduced-motion: everything is shown immediately.
 */
const SELECTOR = '[data-reveal], [data-stagger], .reveal-on-scroll';

export default function MotionProvider() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.classList.add('motion-ready');

    const indexStaggers = (scope) => {
      scope.querySelectorAll('[data-stagger]').forEach((group) => {
        Array.from(group.children).forEach((child, i) => child.style.setProperty('--i', i));
      });
    };

    if (reduce || !('IntersectionObserver' in window)) {
      const showAll = () => document.querySelectorAll(SELECTOR).forEach((el) => el.classList.add('is-visible'));
      showAll();
      const mo = new MutationObserver(showAll);
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    const watch = (scope) => {
      indexStaggers(scope);
      scope.querySelectorAll(SELECTOR).forEach((el) => {
        if (!el.classList.contains('is-visible') && !el.dataset.watched) {
          el.dataset.watched = '1';
          io.observe(el);
        }
      });
    };

    watch(document);

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes.length) { watch(document); break; }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);

  return null;
}
