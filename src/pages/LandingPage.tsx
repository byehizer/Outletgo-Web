import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Download,
  Mail,
  MapPin,
  Menu,
  Smartphone,
  Store,
  TrendingDown,
  X,
  Clock,
  ShoppingBag,
  Truck,
  Sparkle,
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { ROUTES, SUPPORT_EMAIL } from '../lib/constants';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/cn';
import { SellerRequestModal } from '../features/landing/SellerRequestModal';
import { smoothScrollIntoView } from '../lib/formScroll';

// Preguntas frecuentes mock
const FAQ_ITEMS = [
  {
    question: '¿Qué es OutletGo?',
    answer:
      'OutletGo es el primer outlet de moda digital y colaborativo de Argentina. Conectamos a las principales marcas y locales de indumentaria y calzado con compradores que buscan prendas discontinuas, saldos de stock y colecciones pasadas a precios de liquidación (con hasta un 70% de descuento real).',
  },
  {
    question: '¿Cómo funciona el Carrito Multitienda?',
    answer:
      'Podés navegar por prendas de diferentes locales (de Flores, Avellaneda, Palermo, etc.), agregarlas a un mismo carrito y pagar todo junto en una sola transacción segura con Mercado Pago. Nosotros nos encargamos de coordinar la logística para que no tengas que pagar envíos individuales por cada tienda.',
  },
  {
    question: '¿Cómo recibo mis prendas?',
    answer:
      'Ofrecemos dos métodos de entrega: 1) Envío a domicilio rápido en toda la Ciudad de Buenos Aires (CABA) y GBA por motomensajería o correo. 2) Retiro Consolidado: unificamos todas tus compras de diferentes tiendas y las retirás juntas en el punto físico oficial de tu elección con un solo código QR y sin costo de envío.',
  },
  {
    question: 'Soy una marca o local, ¿cómo empiezo a vender?',
    answer:
      'Para mantener un catálogo de calidad y marcas originales, el proceso de registro de tiendas es coordinado internamente. Simplemente completás el formulario de solicitud de registro en esta página web y nuestro equipo comercial creará tu cuenta en minutos para que empieces a publicar tu stock sobrante.',
  },
];

// Puntos de retiro consolidados para la sección
const PICKUP_POINTS = [
  {
    name: 'Punto Palermo Soho',
    address: 'Thames 1800',
    neighborhood: 'Palermo',
    city: 'CABA',
    hours: 'Lunes a Sábado de 10:00 a 20:00hs',
  },
  {
    name: 'Punto Avellaneda Centro',
    address: 'Av. Mitre 1234',
    neighborhood: 'Avellaneda',
    city: 'Gran Buenos Aires',
    hours: 'Lunes a Viernes de 9:00 a 19:30hs',
  },
  {
    name: 'Punto Flores',
    address: 'Av. Rivadavia 6500',
    neighborhood: 'Flores',
    city: 'CABA',
    hours: 'Lunes a Viernes de 9:00 a 19:00hs · Sábado de 9:00 a 13:00hs',
  },
  {
    name: 'Punto Villa Crespo',
    address: 'Av. Corrientes 5200',
    neighborhood: 'Villa Crespo',
    city: 'CABA',
    hours: 'Lunes a Sábado de 10:00 a 19:00hs',
  },
];

