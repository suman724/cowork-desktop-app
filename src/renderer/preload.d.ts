import type { CoworkIPC } from '../main/preload';

declare global {
  interface Window {
    coworkIPC: CoworkIPC;
  }
}
