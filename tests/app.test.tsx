// @vitest-environment jsdom
import React, { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../src/App';
let root: Root;
let host: HTMLDivElement;
(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(async () => { if(root) await act(async () => root.unmount()); host?.remove(); });
async function page(path = '/') { host=document.createElement('div'); document.body.append(host); root=createRoot(host); await act(async () => {root.render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);}); }
async function click(text: string) {const el=Array.from(host.querySelectorAll('a,button')).find(e=>e.textContent?.trim()===text);expect(el).toBeTruthy(); await act(async()=>{(el as HTMLElement).click()});}
describe('Public site with no invented inventory', () => {
  it('shows the real empty catalogue and navigates to the library', async () => {
    await page();
    expect(host.querySelector('h1')?.textContent).toMatch(/Una lectura/i);
    await click('Explorar la biblioteca');
    expect(host.querySelector('h1')?.textContent).toBe('Nuestra biblioteca');
    expect(host.textContent).toContain('El librero está por abrir');
    expect(host.querySelector('input[type="search"]')?.getAttribute('aria-label')).toBe('Buscar por título o autor');
  });
  it('explains public profiles before sign-in and does not simulate authentication', async () => {
    await page('/entrar');
    expect(host.textContent).toContain('Tu alias, descripción, reflexiones aprobadas y lista');
    const button=Array.from(host.querySelectorAll('button')).find(e=>e.textContent?.includes('Continuar con Google'));
    expect(button?.disabled).toBe(true);
  });
  it('protects administration routes', async () => {
    await page('/admin');
    expect(host.querySelector('h1')?.textContent).toBe('Entra a la comunidad');
  });
  it('handles unknown pages', async () => {
    await page('/pagina-inexistente');
    expect(host.querySelector('h1')?.textContent).toBe('Esta página se nos perdió');
  });
  it('opens mobile navigation and closes it after choosing a destination', async () => {
    await page();
    const toggle=host.querySelector<HTMLButtonElement>('button[aria-label="Abrir menú"]')!;
    await act(async()=>toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await click('Sobre Manquepe');
    expect(host.querySelector('h1')?.textContent).toMatch(/Un librero que sigue/);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