export function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const { warning } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [sellerModalOpen, setSellerModalOpen] = useState(false);

  // Helper de smooth scroll
  const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const target = document.getElementById(sectionId);
    if (target) {
      // 'start' para posicionar al principio de la vista
      smoothScrollIntoView(target, 'start');
    }
  };

  // Estados del simulador del teléfono
  const [simulatorStep, setSimulatorStep] = useState<0 | 1 | 2>(0);
  const [simulatorDeliveryType, setSimulatorDeliveryType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const autoCycleRef = useRef<any>(null);

  // Parallax 3D effect para el teléfono
  const phoneRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  // Auto-ciclar pasos del simulador
  useEffect(() => {
    autoCycleRef.current = setInterval(() => {
      setSimulatorStep((prev) => {
        const next = ((prev + 1) % 3) as 0 | 1 | 2;
        // En el paso 2 (checkout), alternamos el tipo de envío en la simulación visual
        if (next === 1) {
          setSimulatorDeliveryType((d) => (d === 'DELIVERY' ? 'PICKUP' : 'DELIVERY'));
        }
        return next;
      });
    }, 5000);

    return () => {
      if (autoCycleRef.current) clearInterval(autoCycleRef.current);
    };
  }, []);

  const handleStepSelect = (step: 0 | 1 | 2) => {
    setSimulatorStep(step);
    if (autoCycleRef.current) clearInterval(autoCycleRef.current);
    autoCycleRef.current = setInterval(() => {
      setSimulatorStep((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
    }, 6000);
  };

  // Parallax handlers
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!phoneRef.current) return;
    const rect = phoneRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rY = (x / (rect.width / 2)) * 8;
    const rX = -(y / (rect.height / 2)) * 8;

    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const handleAppStoreClick = (storeName: string) => {
    warning(`¡Próximamente! La app móvil de OutletGo para compradores estará disponible en ${storeName} muy pronto.`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased overflow-x-hidden selection:bg-[#2B8FD4] selection:text-white">
      {/* Luces de fondo (soft glows) */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#2B8FD4]/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-[#2B8FD4]/3 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-md transition-all">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* LOGOTIPO OFICIAL WHITE MODE */}
            <img src="/Logotipewhitemode.png" alt="OutletGo Logo" className="h-10 w-auto object-contain" />
          </div>

          {/* Menú Escritorio */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#compradores" onClick={(e) => handleScrollToSection(e, 'compradores')} className="hover:text-[#2B8FD4] transition">Compradores</a>
            <a href="#puntos-retiro" onClick={(e) => handleScrollToSection(e, 'puntos-retiro')} className="hover:text-[#2B8FD4] transition">Puntos de Retiro</a>
            <a href="#tiendas" onClick={(e) => handleScrollToSection(e, 'tiendas')} className="hover:text-[#2B8FD4] transition">Vender en OutletGo</a>
            <a href="#faq" onClick={(e) => handleScrollToSection(e, 'faq')} className="hover:text-[#2B8FD4] transition">FAQ</a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-[#2B8FD4] transition flex items-center gap-1.5">
              <Mail className="size-4" /> Soporte
            </a>
          </div>

          {/* CTA Nav */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated && user ? (
              <Link
                to={user.role === 'ADMIN' ? ROUTES.adminRoot : ROUTES.sellerRoot}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#2B8FD4] px-4 text-xs font-bold text-white hover:bg-[#2B8FD4]/90 transition shadow-sm"
              >
                Ir al Panel de Tiendas
              </Link>
            ) : (
              <Link
                to={ROUTES.login}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
              >
                Ingreso Comercios
              </Link>
            )}
          </div>

          {/* Hamburguesa Móvil */}
          <button
            type="button"
            className="md:hidden p-1 text-slate-500 hover:text-slate-800"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="size-6" />
          </button>
        </div>
      </nav>

      {/* MENÚ MÓVIL OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#F8FAFC] p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <img src="/Logotipewhitemode.png" alt="OutletGo Logo" className="h-10 w-auto object-contain" />
              <button
                type="button"
                className="p-1 text-slate-500 hover:text-slate-800"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                <X className="size-6" />
              </button>
            </div>
            <div className="flex flex-col gap-5 text-lg font-bold text-slate-700 pt-8">
              <a href="#compradores" onClick={(e) => { setMobileMenuOpen(false); handleScrollToSection(e, 'compradores'); }} className="hover:text-[#2B8FD4]">Compradores</a>
              <a href="#puntos-retiro" onClick={(e) => { setMobileMenuOpen(false); handleScrollToSection(e, 'puntos-retiro'); }} className="hover:text-[#2B8FD4]">Puntos de Retiro</a>
              <a href="#tiendas" onClick={(e) => { setMobileMenuOpen(false); handleScrollToSection(e, 'tiendas'); }} className="hover:text-[#2B8FD4]">Vender en OutletGo</a>
              <a href="#faq" onClick={(e) => { setMobileMenuOpen(false); handleScrollToSection(e, 'faq'); }} className="hover:text-[#2B8FD4]">FAQ</a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-[#2B8FD4] flex items-center gap-2">
                <Mail className="size-5" /> Soporte
              </a>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-200 space-y-3">
            {isAuthenticated && user ? (
              <Link
                to={user.role === 'ADMIN' ? ROUTES.adminRoot : ROUTES.sellerRoot}
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full h-12 items-center justify-center rounded-xl bg-[#2B8FD4] text-xs font-bold text-white shadow-md"
              >
                Ir al Panel de Tiendas
              </Link>
            ) : (
              <Link
                to={ROUTES.login}
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full h-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm"
              >
                Ingreso Comercios
              </Link>
            )}
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-24 md:pt-24 md:pb-32 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2B8FD4]/20 bg-[#2B8FD4]/5 px-3.5 py-1 text-xs font-semibold text-[#2B8FD4]">
            <Sparkle className="size-3.5" /> Outlet de Moda & Indumentaria Local
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
            El stock de tus marcas,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FD4] via-[#1A3F7A] to-slate-950 drop-shadow-sm">
              a precios de liquidación.
            </span>
          </h1>
          <p className="max-w-xl mx-auto md:mx-0 text-base sm:text-lg text-slate-600 leading-relaxed">
            Comprá excedentes, discontinuos y calzado directo de fábrica <strong>desde una sola unidad</strong>. Olvidate del caos de las filas y la inseguridad de las bolsas en la calle: disfrutá de un <strong>único carrito de compras multitienda</strong> con envío express en el día o retiro unificado gratis.
          </p>

          {/* Badges de Descarga */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
            <div className="relative group">
              <a
                href="#download-section"
                onClick={(e) => handleScrollToSection(e, 'download-section')}
                className="inline-flex h-12 items-center gap-3 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800 transition shadow-lg shadow-slate-900/10 group"
              >
                <Smartphone className="size-5 text-[#2B8FD4]" />
                <div className="text-left leading-tight">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Descargar la App</p>
                  <p className="text-xs font-black">Comprar en el Outlet</p>
                </div>
                <ArrowRight className="size-4 ml-1 opacity-60 group-hover:translate-x-1 transition-transform" />
              </a>
              <span className="absolute -top-3.5 -right-3 bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full animate-bounce shadow-md tracking-wider">
                ¡Envío Gratis!
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSellerModalOpen(true)}
              className="inline-flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 text-slate-800 hover:bg-slate-50 transition shadow-sm"
            >
              <Store className="size-5 text-[#2B8FD4]" />
              <div className="text-left leading-tight">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Para Locales y Marcas</p>
                <p className="text-xs font-bold">Sumá tu Stock</p>
              </div>
            </button>
          </div>
        </div>

        {/* Simulador de Smartphone (Derecha) */}
        <div className="flex-1 flex flex-col items-center justify-center pt-8 md:pt-0">
          {/* Teléfono Parallax */}
          <div
            ref={phoneRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
            className="relative w-72 h-[560px] rounded-[38px] border-[10px] border-slate-900 bg-[#F8FAFC] shadow-2xl outline-none overflow-hidden flex flex-col"
          >
            {/* Isla Dinámica / Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4.5 rounded-full bg-slate-900 flex items-center justify-center z-30">
              <span className="w-2.5 h-1.5 rounded-full bg-blue-900/30" />
            </div>

            {/* Pantalla del Celular */}
            <div className="flex-1 flex flex-col justify-between pt-9 select-none text-[11px] bg-[#F8FAFC] text-[#0F172A] relative">
              
              {/* Header de la App Virtual */}
              <header className="flex items-center justify-between px-3 py-2 border-b border-slate-200/60 bg-white shadow-sm shrink-0">
                <div className="flex items-center gap-1.5">
                  <img src="/Isotipewhitemode.png" alt="OG" className="w-5 h-5 object-contain" />
                  <span className="font-bold text-[#0F172A] tracking-tight text-[10px]">OutletGo</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-[#1A3F7A]">
                  <MapPin className="size-3 text-[#2B8FD4]" /> Buenos Aires
                </div>
              </header>

              {/* Pantalla 1: Catálogo y Ofertas */}
              {simulatorStep === 0 && (
                <div className="flex-1 p-3.5 flex flex-col justify-start gap-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-[10px] text-slate-800 uppercase tracking-wider">👗 Liquidación de Temporada</p>
                    <span className="text-[8px] font-bold text-white bg-danger px-1.5 py-0.5 rounded-full">Hasta -70%</span>
                  </div>
                  
                  {/* Card 1 */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 flex gap-3 items-center shadow-sm">
                    {/* SVG Ilustración Remera */}
                    <div className="size-11 rounded-lg bg-[#E8F4FD] flex items-center justify-center shrink-0">
                      <svg className="w-7 h-7 text-[#2B8FD4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.38 3.46L16 2.14a1 1 0 0 0-1 .12L12 5 9 2.26a1 1 0 0 0-1-.12L3.62 3.46a1 1 0 0 0-.62.92v3.13a1 1 0 0 0 .38.78L7 11v10.13a1 1 0 0 0 1 .87h8a1 1 0 0 0 1-.87V11l3.62-2.71A1 1 0 0 0 21 7.51V4.38a1 1 0 0 0-.62-.92z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#0F172A] truncate text-[10px]">Remera Oversize Algodón</p>
                      <p className="text-[8px] text-[#2B8FD4] font-semibold truncate">Moda Flores Local</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[#0F172A] font-black">$12.500</span>
                        <span className="line-through text-slate-400 text-[9px]">$35.000</span>
                        <span className="text-danger font-extrabold text-[8px]">-65%</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 flex gap-3 items-center shadow-sm">
                    {/* SVG Ilustración Zapatillas */}
                    <div className="size-11 rounded-lg bg-[#E8F4FD] flex items-center justify-center shrink-0">
                      <svg className="w-7 h-7 text-[#2B8FD4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 16v-2.5C4 11 6 9 8.5 9h5.8c1 0 1.9.5 2.4 1.3l2.8 4.2c.3.5.5 1.1.5 1.7v1.3H4v-1.5z" />
                        <path d="M4 18h16" />
                        <path d="M12 9V5.5A1.5 1.5 0 0 0 10.5 4h0A1.5 1.5 0 0 0 9 5.5V9" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#0F172A] truncate text-[10px]">Zapatillas Urban Canvas</p>
                      <p className="text-[8px] text-[#2B8FD4] font-semibold truncate">Calzados Avellaneda</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[#0F172A] font-black">$24.000</span>
                        <span className="line-through text-slate-400 text-[9px]">$80.000</span>
                        <span className="text-danger font-extrabold text-[8px]">-70%</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[8px] text-slate-400 font-bold text-center mt-auto">Paso 1: Agregás prendas de múltiples tiendas</p>
                </div>
              )}

              {/* Pantalla 2: Checkout Consolidado (Multitienda + Envío CABA) */}
              {simulatorStep === 1 && (
                <div className="flex-1 p-3.5 flex flex-col justify-start gap-3 animate-fadeIn">
                  <p className="font-extrabold text-[10px] text-slate-800 uppercase tracking-wider">🛍️ Carrito Multitienda</p>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between bg-white border border-slate-200/60 p-2 rounded-lg shadow-sm">
                      <div>
                        <p className="font-bold text-slate-800 text-[9.5px]">Remera Oversize</p>
                        <p className="text-[7.5px] text-slate-400">Flores Local</p>
                      </div>
                      <span className="font-bold text-slate-800">$12.500</span>
                    </div>

                    <div className="flex items-center justify-between bg-white border border-slate-200/60 p-2 rounded-lg shadow-sm">
                      <div>
                        <p className="font-bold text-slate-800 text-[9.5px]">Zapatillas Urban</p>
                        <p className="text-[7.5px] text-slate-400">Calzados Avellaneda</p>
                      </div>
                      <span className="font-bold text-slate-800">$24.000</span>
                    </div>
                  </div>

                  {/* Detalle de envío/pago simulado */}
                  <div className="mt-auto space-y-1.5 bg-[#E8F4FD] rounded-xl p-2.5 border border-[#2B8FD4]/10 text-[8.5px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal de Prendas (2 locales):</span>
                      <span className="font-bold text-slate-800">$36.500</span>
                    </div>
                    {simulatorDeliveryType === 'DELIVERY' ? (
                      <>
                        <div className="flex justify-between text-slate-500 items-center">
                          <span className="flex items-center gap-0.5"><Truck className="size-2.5 text-[#2B8FD4]" /> Envío Rápido CABA:</span>
                          <span className="font-bold text-slate-800">$1.800</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Tarifa de Servicio Única:</span>
                          <span className="font-bold text-slate-800">$150</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black text-[#1A3F7A] border-t border-[#2B8FD4]/20 pt-1">
                          <span>Total a Pagar (1 Pago):</span>
                          <span>$38.450</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-slate-500 items-center">
                          <span className="flex items-center gap-0.5"><MapPin className="size-2.5 text-[#2B8FD4]" /> Retiro Consolidado:</span>
                          <span className="text-success font-bold">¡GRATIS!</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Tarifa de Servicio Única:</span>
                          <span className="font-bold text-slate-800">$150</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black text-[#1A3F7A] border-t border-[#2B8FD4]/20 pt-1">
                          <span>Total a Pagar (1 Pago):</span>
                          <span>$36.650</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Selector rápido simulado */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSimulatorDeliveryType('DELIVERY')}
                      className={cn(
                        'flex-1 text-[7.5px] py-1 border rounded-md font-bold transition-all',
                        simulatorDeliveryType === 'DELIVERY' ? 'bg-[#2B8FD4] text-white border-[#2B8FD4]' : 'bg-white text-slate-600 border-slate-200'
                      )}
                    >
                      Envío CABA
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatorDeliveryType('PICKUP')}
                      className={cn(
                        'flex-1 text-[7.5px] py-1 border rounded-md font-bold transition-all',
                        simulatorDeliveryType === 'PICKUP' ? 'bg-[#2B8FD4] text-white border-[#2B8FD4]' : 'bg-white text-slate-600 border-slate-200'
                      )}
                    >
                      Retiro Gratis
                    </button>
                  </div>
                </div>
              )}

              {/* Pantalla 3: Cupón QR y Entrega */}
              {simulatorStep === 2 && (
                <div className="flex-1 p-3.5 flex flex-col justify-center items-center gap-2 text-center animate-fadeIn">
                  <div className="size-9 rounded-full bg-success/15 text-success flex items-center justify-center shadow-sm">
                    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  {simulatorDeliveryType === 'DELIVERY' ? (
                    <>
                      <p className="font-extrabold text-[#0F172A] text-[11px]">¡En camino a tu casa!</p>
                      <p className="text-[8px] text-slate-500 leading-normal px-2">
                        Tus prendas fueron recolectadas de ambos locales y unificadas en un único envío para vos.
                      </p>
                      <div className="mt-3 p-3 bg-white border border-slate-200/60 rounded-xl shadow-sm text-[9px] w-full text-left space-y-1">
                        <p className="font-bold text-[#0F172A]">Destino de entrega:</p>
                        <p className="text-slate-500">Av. Corrientes 1234, CABA</p>
                        <p className="text-[#2B8FD4] font-bold mt-1">Repartidor asignado en camino 🛵</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-extrabold text-[#0F172A] text-[11px]">¡Listo para Retirar!</p>
                      <p className="text-[8px] text-slate-500 leading-normal px-2">
                        Unificamos tus compras. Presentá este código QR único en el punto de retiro.
                      </p>
                      {/* QR Box */}
                      <div className="p-2 bg-white rounded-xl shadow-md border border-slate-200/50">
                        <div className="size-20 bg-slate-900 flex flex-wrap gap-1 p-1 rounded-lg">
                          {Array.from({ length: 36 }, (_, i) => (
                            <div
                              key={i}
                              className={cn(
                                'size-2.5 rounded-sm',
                                (i % 3 === 0 || i % 4 === 0 || i < 8 || i > 28) ? 'bg-slate-950' : 'bg-white'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[8.5px] text-[#1A3F7A] font-bold bg-[#E8F4FD] px-2.5 py-1 rounded-full border border-[#2B8FD4]/10">
                        <MapPin className="size-3 text-[#2B8FD4] shrink-0" /> Punto Thames (Palermo)
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Barra de Navegación del Simulador */}
              <div className="border-t border-slate-200 bg-white py-2 px-1.5 grid grid-cols-3 text-center text-[8.5px] text-slate-400 font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => handleStepSelect(0)}
                  className={cn('transition hover:text-slate-700', simulatorStep === 0 && 'text-[#2B8FD4]')}
                >
                  1. Catálogo
                </button>
                <button
                  type="button"
                  onClick={() => handleStepSelect(1)}
                  className={cn('transition hover:text-slate-700', simulatorStep === 1 && 'text-[#2B8FD4]')}
                >
                  2. Checkout
                </button>
                <button
                  type="button"
                  onClick={() => handleStepSelect(2)}
                  className={cn('transition hover:text-slate-700', simulatorStep === 2 && 'text-[#2B8FD4]')}
                >
                  3. Entrega
                </button>
              </div>
            </div>
          </div>

          {/* Controlador Visual de Pasos */}
          <div className="flex gap-2 mt-5">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleStepSelect(idx as 0 | 1 | 2)}
                className={cn(
                  'size-2.5 rounded-full transition-all duration-300',
                  simulatorStep === idx ? 'bg-[#2B8FD4] w-6' : 'bg-slate-300'
                )}
                aria-label={`Paso ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* COMPRADORES SECTION */}
      <section id="compradores" className="mx-auto max-w-7xl px-6 py-24 border-t border-slate-200/50 space-y-16">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="font-display text-3xl font-extrabold text-slate-900">Tu experiencia de compra en outlets, renovada.</h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Comprar indumentaria discontinuada o liquidaciones de stock de múltiples locales de Buenos Aires ahora es simple, cómodo y sustentable.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 */}
          <div className="rounded-2xl border border-slate-100 bg-white p-8 space-y-4 hover:border-[#2B8FD4]/30 hover:shadow-md transition-all duration-300">
            <div className="size-12 rounded-xl bg-[#2B8FD4]/10 text-[#2B8FD4] flex items-center justify-center">
              <ShoppingBag className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Búsqueda Inteligente y Carrito Único</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Buscá prendas por fotos o filtrá simultáneamente por talle, color y precio entre cientos de marcas. Agregá un jean de Flores y un buzo de Avellaneda en un único carrito y pagá una sola transacción consolidada.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-slate-100 bg-white p-8 space-y-4 hover:border-[#2B8FD4]/30 hover:shadow-md transition-all duration-300">
            <div className="size-12 rounded-xl bg-[#2B8FD4]/10 text-[#2B8FD4] flex items-center justify-center">
              <Truck className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Logística Express Unificada</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Nuestra red logística express tercerizada pasa a buscar tus compras por cada local de Flores/Avellaneda, las unifica en nuestro centro logístico y te las entrega en el día con seguimiento online en tiempo real.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-slate-100 bg-white p-8 space-y-4 hover:border-[#2B8FD4]/30 hover:shadow-md transition-all duration-300">
            <div className="size-12 rounded-xl bg-[#2B8FD4]/10 text-[#2B8FD4] flex items-center justify-center">
              <TrendingDown className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Validación Social Visual</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Decile adiós a las fotos falsas. Nuestro sistema in-app exige a las compradoras subir fotos reales y transparentes de las prendas adquiridas para calificar la calidad y el calce del talle real.
            </p>
          </div>
        </div>
      </section>

      {/* SECCIÓN NUEVA: PROBADOR COMUNITARIO (RESEÑAS B2C CON FOTOS REALES) */}
      <section id="probador-social" className="mx-auto max-w-7xl px-6 py-20 border-t border-slate-200/50 space-y-12 animate-in fade-in duration-300">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-600">
            <Sparkle className="size-3.5" /> Probador Comunitario
          </div>
          <h2 className="font-display text-3xl font-extrabold text-slate-900">
            La comunidad valida la calidad y el talle real
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Decile adiós a la incertidumbre. En OutletGo, las compradoras suben fotos reales de las prendas recibidas y evalúan las medidas reales para que compres con total confianza.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Card Reseña 1 */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
            <div className="space-y-4">
              <div className="aspect-[4/3] w-full rounded-xl bg-slate-100 overflow-hidden relative">
                <img 
                  src="https://picsum.photos/seed/review1/400/300" 
                  alt="Remera Oversize Real" 
                  className="w-full h-full object-cover" 
                />
                <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Foto Real de Usuaria
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-md">
                  Talle: Fiel a la Tabla
                </span>
                <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-md">
                  Tela: Algodón Grueso
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-md">
                  ✓ Compra Verificada
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-slate-950">Sofía M.</span>
                  <span className="text-[10px] text-slate-400 font-medium">@sofi_lavorano</span>
                </div>
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="size-3.5 fill-current" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic pt-1">
                  "Mido 1.65m y pedí talle M. Queda perfecto oversize, no se deforma al lavar y las costuras están impecables. ¡Volveré a comprar seguro!"
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Remera Oversize Algodón</span>
              <span className="font-bold text-[#2B8FD4]">Moda Flores Local</span>
            </div>
          </div>

          {/* Card Reseña 2 */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
            <div className="space-y-4">
              <div className="aspect-[4/3] w-full rounded-xl bg-slate-100 overflow-hidden relative">
                <img 
                  src="https://picsum.photos/seed/review2/400/300" 
                  alt="Zapatillas Real" 
                  className="w-full h-full object-cover" 
                />
                <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Foto Real de Usuaria
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-md">
                  Talle: Pedir un número más
                </span>
                <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-md">
                  Suela: Goma Antideslizante
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-md">
                  ✓ Compra Verificada
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-slate-950">Micaela G.</span>
                  <span className="text-[10px] text-slate-400 font-medium">@mica.gomez</span>
                </div>
                <div className="flex text-amber-400">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <svg key={i} className="size-3.5 fill-current" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <svg className="size-3.5 text-slate-200 fill-current" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic pt-1">
                  "Las zapatillas son súper livianas y la suela es de goma real. Calzo 38 pero pedí 39 y me anduvieron bárbaro, sigan el consejo de pedir un número más."
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Zapatillas Urban Canvas</span>
              <span className="font-bold text-[#2B8FD4]">Calzados Avellaneda</span>
            </div>
          </div>

          {/* Card Reseña 3 */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
            <div className="space-y-4">
              <div className="aspect-[4/3] w-full rounded-xl bg-slate-100 overflow-hidden relative">
                <img 
                  src="https://picsum.photos/seed/review3/400/300" 
                  alt="Buzo Real" 
                  className="w-full h-full object-cover" 
                />
                <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Foto Real de Usuaria
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-md">
                  Talle: Exacto
                </span>
                <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-md">
                  Tela: Frisa muy abrigada
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-md">
                  ✓ Compra Verificada
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-slate-950">Camila R.</span>
                  <span className="text-[10px] text-slate-400 font-medium">@cami_rodriguez</span>
                </div>
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="size-3.5 fill-current" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic pt-1">
                  "Buscaba un buzo abrigado y este es de frisa pesada premium. Súper suave por dentro y el color gris es idéntico a la foto de catálogo. ¡Me encantó!"
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Buzo Frisa Premium</span>
              <span className="font-bold text-[#2B8FD4]">Moda Flores Local</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN NUEVA: NUESTROS PUNTOS DE RETIRO */}
      <section id="puntos-retiro" className="mx-auto max-w-7xl px-6 py-20 border-t border-slate-200/50 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="font-display text-3xl font-extrabold text-slate-900">Puntos de Retiro Oficiales</h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Consolidamos tus prendas de múltiples tiendas para que las retires juntas con un solo QR y costo de envío cero.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PICKUP_POINTS.map((point) => (
            <div
              key={point.name}
              className="rounded-2xl border border-slate-100 bg-white p-6 flex flex-col justify-between hover:border-[#2B8FD4]/40 hover:shadow-md transition-all duration-300"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[#2B8FD4]">
                  <MapPin className="size-5 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">{point.name}</h3>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-700 font-medium">{point.address}</p>
                  <p className="text-xs text-slate-500">
                    {point.neighborhood} · {point.city}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
                <Clock className="size-3.5 text-[#2B8FD4] mt-0.5 shrink-0" />
                <p className="leading-relaxed">{point.hours}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TIENDAS / B2B SECTION */}
      <section id="tiendas" className="mx-auto max-w-7xl px-6 py-20 border-t border-slate-200/50">
        <div className="rounded-3xl border border-slate-200/50 bg-[#0D1F3C] p-8 md:p-16 flex flex-col lg:flex-row items-center gap-12 relative overflow-hidden text-[#E2E8F0]">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#2B8FD4]/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#2B8FD4]/20 border border-[#2B8FD4]/30 px-3.5 py-1 text-xs font-semibold text-[#5AAEE0]">
              <Store className="size-3.5" /> Canal de Liquidación de Stock Textil
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white leading-tight">
              Liquidá tu sobrestock sin canibalizar tu local y liberá tu WhatsApp.
            </h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              ¿Cansado de responder 100 mensajes repetitivos por día consultando talles y stock? OutletGo le brinda a tu local la herramienta digital llave en mano para vender tu excedente de prendas y calzado de forma autónoma. Tus clientes minoristas compran sin fricciones y vos ordenás tu mostrador sin cambiar tu método tradicional de cobro.
            </p>

            {/* Video Tutorial B2B */}
            <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#2B8FD4] animate-pulse" />
                VIDEO DEMO: CÓMO FUNCIONA EL CATÁLOGO ESPEJO EN 30 SEGUNDOS
              </p>
              <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-950 relative border border-white/15">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  title="Demo OutletGo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="size-5 rounded-full bg-[#2B8FD4]/20 text-[#5AAEE0] flex items-center justify-center mt-0.5 text-xs font-bold">
                  ✓
                </div>
                <p className="text-sm text-slate-300"><span className="font-semibold text-white">Modelo por Comisión:</span> Cero costo fijo o mensual. Solo cobramos un 5% de comisión sobre ventas completadas (sin riesgo financiero inicial).</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="size-5 rounded-full bg-[#2B8FD4]/20 text-[#5AAEE0] flex items-center justify-center mt-0.5 text-xs font-bold">
                  ✓
                </div>
                <p className="text-sm text-slate-300"><span className="font-semibold text-white">Logística de Recolección Integrada:</span> Preparás el pedido en tu local comercial y nuestro transportista asociado pasa a retirarlo de forma inmediata.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="size-5 rounded-full bg-[#2B8FD4]/20 text-[#5AAEE0] flex items-center justify-center mt-0.5 text-xs font-bold">
                  ✓
                </div>
                <p className="text-sm text-slate-300"><span className="font-semibold text-white">Control de Catálogo Espejo:</span> Panel administrativo completo para gestionar talles, colores y cantidades en stock de forma ultra-simple.</p>
              </div>
            </div>
          </div>

          {/* Tarjeta de Contacto */}
          <div className="w-full lg:w-96 rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col justify-between text-center relative overflow-hidden backdrop-blur-sm">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">¿Querés vender en OutletGo?</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Coordinamos el ingreso de marcas de forma personalizada para garantizar la calidad del catálogo. Completá tu solicitud de alta en minutos.
              </p>
            </div>
            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={() => setSellerModalOpen(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2B8FD4] text-sm font-bold text-white hover:bg-[#2B8FD4]/90 transition shadow-lg shadow-[#2B8FD4]/20"
              >
                <Store className="size-4" /> Solicitar Alta de Comercio
              </button>
              <p className="text-[10px] text-slate-400">
                Contacto comercial: <span className="font-mono text-slate-300">{SUPPORT_EMAIL}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN NUEVA: PUENTE AL BLOG CORPORATIVO B2C */}
      <section id="blog" className="mx-auto max-w-7xl px-6 py-20 border-t border-slate-200/50 space-y-12 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-600">
              <Sparkle className="size-3.5" /> Blog Oficial de OutletGo
            </div>
            <h2 className="font-display text-3xl font-extrabold text-slate-900">
              Inspiración, Tendencias y Consejos Textiles
            </h2>
            <p className="text-slate-600 text-sm">
              Descubrí cómo exprimir tu presupuesto, combinar tus prendas discontinuas de Avellaneda y comprar con inteligencia digital.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => warning("¡Próximamente! El Blog de tendencias unificado estará disponible en nuestro dominio principal muy pronto.")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shrink-0"
          >
            Ver todos los artículos
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Artículo 1 */}
          <article className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 hover:shadow-md hover:border-indigo-500/20 transition duration-300">
            <div className="space-y-4">
              <div className="aspect-[16/9] w-full rounded-xl bg-slate-100 overflow-hidden relative">
                <img 
                  src="https://picsum.photos/seed/blog1/400/225" 
                  alt="Avellaneda compras" 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                />
                <span className="absolute top-2 left-2 bg-[#2B8FD4] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Guías de Compra
                </span>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-semibold">12 de Abril, 2026 · Por Ehizer Valero</span>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-[#2B8FD4] transition leading-snug">
                  Cómo comprar en Avellaneda sin morir en el intento: La Guía Digital definitiva
                </h3>
                <p className="text-xs text-slate-500 line-clamp-3">
                  Olvidate de caminar bajo el sol arrastrando bolsas. Te explicamos cómo funciona el nuevo circuito consolidado y cómo comprar por unidad a precio directo de fábrica desde tu sillón.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-[#2B8FD4]">Leer artículo</span>
              <ArrowRight className="size-3.5 text-[#2B8FD4] group-hover:translate-x-1 transition-transform" />
            </div>
          </article>

          {/* Artículo 2 */}
          <article className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 hover:shadow-md hover:border-indigo-500/20 transition duration-300">
            <div className="space-y-4">
              <div className="aspect-[16/9] w-full rounded-xl bg-slate-100 overflow-hidden relative">
                <img 
                  src="https://picsum.photos/seed/blog2/400/225" 
                  alt="Tendencias Outfits" 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                />
                <span className="absolute top-2 left-2 bg-pink-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Tendencias
                </span>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-semibold">08 de Abril, 2026 · Por Adam Armoza</span>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-pink-500 transition leading-snug">
                  5 prendas discontinuas que son tendencia este invierno (y cómo conseguirlas a -60%)
                </h3>
                <p className="text-xs text-slate-500 line-clamp-3">
                  Recreamos los outfits virales de TikTok utilizando saldos de stock y colecciones pasadas de marcas nacionales. Moda circular, sustentable y accesible.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-pink-500">Leer artículo</span>
              <ArrowRight className="size-3.5 text-pink-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </article>

          {/* Artículo 3 */}
          <article className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 hover:shadow-md hover:border-indigo-500/20 transition duration-300">
            <div className="space-y-4">
              <div className="aspect-[16/9] w-full rounded-xl bg-slate-100 overflow-hidden relative">
                <img 
                  src="https://picsum.photos/seed/blog3/400/225" 
                  alt="Logística de locales" 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                />
                <span className="absolute top-2 left-2 bg-success text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Pymes Textiles
                </span>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-semibold">01 de Abril, 2026 · Por José Valero</span>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-success transition leading-snug">
                  El costo oculto de vender por WhatsApp: Por qué las Pymes se están mudando a OutletGo
                </h3>
                <p className="text-xs text-slate-500 line-clamp-3">
                  Un análisis del tiempo promedio perdido respondiendo mensajes repetitivos de talles y coordinando motofletes. La automatización es el salvavidas de los comercios familiares.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-success">Leer artículo</span>
              <ArrowRight className="size-3.5 text-success group-hover:translate-x-1 transition-transform" />
            </div>
          </article>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="mx-auto max-w-4xl px-6 py-20 border-t border-slate-200/50 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="font-display text-3xl font-extrabold text-slate-900">Preguntas Frecuentes</h2>
          <p className="text-slate-600 text-sm">Todo lo que necesitás saber sobre el funcionamiento del outlet digital.</p>
        </div>

        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} className="py-4">
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between py-2 text-left font-semibold text-slate-800 hover:text-[#2B8FD4] transition"
                >
                  <span>{item.question}</span>
                  {isOpen ? <ChevronUp className="size-4 text-[#2B8FD4]" /> : <ChevronDown className="size-4 text-slate-400" />}
                </button>
                <div
                  className={cn(
                    'grid transition-all duration-300 ease-in-out text-sm text-slate-600 leading-relaxed overflow-hidden',
                    isOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="pb-2">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* DOWNLOAD / CTA SECTION */}
      <section id="download-section" className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-3xl bg-[#2B8FD4] p-8 md:p-12 text-center space-y-6 relative overflow-hidden shadow-[0_10px_30px_rgba(43,143,212,0.2)]">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/5 rounded-full blur-[40px] pointer-events-none" />

          <h2 className="font-display text-3xl font-black text-white">Comenzá a ahorrar hoy mismo</h2>
          <p className="max-w-md mx-auto text-sm text-blue-50/80 leading-relaxed">
            Descargá la aplicación móvil de OutletGo en tu celular. Registrate gratis y accedé a las mejores liquidaciones locales de moda y calzado en Buenos Aires.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => handleAppStoreClick('App Store')}
              className="inline-flex h-12 items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-bold text-white hover:bg-white/20 transition"
            >
              <Download className="size-4" /> App Store
            </button>
            <button
              type="button"
              onClick={() => handleAppStoreClick('Google Play Store')}
              className="inline-flex h-12 items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-bold text-white hover:bg-white/20 transition"
            >
              <Download className="size-4" /> Google Play
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/Logotipeblackmode.png" alt="OutletGo Logo" className="h-9 w-auto object-contain" />
          </div>
          <p>© {new Date().getFullYear()} OutletGo. Todos los derechos reservados. Hecho en Argentina.</p>
          <div className="flex gap-4 text-slate-400">
            <a href="#compradores" className="hover:text-white transition">Términos</a>
            <a href="#compradores" className="hover:text-white transition">Privacidad</a>
          </div>
        </div>
      </footer>

      {/* MODAL DE SOLICITUD DE ALTA B2B */}
      <SellerRequestModal
        open={sellerModalOpen}
        onClose={() => setSellerModalOpen(false)}
      />
    </div>
  );
}
