import { useEffect, useRef, useState } from 'react';

export type StreamType = 'hls' | 'video' | 'embed';
export type Stream = { url: string; title: string; type: StreamType };

export const streamType = (url: string, fallback: StreamType): StreamType => {
    const lower = url.toLowerCase();
    if (lower.includes('m3u8')) return 'hls';
    if (['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'].some((ext) => lower.includes(ext))) return 'video';
    return fallback;
};

export default function Player({ stream, onClose }: { stream: Stream; onClose: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        setFailed(false);
        if (stream.type === 'embed' || !video) return;
        // hls.js (~500 kB) se baja solo al reproducir HLS; sin MSE cae al HLS nativo del <video>.
        if (stream.type === 'hls') {
            let hls: import('hls.js').default | undefined;
            let cancelled = false;
            import('hls.js').then(({ default: Hls }) => {
                if (cancelled) return;
                if (!Hls.isSupported()) {
                    video.src = stream.url;
                    return void video.play().catch(() => undefined);
                }
                hls = new Hls({ enableWorker: true, lowLatencyMode: true });
                hls.loadSource(stream.url);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => void video.play().catch(() => undefined));
                hls.on(Hls.Events.ERROR, (_, data) => {
                    if (!data.fatal) return;
                    hls?.destroy();
                    setFailed(true);
                });
            });
            return () => {
                cancelled = true;
                hls?.destroy();
                video.pause();
                video.removeAttribute('src');
            };
        }
        video.src = stream.url;
        video.play().catch(() => undefined);
        return () => {
            video.pause();
            video.removeAttribute('src');
        };
    }, [stream]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        addEventListener('keydown', onKey);
        return () => removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Reproductor · ${stream.title}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" /* ponytail: sin backdrop-blur — blur sobre video en smart TV */
            onClick={onClose}
        >
            <div className="w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
                <div className="tty-frame">
                    <div className="tty-head">
                        <span className="tty-prompt">$</span>
                        <span className="tty-cmd">stream</span>
                        <span className="tty-flag">--tipo {stream.type}</span>
                        <span className="tty-pid">tty1</span>
                    </div>
                    <div className="tty-body !p-0">
                        <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--ink-2)] px-4 py-2">
                            <div className="flex items-center gap-2 text-[12px]">
                                <span className="text-[var(--green)]">●</span>
                                <span className="text-[var(--amber-hi)]">transmitiendo</span>
                                <span className="text-[var(--mute)]">—</span>
                                <span className="max-w-[60ch] truncate text-[var(--fg-hi)]">{stream.title}</span>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded border border-[var(--line-hi)] bg-[var(--panel-2)] px-2 py-1 text-[11px] tracking-[2px] text-[var(--mute)] uppercase transition-colors hover:border-[var(--red)] hover:text-[var(--red)]"
                                aria-label="Cerrar reproductor"
                            >
                                ✕ detener
                            </button>
                        </div>
                        <div className="relative aspect-video bg-black">
                            {failed && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black text-[12.5px] text-[var(--red)]">
                                    ▒ stream caído, probá otra opción
                                </div>
                            )}
                            {stream.type === 'embed' ? (
                                // sin sandbox: embed.st, tvf90.com y streamx305.sbs lo detectan y no cargan (probado 2026-10).
                                <iframe
                                    src={stream.url}
                                    title={stream.title}
                                    className="h-full w-full"
                                    allow="autoplay; fullscreen; picture-in-picture;"
                                    allowFullScreen
                                />
                            ) : (
                                <video ref={videoRef} className="h-full w-full" controls autoPlay playsInline onError={() => setFailed(true)}>
                                    Tu navegador no soporta el elemento de video.
                                </video>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--ink-2)] px-4 py-2 text-[11px] tracking-[2px] text-[var(--mute)] uppercase">
                            <span>
                                <span className="text-[var(--mute-2)]">esc</span> cerrar
                            </span>
                            <span className="truncate">origen {stream.url}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
