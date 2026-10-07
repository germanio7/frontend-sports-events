import { useEffect, useState } from 'react';

import Layout, { FilterChip, Notice, Strip } from '../layout';

type Detail = {
    venue?: string;
    homePeriods?: string[];
    awayPeriods?: string[];
    plays: { clock: string; side: 'home' | 'away'; kind: 'goal' | 'yellow' | 'red' | 'score'; text: string }[];
    stats: { label: string; home: string; away: string }[];
};

type Side = { name: string; score: string; winner: boolean; logo?: string };
type Score = { id: string; date: string; state: 'pre' | 'in' | 'post'; detail: string; tournament?: string; home: Side; away: Side;
    session?: string; // carreras: sin home/away, clasificación completa en results
    results?: Side[];
};

// slugs de ESPN (sport/league). Euroliga afuera: ESPN tiene los equipos pero no los partidos.
const TENNIS = '/redesign/assets/img/icons/ESPN-icon-tennis.png';
const LEAGUES = [
    { id: 'soccer/arg.1', label: 'Liga Profesional', logo: '/i/leaguelogos/soccer/500-dark/1.png' },
    { id: 'soccer/arg.copa', label: 'Copa Argentina', logo: '/i/leaguelogos/soccer/500-dark/2320.png' },
    { id: 'soccer/conmebol.libertadores', label: 'Libertadores', logo: '/i/leaguelogos/soccer/500-dark/58.png' },
    { id: 'soccer/conmebol.sudamericana', label: 'Sudamericana', logo: '/i/leaguelogos/soccer/500-dark/1208.png' },
    { id: 'soccer/uefa.champions', label: 'Champions', logo: '/i/leaguelogos/soccer/500-dark/2.png' },
    { id: 'soccer/uefa.europa', label: 'Europa League', logo: '/i/leaguelogos/soccer/500-dark/2310.png' },
    { id: 'soccer/eng.1', label: 'Premier', logo: '/i/leaguelogos/soccer/500-dark/23.png' },
    { id: 'soccer/esp.1', label: 'LaLiga', logo: '/i/leaguelogos/soccer/500-dark/15.png' },
    { id: 'soccer/ita.1', label: 'Serie A', logo: '/i/leaguelogos/soccer/500-dark/12.png' },
    { id: 'soccer/ger.1', label: 'Bundesliga', logo: '/i/leaguelogos/soccer/500-dark/10.png' },
    { id: 'soccer/fra.1', label: 'Ligue 1', logo: '/i/leaguelogos/soccer/500-dark/9.png' },
    { id: 'basketball/nba', label: 'NBA', logo: '/i/teamlogos/leagues/500-dark/nba.png' },
    { id: 'football/nfl', label: 'NFL', logo: '/i/teamlogos/leagues/500-dark/nfl.png' },
    { id: 'tennis/atp', label: 'ATP', logo: TENNIS },
    { id: 'tennis/wta', label: 'WTA', logo: TENNIS },
    { id: 'racing/f1', label: 'F1', logo: '/i/teamlogos/leagues/500/f1.png' },
];

// ESPN sirve logos de 500px (~80 kB); el combiner los achica en su CDN (~3 kB).
const espnImg = (src: string, size: number) =>
    `https://a.espncdn.com/combiner/i?img=${encodeURIComponent(src.replace('https://a.espncdn.com', ''))}&w=${size * 2}&h=${size * 2}`;

const GROUPS = [
    { state: 'in', label: 'en vivo' },
    { state: 'pre', label: 'próximos' },
    { state: 'post', label: 'finalizados' },
] as const;

const SESSIONS: Record<string, string> = { FP1: 'Libre 1', FP2: 'Libre 2', FP3: 'Libre 3', Qual: 'Clasificación', Race: 'Carrera' };

