import { useEffect, useState } from 'react';

import Layout, { FilterChip, Notice, Strip } from '../layout';

type Side = { name: string; score: string; winner: boolean; logo?: string };
type Score = { id: string; date: string; state: 'pre' | 'in' | 'post'; detail: string; tournament?: string; home: Side; away: Side;
    session?: string; // carreras: sin home/away, top 3 en podium
    podium?: Side[];
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
                                            <ScoreRow key={s.id} score={s} />
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

function ScoreRow({ score: s }: { score: Score }) {
    const status = s.state === 'pre' ? formatDate(s.date) : s.state === 'post' ? 'Final' : s.detail;
    return (
        <article className="panel flex items-center gap-4 p-3">
            <div className="w-28 shrink-0 text-[10.5px] sm:w-44 tracking-[1px] uppercase">
                <span className={s.state === 'in' ? 'font-bold text-[var(--red)]' : s.state === 'pre' ? 'text-[var(--green)]' : 'text-[var(--mute)]'}>{status}</span>
                {s.session && <div className="font-bold text-[var(--fg-hi)]">{SESSIONS[s.session] ?? s.session}</div>}
                {s.tournament && <div title={s.tournament} className="truncate text-[var(--amber-hi)] normal-case">{s.tournament}</div>}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
                {s.session ? (
                    s.podium?.length ? (
                        s.podium.map((p, i) => <Team key={i} side={{ ...p, score: `${i + 1}º` }} showScore />)
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
        </article>
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
