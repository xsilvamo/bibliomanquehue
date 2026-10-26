import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X, Heart, LogOut, ArrowRight } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend, contactEmail } from '../lib/backend';

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const { pathname, search, key } = useLocation();
  const { session, profile, member } = useStore();
  const dismiss = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(max-width: 1000px)');
    const update = () => {
      setMobile(media.matches);
      if (!media.matches) setOpen(false);
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setOpen(false);
    window.scrollTo?.(0, 0);
    document.getElementById('contenido')?.focus({ preventScroll: true });
  }, [pathname, search, key]);

  useEffect(() => {
    if (!open || !mobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    navRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
      }
      if (event.key !== 'Tab') return;
      const controls = [toggleRef.current, ...Array.from(navRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)') ?? [])].filter((el): el is HTMLElement => !!el);
      const index = controls.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        controls.at(-1)?.focus();
      } else if (!event.shiftKey && (index === controls.length - 1 || index < 0)) {
        event.preventDefault();
        controls[0]?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, mobile, dismiss]);

  return <>
    <a href="#contenido" className="skip-link">Ir al contenido</a>
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label="Manquehue, inicio"><img className="brand-logo" src="/images/logollama-sinfondo.png" alt="" width={44} height={44} decoding="async" /><span>manquehue<span className="brand-dot">.</span></span></Link>
        <button ref={toggleRef} className="menu-toggle" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        <nav ref={navRef} id="main-nav" aria-label="Principal" className={open ? 'nav open' : 'nav'} onClick={event => { if ((event.target as Element).closest('a')) setOpen(false); }}>
          <NavLink to="/biblioteca">Biblioteca</NavLink>
          <NavLink to="/reflexiones">Reflexiones</NavLink>
          <NavLink to="/lectores">Lectores</NavLink>
          <NavLink to="/sobre">Sobre Manquehue</NavLink>
          <NavLink className="nav-join" to={session ? '/mi-espacio' : '/entrar'}>{session ? (profile?.alias ?? 'Mi espacio') : 'Soy parte'}<ArrowUpRight size={17} /></NavLink>
          {member?.role === 'admin' && !member.suspended && <NavLink to="/admin">Administrar</NavLink>}
          {session && <button className="icon-button logout" aria-label="Cerrar sesión" onClick={() => void backend.signOut()}><LogOut size={18} /></button>}
        </nav>
      </div>
    </header>
    {mobile && open && <button className="menu-backdrop" aria-label="Cerrar menú de navegación" tabIndex={-1} onClick={dismiss} />}
    <main id="contenido" tabIndex={-1} aria-hidden={mobile && open ? true : undefined}>{children}</main>
    <footer className="site-footer" aria-hidden={mobile && open ? true : undefined}>
      <div className="container footer-top">
        <div><Link to="/" className="brand" aria-label="Manquehue, inicio"><img className="brand-logo" src="/images/logollama-sinfondo.png" alt="" width={44} height={44} decoding="async" />manquehue.</Link><p>Libros que nos acercan a Cristo.<br />Lecturas que nos acercan entre nosotros.</p></div>
        <div className="footer-links">
          <Link to="/biblioteca">Explorar el librero <ArrowUpRight size={15} /></Link>
          <Link to="/sobre">Jóvenes Manquehue <ArrowUpRight size={15} /></Link>
          <Link to="/convivencia">Convivencia y privacidad <ArrowUpRight size={15} /></Link>
          {contactEmail ? <a href={`mailto:${contactEmail}`}>Hablemos <ArrowUpRight size={15} /></a> : <Link to="/contacto">Contacto <ArrowUpRight size={15} /></Link>}
        </div>
        <Link to="/entrar" className="footer-invite">Tu próxima lectura<br />empieza con un encuentro.<ArrowRight size={24} /></Link>
      </div>
      <div className="container footer-bottom"><span>Una iniciativa de Jóvenes Manquehue</span><span>Hecho para compartir <Heart size={12} /></span></div>
    </footer>
  </>;
}
