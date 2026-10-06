import { useEffect, useState } from 'react';

import Layout, { Notice, Strip } from '../layout';
import Player, { streamType, type Stream } from '../player';

type StreamOption = { url: string; language: string; id: string; hd: 'HD' | 'SD' };
type Source = { id: string; source: string; options?: StreamOption[]; loaded?: boolean };
type Event = { id: string; name: string; image: string; date: string | null; category?: string | null; sources: Source[] };
type Sport = { id: string; label: string };

const FALLBACK_SPORTS: Sport[] = [
    { id: 'football', label: 'Fútbol' },
    { id: 'basketball', label: 'Básquet' },
    { id: 'tennis', label: 'Tenis' },
    { id: 'motor-sports', label: 'Motor' },
    { id: 'rugby', label: 'Rugby' },
    { id: 'fight', label: 'UFC/Box' },
];

// ponytail: mapa chico es-AR; si no está, el nombre upstream capitalizado.
const SPORT_LABELS: Record<string, string> = {
    football: 'Fútbol',
    basketball: 'Básquet',
    tennis: 'Tenis',
    'motor-sports': 'Motor',
    rugby: 'Rugby',
    fight: 'UFC/Box',
    'american-football': 'Fútbol americano',
    hockey: 'Hockey',
    baseball: 'Béisbol',
    mma: 'MMA',
    boxing: 'Boxeo',
    cricket: 'Críquet',
    'table-tennis': 'Tenis de mesa',
};

const formatDate = (date: string | null) =>
    date
        ? new Date(date).toLocaleString('es-AR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';

export default function Events() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSourceId, setLoadingSourceId] = useState<string | null>(null);
    const [sports, setSports] = useState<Sport[]>(FALLBACK_SPORTS);
    const [sport, setSport] = useState(FALLBACK_SPORTS[0].id);
    const [liveOnly, setLiveOnly] = useState(false);
    const [popularOnly, setPopularOnly] = useState(false);
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
    const [stream, setStream] = useState<Stream | null>(null);

    useEffect(() => {
        fetch('/api/sports')
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data: { id: string; name: string }[]) => {
                if (!Array.isArray(data) || data.length === 0) return;
                const mapped = data.map((s) => ({ id: s.id, label: SPORT_LABELS[s.id] ?? s.name.charAt(0).toUpperCase() + s.name.slice(1) }));
                setSports(mapped);
                setSport((current) => (mapped.some((s) => s.id === current) ? current : mapped[0].id));
            })
            .catch(() => undefined); // queda FALLBACK_SPORTS
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setEvents([]);
        setLoading(true);
        const params = new URLSearchParams({ sport, live: String(liveOnly), popular: String(popularOnly) });
        fetch(`/api/events?${params}`, { signal: controller.signal })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then((data: Event[]) => setEvents(data ?? []))
            .catch(() => undefined)
            .finally(() => !controller.signal.aborted && setLoading(false));
        return () => controller.abort();
    }, [sport, liveOnly, popularOnly]);

    const loadSource = async (eventId: string, source: Source) => {
        setLoadingSourceId(source.id);
        let options: StreamOption[] | undefined;
        try {
            const params = new URLSearchParams({ source: source.source, id: source.id });
            const response = await fetch(`/api/stream?${params}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data: { embedUrl: string; language: string; streamNo: string | number; hd: boolean }[] = await response.json();
            options = data.map((s) => ({ url: s.embedUrl, language: s.language, id: String(s.streamNo), hd: s.hd ? 'HD' : 'SD' }));
        } catch {
            /* se marca loaded sin opciones */
        }
        setEvents((prev) =>
            prev.map((ev) =>
                ev.id !== eventId
                    ? ev
                    : { ...ev, sources: ev.sources.map((s) => (s.id === source.id ? { ...s, options: options ?? s.options, loaded: true } : s)) },
            ),
        );
        setLoadingSourceId(null);
    };

    const play = (url: string, title: string) => setStream({ url, title, type: streamType(url, /embed|iframe|player/i.test(url) ? 'embed' : 'hls') });

    return (
        <Layout title="Opción 1">
            <Strip index="01" name="opcion" highlight="1" />

            <div className="tty-frame mb-10">
                <div className="tty-head">
                    <span className="tty-prompt">$</span>
                    <span className="tty-cmd">eventos</span>
                    <span className="tty-flag">--deporte {sport}</span>
                    {liveOnly && <span className="text-[var(--red)]">--envivo</span>}
                    {popularOnly && <span className="text-[var(--amber)]">--popular</span>}
                    <span className="tty-pid">{events.length.toString().padStart(3, '0')} rows</span>
                </div>
                <div className="tty-body">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <FilterChip active={liveOnly} onClick={() => setLiveOnly((v) => !v)}>
                            <span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${liveOnly ? 'animate-pulse bg-white' : 'bg-[var(--red)]'}`} />
                            en vivo
                        </FilterChip>
                        <FilterChip active={popularOnly} onClick={() => setPopularOnly((v) => !v)}>
                            ★ popular
                        </FilterChip>
                        <span className="mx-2 h-5 w-px bg-[var(--line)]" />
                        {sports.map((s) => (
                            <FilterChip key={s.id} active={sport === s.id} onClick={() => setSport(s.id)}>
                                {s.label}
                            </FilterChip>
                        ))}
                    </div>

                    {loading ? (
                        <SkeletonGrid />
                    ) : events.length === 0 ? (
                        <EmptyState liveOnly={liveOnly} popularOnly={popularOnly} sport={sport} />
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {events.map((event) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    imageFailed={failedImages.has(event.id)}
                                    onImageError={() => setFailedImages((prev) => new Set(prev).add(event.id))}
                                    loadingSourceId={loadingSourceId}
                                    onSourceClick={loadSource}
                                    onPlay={play}
                                />
                            ))}
                        </div>
                    )}

                    <Notice>
                        Esta plataforma actúa únicamente como agregador de enlaces a contenidos alojados y transmitidos por terceros. No alojamos ni
                        transmitimos ningún contenido directamente.
                    </Notice>
                </div>
            </div>

            {stream && <Player stream={stream} onClose={() => setStream(null)} />}
        </Layout>
    );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