const formatDate = (date: string) =>
    new Date(date).toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function Scores() {
    const [league, setLeague] = useState(LEAGUES[0].id);
    const [scores, setScores] = useState<Score[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const [sport, name] = league.split('/');
        const load = () =>
            fetch(`/api/scores?${new URLSearchParams({ sport, league: name })}`, { signal: controller.signal })
                .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
                .then((data: { scores: Score[] }) => {
                    setScores(data.scores ?? []);
                    setError(false);
                })
                .catch((err) => err.name !== 'AbortError' && setError(true));
        setScores(null);
        load();
        const timer = setInterval(load, 30_000); // = cache de la API
        return () => {
            controller.abort();
            clearInterval(timer);
        };
    }, [league]);

    const live = scores?.some((s) => s.state === 'in');

    return (
        <Layout title="Resultados">
            <Strip index="04" name="resultados" highlight="espn" />

            <div className="tty-frame mb-10">
                <div className="tty-head">
                    <span className="tty-prompt">$</span>
                    <span className="tty-cmd">scores</span>
                    <span className="tty-flag">--liga {league} · hora AR (UTC-3)</span>
                    {live && <span className="text-[var(--red)]">● en vivo</span>}
                    <span className="tty-pid">{(scores?.length ?? 0).toString().padStart(3, '0')} partidos</span>
                </div>
                <div className="tty-body">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        {LEAGUES.map((l) => (
                            <FilterChip key={l.id} active={league === l.id} onClick={() => setLeague(l.id)}>
                                <img src={espnImg(l.logo, 16)} alt="" width={16} height={16} className="mr-1.5 inline-block h-4 w-4 object-contain align-[-3px]" />
                                {l.label}
                            </FilterChip>
                        ))}
                    </div>

                    {error && !scores ? (
                        <div className="rounded border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-3 text-[12.5px] text-[var(--red)]">▒ no se pudieron obtener los resultados</div>
                    ) : !scores ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="panel h-[52px] animate-pulse" />
                            ))}
                        </div>
                    ) : scores.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--mute)]">
                            <div className="mb-3 text-4xl">▒▒</div>
                            <div className="text-[12px] tracking-[2px] uppercase">sin partidos</div>
                            <div className="mt-1 text-[11px]">ESPN no tiene partidos de esta liga en el calendario actual</div>
                        </div>
                    ) : (
                        GROUPS.map(({ state, label }) => {
                            const rows = scores.filter((s) => s.state === state);
                            if (rows.length === 0) return null;
                            return (
                                <section key={state} className="mb-6">
                                    <h2 className={`mb-2 text-[11px] font-bold tracking-[2px] uppercase ${state === 'in' ? 'text-[var(--red)]' : 'text-[var(--mute)]'}`}>
                                        {state === 'in' && '● '}
                                        {label} <span className="text-[var(--mute-2)]">({rows.length})</span>
                                    </h2>
                                    <div className="space-y-2">
                                        {rows.map((s) => (
                                            <ScoreRow key={s.id} score={s} league={league} />
                                        ))}
                                    </div>
                                </section>
                            );
                        })
                    )}

                    <Notice>Resultados de la API pública de ESPN. Se actualizan solos cada 30 segundos.</Notice>
                </div>
            </div>
        </Layout>
    );
}

