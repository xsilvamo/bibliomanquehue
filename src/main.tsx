import React,{Component,type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {App} from './App';
import './styles.css';
class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){if(this.state.failed)return <main className="container page narrow"><h1>Hagamos una pausa</h1><p>No pudimos abrir esta página. Inténtalo nuevamente.</p><button className="button" onClick={()=>location.reload()}>Volver a cargar</button></main>;return this.props.children;}}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><BrowserRouter><App/></BrowserRouter></ErrorBoundary>);
