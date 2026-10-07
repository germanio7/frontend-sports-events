import { useEffect, useState } from 'react';

import Layout, { Notice, Strip } from '../layout';
import Player, { streamType, type Stream } from '../player';

type AgendaOption = { source: string; quality: string | null; url: string; embed: string };

type AgendaEvent = {
    league: string | null;
    home: string;
    away: string;
    time: string | null;
    channel: string | null;
    quality: string | null;
    options: AgendaOption[] | null;
    homeLogo?: string;
    awayLogo?: string;
};

// ponytail: heurística para una agenda que cruza medianoche (22:10, 23:30, 00:15 sin fecha):
// 00:00–05:59 cuenta como "día siguiente". Sin hora van al final.
const EARLY_HOUR_CUTOFF = 6;

export const timeToSortKey = (time: string | null): number => {
    const match = time ? /^(\d{1,2}):(\d{2})$/.exec(time) : null;
    if (!match) return Number.MAX_SAFE_INTEGER;
    const hours = Number(match[1]);
    return (hours < EARLY_HOUR_CUTOFF ? 24 * 60 : 0) + hours * 60 + Number(match[2]);
};

export default function Agenda({ n, endpoint, source }: { n: string; endpoint: string; source: string }) {
    const [events, setEvents] = useState<AgendaEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stream, setStream] = useState<Stream | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        fetch(endpoint, { signal: controller.signal })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then((data: { events: AgendaEvent[] }) => setEvents(data.events ?? []))
            .catch((err) => err.name !== 'AbortError' && setError('no se pudo obtener la agenda'))
            .finally(() => setLoading(false));
        return () => controller.abort();
    }, [endpoint]);

    const sorted = [...events].sort((a, b) => timeToSortKey(a.time) - timeToSortKey(b.time));
    const play = (url: string, title: string) => setStream({ url, title, type: streamType(url, 'embed') });

    return (
        <Layout title={`Opción ${n}`}>
            <Strip index={`0${n}`} name="opcion" highlight={n} />

            <div className="tty-frame mb-10">
                <div className="tty-head">
                    <span className="tty-prompt">$</span>
                    <span className="tty-cmd">agenda</span>
                    <span className="tty-flag">--fuente {source} · hora AR (UTC-3)</span>
                    <span className="tty-pid">{events.length.toString().padStart(3, '0')} partidos</span>
                </div>
                <div className="tty-body">
                    <div className="mb-4 flex flex-wrap items-center gap-3 text-[11.5px]">
                        <span className="text-[var(--mute)]">scraper</span>
                        <span className="rounded border border-[var(--line-hi)] bg-[var(--panel-2)] px-2 py-0.5 text-[var(--amber-hi)]">
                            JSON · 60s cache
                        </span>
                        <span className="text-[var(--mute)]">orden: noche → madrugada</span>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="panel p-4">
                                    <div className="mb-2 h-3 w-1/3 animate-pulse rounded bg-[var(--panel-3)]" />
                                    <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--panel-3)]" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="rounded border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-3 text-[12.5px] text-[var(--red)]">▒ {error}</div>
                    ) : events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--mute)]">
                            <div className="mb-3 text-4xl">▒▒</div>
                            <div className="text-[12px] tracking-[2px] uppercase">sin partidos</div>
                            <div className="mt-1 text-[11px]">el sitio upstream no tiene eventos cargados ahora</div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sorted.map((event, idx) => (
                                <MatchRow key={`${event.home}-${event.away}-${idx}`} event={event} onPlay={play} />
                            ))}
                        </div>
                    )}

                    <Notice>
                        Esta vista lista partidos scrapeados de un sitio de terceros. Los enlaces a streams son externos y pueden romperse o no estar
                        disponibles. Esta plataforma no aloja ni transmite ningún contenido directamente.
                    </Notice>
                </div>
            </div>

            {stream && <Player stream={stream} onClose={() => setStream(null)} />}
        </Layout>
    );
}

function MatchRow({ event, onPlay }: { event: AgendaEvent; onPlay: (url: string, title: string) => void }) {
    const title = `${event.home} vs ${event.away}`;
    const options = event.options ?? []; // la API Go emite null si el scraper no encontró opciones
    return (
        <article className="panel p-3">
            <div className="text-[12.5px] font-bold text-[var(--fg-hi)]">
                <Logo src={event.homeLogo} />
                <span>{event.home}</span>
                <span className="mx-2 text-[var(--mute)]">vs</span>
                <Logo src={event.awayLogo} />
                <span>{event.away}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] tracking-[1px] text-[var(--mute)] uppercase">
                {event.time && (
                    <span className="rounded border border-[var(--line-hi)] bg-[var(--ink-2)] px-1.5 py-0.5 text-[var(--green)]">{event.time}</span>
                )}
                {event.league && <span className="text-[var(--amber-hi)]">{event.league}</span>}
                {event.channel && <span className="text-[var(--amber-hi)]">{event.channel}</span>}
                {event.quality && <span>· {event.quality}</span>}
            </div>

            {options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {options.map((opt, i) => (
                        <button
                            key={`${opt.url}-${i}`}
                            type="button"
                            onClick={() => onPlay(opt.embed, title)}
                            className="rounded border border-[var(--line-hi)] bg-[var(--panel-2)] px-2.5 py-1 text-[11px] font-bold text-[var(--fg-hi)] transition-colors hover:border-[var(--green)] hover:text-[var(--green)]"
                            title={opt.embed}
                        >
                            <span className="text-[var(--green)]">▶</span> {opt.source}
                            {opt.quality && <span className="ml-1 text-[var(--amber-hi)]">{opt.quality}</span>}
                        </button>
                    ))}
                </div>
            )}
        </article>
    );
}

// alt vacío: el nombre del equipo ya está al lado. Si falla, se oculta.
function Logo({ src }: { src?: string }) {
    if (!src) return null;
    return (
        <img
            src={src}
            alt=""
            width={20}
            height={20}
            loading="lazy"
            className="mr-1.5 inline-block h-5 w-5 object-contain align-[-5px]"
            onError={(e) => (e.currentTarget.style.display = 'none')}
        />
    );
}
