/**
 * Module: frontend/src/utils/lazyWithRetry.js
 *
 * Work / Purpose:
 *   Resilient wrapper for React.lazy that detects chunk load failures caused
 *   by new deployments (where chunk hashes on CDN change) and automatically
 *   forces a single page reload so the browser fetches the fresh index.html
 *   and current module chunks.
 */

import { lazy } from 'react';

export const isChunkLoadError = (error) => {
  if (!error) return false;
  const msg = error.message || error.toString() || '';
  return (
    error.name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Loading chunk/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
};

export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenRefreshed = window.sessionStorage.getItem('chunk_reload_done');

    try {
      const component = await componentImport();
      window.sessionStorage.removeItem('chunk_reload_done');
      return component;
    } catch (error) {
      if (isChunkLoadError(error) && !pageHasBeenRefreshed) {
        // Mark that we reloaded once to prevent infinite reload loops
        window.sessionStorage.setItem('chunk_reload_done', 'true');
        // Force reload the page to fetch the newest index.html and fresh chunk URLs
        window.location.reload();
        // Return dummy component while page is reloading
        return { default: () => null };
      }

      // If it still fails after reload or is not a chunk error, rethrow
      throw error;
    }
  });

export default lazyWithRetry;