function EventCard({
    event,
    imageFailed,
    onImageError,
    loadingSourceId,
    onSourceClick,
    onPlay,
}: {
    event: Event;
    imageFailed: boolean;
    onImageError: () => void;
    loadingSourceId: string | null;
    onSourceClick: (eventId: string, source: Source) => void;
    onPlay: (url: string, title: string) => void;
}) {
    return (
        <article className="panel overflow-hidden">
            <div className="relative h-36 overflow-hidden border-b border-[var(--line)] bg-[var(--ink)]">
                {imageFailed ? (
                    <div className="flex h-full w-full items-center justify-center text-[var(--mute)]">▒▒ sin_imagen</div>
                ) : (
                    <img
                        alt={event.name}
                        className="h-full w-full object-cover opacity-80"
                        src={event.image}
                        onError={onImageError}
                        loading="lazy"
                        decoding="async"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute right-2 bottom-2 left-2">
                    <div className="flex items-center gap-2 text-[10px] tracking-[2px] text-[var(--amber)] uppercase">
                        {event.category && <span className="text-[var(--green)]">[{event.category}]</span>}
                        <span>▸ {event.sources.length} sources</span>
                    </div>
                    <h3 className="truncate text-[14px] font-bold text-[var(--fg-max)]">{event.name}</h3>
                </div>
            </div>
            <div className="space-y-1.5 p-4">
                <div className="kv">
                    <span className="k">date</span>
                    <span className="v">{formatDate(event.date)}</span>
                </div>
                <div className="kv">
                    <span className="k">id</span>
                    <span className="v truncate">{event.id}</span>
                </div>
                <div className="mt-3 space-y-1.5">
                    {event.sources.map((source) => (
                        <div key={source.id}>
                            <button
                                type="button"
                                onClick={() => onSourceClick(event.id, source)}
                                className="flex w-full items-center justify-between rounded border border-[var(--line-hi)] bg-[var(--panel-2)] px-3 py-2 text-left text-[12px] font-bold text-[var(--fg-hi)] transition-colors hover:border-[var(--green)] hover:text-[var(--green)] disabled:opacity-50"
                                disabled={loadingSourceId === source.id}
                            >
                                <span>
                                    <span className="text-[var(--mute)]">source</span> ▸ {source.source}
                                </span>
                                <span className="text-[10px] tracking-[2px] text-[var(--mute)] uppercase">
                                    {loadingSourceId === source.id ? '…cargando' : source.loaded ? 'recargar' : 'cargar'}
                                </span>
                            </button>
                            {source.loaded && source.options?.length === 0 && (
                                <div className="mt-1 ml-2 rounded border border-dashed border-[var(--line)] bg-[var(--ink-2)] px-3 py-1.5 text-[11px] text-[var(--mute)]">
                                    ▒ no hay streams para esta fuente
                                </div>
                            )}
                            {!!source.options?.length && (
                                <div className="mt-1 ml-2 space-y-1">
                                    {source.options.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => onPlay(option.url, event.name)}
                                            className="flex w-full items-center gap-2 rounded border border-[var(--line)] bg-[var(--ink-2)] px-3 py-1.5 text-left text-[11.5px] text-[var(--mute)] transition-colors hover:border-[var(--green)] hover:text-[var(--green)]"
                                        >
                                            <span className="text-[var(--green)]">▶</span>
                                            <span className="font-bold text-[var(--amber-hi)]">{option.hd}</span>
                                            <span className="text-[var(--fg-hi)]">stream {option.id}</span>
                                            <span className="ml-auto">{option.language}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </article>
    );
}

function SkeletonGrid() {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="panel overflow-hidden">
                    <div className="h-36 animate-pulse bg-[var(--panel-3)]" />
                    <div className="space-y-2 p-4">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--panel-3)]" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--panel-3)]" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function EmptyState({ liveOnly, popularOnly, sport }: { liveOnly: boolean; popularOnly: boolean; sport: string }) {
    const hint =
        liveOnly && popularOnly
            ? 'no hay populares en vivo ahora mismo'
            : liveOnly
              ? `no hay ${sport} en vivo ahora mismo`
              : popularOnly
                ? 'no hay populares para este deporte'
                : 'no hay eventos para este deporte';
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--mute)]">
            <div className="mb-3 text-4xl">▒▒</div>
            <div className="text-[12px] tracking-[2px] uppercase">sin eventos</div>
            <div className="mt-1 text-[11px]">{hint}</div>
        </div>
    );
}
