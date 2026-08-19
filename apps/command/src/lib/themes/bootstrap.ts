import {
  APP_PALETTE_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  LEGACY_PALETTE_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
  THEME_ATTR_PALETTE,
  THEME_CLASS_DARK,
} from "./constants"
import { THEME_MODES, THEME_PALETTES } from "./types"

/**
 * Builds the ultra-defensive pre-paint inline script that executes before first paint.
 * It is completely self-contained, introduces zero globals, and guarantees
 * zero-FOUC by resolving dark mode, setting CSS color-scheme, and applying custom palettes
 * before any layout or render passes.
 */
export function generateThemeBootstrapScript(): string {
  const modesJson = JSON.stringify(THEME_MODES)
  const palettesJson = JSON.stringify(THEME_PALETTES)

  return (
    `(function(){` +
    `try{` +
    `var d=document.documentElement;` +
    `if(!d)return;` +
    `var modes=${modesJson};` +
    `var palettes=${palettesJson};` +
    `var s=null;` +
    `try{s=window.localStorage;}catch(_e){}` +
    `var rawTheme=null;` +
    `var rawPalette=null;` +
    `if(s){` +
    `try{` +
    `rawTheme=s.getItem(${JSON.stringify(APP_THEME_STORAGE_KEY)})||s.getItem(${JSON.stringify(LEGACY_THEME_STORAGE_KEY)});` +
    `rawPalette=s.getItem(${JSON.stringify(APP_PALETTE_STORAGE_KEY)})||s.getItem(${JSON.stringify(LEGACY_PALETTE_STORAGE_KEY)});` +
    `}catch(_e){}` +
    `}` +
    `var pref=(rawTheme&&modes.indexOf(rawTheme)!==-1)?rawTheme:"system";` +
    `var isDark=false;` +
    `if(pref==="dark"){isDark=true;}` +
    `else if(pref==="light"){isDark=false;}` +
    `else{` +
    `try{` +
    `if(typeof window.matchMedia==="function"){` +
    `var m=window.matchMedia("(prefers-color-scheme: dark)");` +
    `isDark=!!(m&&m.matches);` +
    `}` +
    `}catch(_e){}` +
    `}` +
    `if(d.classList&&typeof d.classList.toggle==="function"){` +
    `d.classList.toggle(${JSON.stringify(THEME_CLASS_DARK)},isDark);` +
    `}` +
    `if(d.style){` +
    `d.style.colorScheme=isDark?"dark":"light";` +
    `}` +
    `if(rawPalette&&palettes.indexOf(rawPalette)!==-1&&typeof d.setAttribute==="function"){` +
    `d.setAttribute(${JSON.stringify(THEME_ATTR_PALETTE)},rawPalette);` +
    `}` +
    `}catch(_e){}` +
    `})();`
  )
}

/**
 * Pre-compiled immutable inline script string ready for insertion into TanStack Start root shell.
 */
export const THEME_BOOTSTRAP_SCRIPT = generateThemeBootstrapScript()
