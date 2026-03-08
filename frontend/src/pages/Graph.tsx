import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods } from 'react-force-graph-2d';
import { getGraph } from '../api/client';
import { ArrowLeft, Loader2, Network } from 'lucide-react';

export const Graph = () => {
    const { documentId } = useParams<{ documentId: string }>();
    const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoverNode, setHoverNode] = useState<string | null>(null);
    const isFirstLoad = useRef(true);
    const graphSignature = useRef<number>(0);
    const fgRef = useRef<ForceGraphMethods>(null);

    // For auto-resize
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!documentId) return;

        const loadGraph = async () => {
            try {
                if (isFirstLoad.current) {
                    setLoading(true);
                }
                const data = await getGraph(documentId);

                if (data.message) {
                    if (isFirstLoad.current) setError(data.message);
                    return;
                }

                setError(null);

                const currentSignature = data.nodes.length + data.edges.length;
                if (!isFirstLoad.current && graphSignature.current === currentSignature) {
                    return;
                }
                graphSignature.current = currentSignature;

                // Format for react-force-graph
                const nodes = data.nodes.map((n: any) => ({
                    id: n.id,
                    name: n.label,
                    val: 1 // Default size
                }));

                // Filter invalid links safely
                const nodeIds = new Set(nodes.map((n: any) => n.id));
                const links = data.edges
                    .filter((e: any) => nodeIds.has(e.source) && nodeIds.has(e.target))
                    .map((e: any) => ({
                        source: e.source,
                        target: e.target,
                        label: e.label,
                        color: e.color || '#475569'
                    }));

                setGraphData({ nodes, links });

                if (isFirstLoad.current && fgRef.current) {
                    // Start physics forcefully isolated to center
                    setTimeout(() => {
                        // 400ms duration, 50px padding from the canvas edges
                        fgRef.current?.zoomToFit(400, 150);
                    }, 500);
                }

            } catch (err: any) {
                console.error("Failed to load graph:", err);
                setError(err.response?.data?.detail || "Failed to load relationship graph.");
            } finally {
                if (isFirstLoad.current) {
                    setLoading(false);
                    isFirstLoad.current = false;
                }
            }
        };

        loadGraph();
        const intervalId = setInterval(loadGraph, 5000);
        return () => clearInterval(intervalId);
    }, [documentId]);

    // Obsidian hover logic adjacency sets
    const { connectedNodes, connectedLinks } = useMemo(() => {
        const links = new Set<any>();
        const nodes = new Set<string>();

        if (hoverNode) {
            nodes.add(hoverNode);
            graphData.links.forEach((link: any) => {
                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;

                if (sourceId === hoverNode || targetId === hoverNode) {
                    links.add(link);
                    nodes.add(sourceId);
                    nodes.add(targetId);
                }
            });
        }
        return { connectedNodes: nodes, connectedLinks: links };
    }, [graphData.links, hoverNode]);

    // Custom Canvas rendering functions
    const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const isHovered = node.id === hoverNode;
        const isConnected = hoverNode ? connectedNodes.has(node.id) : true;

        const label = node.name;
        const fontSize = 12 / globalScale;
        ctx.font = `500 ${fontSize}px Sans-Serif`;
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 1.5) as [number, number];

        // Draw node disc backing
        ctx.fillStyle = isConnected ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.15)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(
                node.x - bckgDimensions[0] / 2,
                node.y - bckgDimensions[1] / 2,
                bckgDimensions[0],
                bckgDimensions[1],
                8 / globalScale
            );
        } else {
            ctx.rect(
                node.x - bckgDimensions[0] / 2,
                node.y - bckgDimensions[1] / 2,
                bckgDimensions[0],
                bckgDimensions[1]
            );
        }
        ctx.fill();

        // Draw border
        ctx.strokeStyle = isHovered
            ? 'rgba(167, 139, 250, 0.9)'
            : (isConnected ? 'rgba(148, 163, 184, 0.4)' : 'rgba(148, 163, 184, 0.05)');
        ctx.lineWidth = isHovered ? 2 / globalScale : 1 / globalScale;
        ctx.stroke();

        // Draw text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isConnected ? '#f8fafc' : 'rgba(248, 250, 252, 0.15)';
        ctx.fillText(label, node.x, node.y);
    }, [hoverNode, connectedNodes]);

    const getLinkColor = useCallback((link: any) => {
        if (!hoverNode) return 'rgba(71, 85, 105, 0.3)';
        return connectedLinks.has(link) ? 'rgba(139, 92, 246, 0.8)' : 'rgba(71, 85, 105, 0.05)';
    }, [hoverNode, connectedLinks]);

    const getLinkWidth = useCallback((link: any) => {
        if (!hoverNode) return 1.5;
        return connectedLinks.has(link) ? 2.5 : 0.5;
    }, [hoverNode, connectedLinks]);

    // Ensure Physics layout parameters are tuned correctly when data changes
    useEffect(() => {
        if (fgRef.current) {
            fgRef.current.d3Force('charge')?.strength(-400);
            fgRef.current.d3Force('link')?.distance(120);
        }
    }, [graphData]);

    return (
        <div className="w-screen h-screen bg-[#0f131f] text-white flex flex-col overflow-hidden">
            {/* Header Overlay */}
            <div className="absolute top-0 w-full p-8 z-10 flex justify-between items-center bg-gradient-to-b from-[#0f131f] to-transparent pointer-events-none">
                <Link to="/library" className="group flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all pointer-events-auto backdrop-blur-md">
                    <ArrowLeft size={18} className="text-white/70 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back to Library</span>
                </Link>

                <div className="text-right flex flex-col items-end">
                    <div className="flex items-center gap-3 mb-1">
                        <Network className="text-purple-400" size={24} />
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent tracking-tight">
                            Story Web
                        </h1>
                    </div>
                    <p className="text-white/50 text-sm font-medium tracking-wide uppercase">Dynamic Character Constellation</p>
                </div>
            </div>

            {/* Canvas */}
            <div className="absolute inset-0 cursor-move">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                            <Loader2 className="animate-spin text-purple-400 relative z-10" size={56} />
                        </div>
                        <p className="text-white/70 animate-pulse font-medium tracking-wide">Synthesizing Physics Graph...</p>
                    </div>
                ) : error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-xl">
                            <Network className="text-white/40" size={32} />
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight">Graph Not Ready</h2>
                        <p className="text-white/60 max-w-md leading-relaxed">{error}</p>
                    </div>
                ) : (
                    <ForceGraph2D
                        ref={fgRef as any}
                        graphData={graphData}
                        width={dimensions.width}
                        height={dimensions.height}
                        backgroundColor="#0f131f"
                        nodeCanvasObject={paintNode}
                        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                            // Creates a generous invisible hover hotbox around the node text
                            ctx.fillStyle = color;
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, 15, 0, 2 * Math.PI, false);
                            ctx.fill();
                        }}
                        linkColor={getLinkColor}
                        linkWidth={getLinkWidth}
                        linkDirectionalArrowLength={4}
                        linkDirectionalArrowRelPos={1}
                        linkCanvasObjectMode={() => 'after'}
                        linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                            const start = link.source;
                            const end = link.target;
                            if (typeof start !== 'object' || typeof end !== 'object') return;

                            const isHovered = hoverNode ? connectedLinks.has(link) : false;
                            const isGraphHovered = hoverNode !== null;

                            // Hide un-hovered labels for cleaner UI when interacting
                            if (isGraphHovered && !isHovered) return;

                            const label = link.label;
                            if (!label) return;

                            const fontSize = 10 / globalScale;
                            ctx.font = `500 ${fontSize}px Sans-Serif`;

                            // Calculate position
                            const textPos = {
                                x: start.x + (end.x - start.x) / 2,
                                y: start.y + (end.y - start.y) / 2
                            };

                            const relLink = { x: end.x - start.x, y: end.y - start.y };
                            let textAngle = Math.atan2(relLink.y, relLink.x);
                            // Maintain label vertical orientation
                            if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
                            if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

                            ctx.save();
                            ctx.translate(textPos.x, textPos.y);
                            ctx.rotate(textAngle);

                            // Background bounding box for text
                            const textWidth = ctx.measureText(label).width;
                            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);

                            ctx.fillStyle = isHovered ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.6)';
                            ctx.fillRect(-bckgDimensions[0] / 2, -bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

                            // Text fill
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillStyle = isHovered ? '#e2e8f0' : '#64748b';
                            ctx.fillText(label, 0, 0);
                            ctx.restore();
                        }}
                        onNodeHover={(node) => setHoverNode(node ? (node.id as string) : null)}
                        // Subtle inertia
                        d3VelocityDecay={0.2}
                    />
                )}
            </div>
        </div>
    );
};
