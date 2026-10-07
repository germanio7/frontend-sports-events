import { useEffect, type ReactNode } from 'react';

const navItems = [
    { href: '/', label: 'Inicio' },
    { href: '/opcion-1', label: 'Opción 1' },
    { href: '/opcion-2', label: 'Opción 2' },
    { href: '/opcion-3', label: 'Opción 3' },
    { href: '/resultados', label: 'Resultados' },
];

export default function Layout({ children, title }: { children: ReactNode; title: string }) {
    useEffect(() => {
        document.title = title === 'Eventos Deportivos' ? title : `${title} // Eventos Deportivos`;
    }, [title]);
    const url = location.pathname;

    return (
        <div className="relative flex min-h-screen flex-col overflow-x-hidden">
            <nav className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(9,11,8,0.92)]">
                {/* ponytail: sin backdrop-blur — cuesta un composite por scroll en smart TV */}
                <div className="mx-auto flex h-[58px] max-w-[1080px] items-center justify-between gap-4 px-5 md:px-10">
                    <a href="/" className="flex shrink-0 items-center gap-3 font-bold tracking-[3px] text-[var(--fg-hi)]">
                        <span>
                            Eventos <b className="text-[var(--green)] drop-shadow-[0_0_12px_var(--green-glow)]">Deportivos</b>
                        </span>
                    </a>
                    {/* en celular no entran los 5 ítems: scroll horizontal en vez de cortarlos */}
                    <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
                        {navItems.map((item) => {
                            const active = url === item.href || (item.href !== '/' && url.startsWith(item.href));
                            return (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    className={
                                        'shrink-0 rounded px-3 py-2 text-[10px] font-bold tracking-[2px] whitespace-nowrap uppercase transition-colors ' +
                                        (active
                                            ? 'text-[var(--green)] [text-shadow:0_0_10px_var(--green-glow)]'
                                            : 'text-[var(--mute)] hover:text-[var(--green)]')
                                    }
                                >
                                    {item.label}
                                </a>
                            );
                        })}
                    </div>
                </div>
            </nav>

            <main className="relative z-10 mx-auto flex w-full max-w-[1080px] flex-1 flex-col px-5 py-12 md:px-10">
                {title !== 'Eventos Deportivos' && <h1 className="sr-only">{title}</h1>}
                {children}
            </main>

            <footer className="relative z-10 mt-auto border-t border-[var(--line)] bg-[var(--ink-2)] py-10">
                <div className="mx-auto flex max-w-[1080px] flex-col items-center gap-3 px-5 text-center text-[11px] tracking-[2px] text-[var(--mute-2)] md:px-10">
                    <div>
                        <span className="text-[var(--green)]">~</span> Eventos Deportivos // solo agregador
                    </div>
                    <div>Esta plataforma no aloja ni transmite ningún contenido.</div>
                </div>
            </footer>
        </div>
    );
}

export function Strip({ index, name, highlight }: { index: string; name: string; highlight?: string }) {
    return (
        <div className="strip">
            <span className="strip-idx">{index}</span>
            <span className="strip-name">
                {name}
                {highlight ? <em>.{highlight}</em> : null}
            </span>
            <span className="strip-rule" />
            <span className="strip-meter" aria-hidden>
                <i />
                <i />
                <i />
                <i />
                <i />
            </span>
        </div>
    );
}

export function Notice({ children }: { children: ReactNode }) {
    return (
        <div className="mt-6 border border-[var(--amber)]/30 bg-[var(--amber-dim)] px-4 py-3 text-[12.5px] leading-relaxed text-[var(--amber-hi)]">
            <span className="mr-2 font-bold tracking-[2px] text-[var(--amber)] uppercase">▸ aviso</span>
            {children}
        </div>
    );
}

export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                'rounded border px-3 py-1.5 text-[12px] font-bold tracking-[1px] uppercase transition-all ' +
                (active
                    ? 'border-[var(--green)] bg-[var(--green)]/15 text-[var(--green)] [text-shadow:0_0_8px_var(--green-glow)]'
                    : 'border-[var(--line-hi)] bg-[var(--panel)] text-[var(--mute)] hover:border-[var(--green)] hover:text-[var(--green)]')
            }
        >
            {children}
        </button>
    );
}