function ScoreRow({ score: s, league }: { score: Score; league: string }) {
    const [open, setOpen] = useState(false);
    const status = s.state === 'pre' ? formatDate(s.date) : s.state === 'post' ? 'Final' : s.detail;
    const results = s.results ?? [];
    // tenis no tiene summary en ESPN; F1 despliega la clasificación que ya vino en el listado
    const expandable = s.session ? results.length > 3 : !league.startsWith('tennis/');
    const summary = (
        <>
            <div className="w-28 shrink-0 text-[10.5px] tracking-[1px] uppercase sm:w-44">
                <span className={s.state === 'in' ? 'font-bold text-[var(--red)]' : s.state === 'pre' ? 'text-[var(--green)]' : 'text-[var(--mute)]'}>{status}</span>
                {s.session && <div className="font-bold text-[var(--fg-hi)]">{SESSIONS[s.session] ?? s.session}</div>}
                {s.tournament && <div title={s.tournament} className="truncate text-[var(--amber-hi)] normal-case">{s.tournament}</div>}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
                {s.session ? (
                    results.length ? (
                        results.slice(0, open ? undefined : 3).map((p, i) => <Team key={i} side={{ ...p, score: `${i + 1}º` }} showScore />)
                    ) : (
                        <div className="text-[11px] text-[var(--mute)]">por disputarse</div>
                    )
                ) : (
                    <>
                        <Team side={s.home} showScore={s.state !== 'pre'} />
                        <Team side={s.away} showScore={s.state !== 'pre'} />
                    </>
                )}
            </div>
            {expandable && <span className={`shrink-0 text-[var(--mute)] transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>}
        </>
    );
    return (
        <article className={`panel ${open ? 'border-[var(--line-hi)]' : ''}`}>
            {expandable ? (
                <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-4 p-3 text-left">
                    {summary}
                </button>
            ) : (
                <div className="flex items-center gap-4 p-3">{summary}</div>
            )}
            {open && !s.session && <Details score={s} league={league} />}
        </article>
    );
}

function Details({ score: s, league }: { score: Score; league: string }) {
    const [detail, setDetail] = useState<Detail | null>(null);
    const [error, setError] = useState(false);

    // ponytail: se pide una vez al abrir; en partidos en vivo no se refresca solo, cerrar y abrir lo actualiza.
    useEffect(() => {
        const controller = new AbortController();
        const [sport, name] = league.split('/');
        fetch(`/api/scores/${s.id}?${new URLSearchParams({ sport, league: name })}`, { signal: controller.signal })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then(setDetail)
            .catch((err) => err.name !== 'AbortError' && setError(true));
        return () => controller.abort();
    }, [s.id, league]);

    const box = 'border-t border-[var(--line)] px-3 py-3 text-[12px]';
    if (error) return <div className={`${box} text-[var(--red)]`}>▒ no se pudo obtener el detalle</div>;
    if (!detail) return <div className={`${box} animate-pulse text-[var(--mute)]`}>cargando detalle…</div>;

    const periods = detail.homePeriods?.length ? detail.homePeriods.length : 0;
    const name = (side: 'home' | 'away') => s[side].name;
    const icon = { goal: '⚽', yellow: '🟨', red: '🟥', score: '🏈' } as const;
    const empty = !detail.venue && !periods && !detail.plays.length && !detail.stats.length;

    return (
        <div className={`${box} space-y-4`}>
            {detail.venue && (
                <div className="text-[11px] text-[var(--mute)]">
                    <span className="text-[var(--mute-2)]">estadio</span> {detail.venue}
                </div>
            )}

            {periods > 0 && s.state !== 'pre' && (
                <table className="w-full max-w-md text-[11.5px] tabular-nums">
                    <thead className="text-[var(--mute)]">
                        <tr>
                            <th className="text-left font-normal" />
                            {detail.homePeriods!.map((_, i) => (
                                <th key={i} className="w-8 text-right font-normal">
                                    {i + 1}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-[var(--fg-hi)]">
                        {(['home', 'away'] as const).map((side) => (
                            <tr key={side}>
                                <td className="max-w-0 truncate pr-2">{name(side)}</td>
                                {(side === 'home' ? detail.homePeriods! : detail.awayPeriods ?? []).map((v, i) => (
                                    <td key={i} className="text-right">
                                        {v}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {detail.plays.length > 0 && (
                <ul className="space-y-1">
                    {detail.plays.map((p, i) => (
                        <li key={i} className={`flex gap-2 ${p.side === 'away' ? 'flex-row-reverse text-right' : ''}`}>
                            <span className="w-14 shrink-0 text-[var(--mute)] tabular-nums">{p.clock}</span>
                            <span aria-hidden>{icon[p.kind]}</span>
                            <span className="min-w-0 text-[var(--fg-hi)]">{p.text}</span>
                        </li>
                    ))}
                </ul>
            )}

            {detail.stats.length > 0 && (
                <div className="space-y-1">
                    {detail.stats.map((st) => (
                        <div key={st.label} className="grid grid-cols-[1fr_10rem_1fr] gap-3 tabular-nums">
                            <span className="text-right text-[var(--fg-hi)]">{st.home}</span>
                            <span className="text-center text-[10.5px] tracking-[1px] text-[var(--mute)] uppercase">{st.label}</span>
                            <span className="text-[var(--fg-hi)]">{st.away}</span>
                        </div>
                    ))}
                </div>
            )}

            {empty && <div className="text-[var(--mute)]">ESPN no tiene más detalle para este partido</div>}
        </div>
    );
}

function Team({ side, showScore }: { side: Side; showScore: boolean }) {
    return (
        <div className={`flex items-center justify-between gap-3 text-[12.5px] ${side.winner ? 'font-bold text-[var(--fg-max)]' : 'text-[var(--fg-hi)]'}`}>
            <span className="flex min-w-0 items-center gap-2">
                {/* sin logo: hueco del mismo ancho para que los nombres queden alineados */}
                {side.logo ? (
                    <img
                        src={espnImg(side.logo, 20)}
                        alt=""
                        width={20}
                        height={20}
                        loading="lazy"
                        className="h-5 w-5 shrink-0 object-contain"
                        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                    />
                ) : (
                    <span className="w-5 shrink-0" />
                )}
                <span className="truncate">{side.name}</span>
            </span>
            {showScore && <span className="shrink-0 tabular-nums">{side.score}</span>}
        </div>
    );
}
