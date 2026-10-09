import { inject, provide, type InjectionKey } from 'vue';
import type { MenuStudioState } from './useMenuStudio';

const KEY: InjectionKey<MenuStudioState> = Symbol('menu-studio');

export function provideMenuStudio(state: MenuStudioState) {
  provide(KEY, state);
}

export function useStudio(): MenuStudioState {
  const state = inject(KEY);
  if (!state) throw new Error('Menu Studio components must be used inside MenuStudioEditor');
  return state;
}

export type StudioVendor = { id: number; name: string; displayName: string };
