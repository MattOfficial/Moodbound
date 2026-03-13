import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods, LinkObject, NodeObject } from 'react-force-graph-2d';
import { getErrorMessage, getGraph } from '../api/client';
import { ArrowLeft, Loader2, Network } from 'lucide-react';

type GraphNode = {
    id: string;
    name: string;
    val: number;
};

type GraphLinkData = {
    label: string;
    color: string;
};

type GraphNodeObject = NodeObject<GraphNode>;
type GraphLinkObject = LinkObject<GraphNode, GraphLinkData>;
type GraphCanvasData = {
    nodes: GraphNodeObject[];
    links: GraphLinkObject[];
};

const getNodeId = (value: string | number | GraphNodeObject | undefined): string => {
    if (typeof value === 'object') {
        return value?.id != null ? String(value.id) : '';
    }
    return value != null ? String(value) : '';
};

export const Graph = () => {
    const { documentId } = useParams<{ documentId: string }>();
    const [graphData, setGraphData] = useState<GraphCanvasData>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoverNode, setHoverNode] = useState<string | null>(null);
    const isFirstLoad = useRef(true);
    const graphSignature = useRef<number>(0);
    const fgRef = useRef<ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphLinkData>> | undefined>(undefined);

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
                    if (isFirstLoad.current) {
                        setError(data.message);
                    }
                    return;
                }

                setError(null);

                const currentSignature = data.nodes.length + data.edges.length;
                if (!isFirstLoad.current && graphSignature.current === currentSignature) {
                    return;
                }
                graphSignature.current = currentSignature;

                const nodes: GraphNodeObject[] = data.nodes.map((node) => ({
                    id: node.id,
                    name: node.label,
                    val: 1,
                }));

                const nodeIds = new Set(nodes.map((node) => getNodeId(node.id)));
                const links: GraphLinkObject[] = data.edges
                    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
                    .map((edge) => ({
                        source: edge.source,
                        target: edge.target,
                        label: edge.label,
                        color: edge.color || '#475569',
                    }));

                setGraphData({ nodes, links });

                if (isFirstLoad.current && fgRef.current) {
                    setTimeout(() => {
                        fgRef.current?.zoomToFit(400, 150);
                    }, 500);
                }
            } catch (error: unknown) {
                console.error('Failed to load graph:', error);
                setError(getErrorMessage(error, 'Failed to load relationship graph.'));
            } finally {
                if (isFirstLoad.current) {
                    setLoading(false);
                    isFirstLoad.current = false;
                }
            }
        };

        void loadGraph();
        const intervalId = setInterval(() => {
            void loadGraph();
        }, 5000);

        return () => clearInterval(intervalId);
    }, [documentId]);

    const { connectedNodes, connectedLinks } = useMemo(() => {
        const links = new Set<GraphLinkObject>();
        const nodes = new Set<string>();

        if (hoverNode) {
            nodes.add(hoverNode);
            graphData.links.forEach((link) => {
                const sourceId = getNodeId(link.source);
                const targetId = getNodeId(link.target);

                if (sourceId === hoverNode || targetId === hoverNode) {
                    links.add(link);
                    if (sourceId) nodes.add(sourceId);
                    if (targetId) nodes.add(targetId);
                }
            });
        }

        return { connectedNodes: nodes, connectedLinks: links };
    }, [graphData.links, hoverNode]);

    const paintNode = useCallback((node: GraphNodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const nodeId = getNodeId(node.id);
        const nodeX = node.x ?? 0;
        const nodeY = node.y ?? 0;
        const isHovered = nodeId === hoverNode;
        const isConnected = hoverNode ? connectedNodes.has(nodeId) : true;

        const label = node.name;
        const fontSize = 12 / globalScale;
        ctx.font = `500 ${fontSize}px Sans-Serif`;
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions = [textWidth, fontSize].map((size) => size + fontSize * 1.5) as [number, number];

        ctx.fillStyle = isConnected ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.15)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(
                nodeX - bckgDimensions[0] / 2,
                nodeY - bckgDimensions[1] / 2,
                bckgDimensions[0],
                bckgDimensions[1],
                8 / globalScale,
            );
        } else {
            ctx.rect(
                nodeX - bckgDimensions[0] / 2,
                nodeY - bckgDimensions[1] / 2,
                bckgDimensions[0],
                bckgDimensions[1],
            );
        }
        ctx.fill();

        ctx.strokeStyle = isHovered
            ? 'rgba(167, 139, 250, 0.9)'
            : (isConnected ? 'rgba(148, 163, 184, 0.4)' : 'rgba(148, 163, 184, 0.05)');
        ctx.lineWidth = isHovered ? 2 / globalScale : 1 / globalScale;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isConnected ? '#f8fafc' : 'rgba(248, 250, 252, 0.15)';
        ctx.fillText(label, nodeX, nodeY);
    }, [connectedNodes, hoverNode]);

    const getLinkColor = useCallback((link: GraphLinkObject) => {
        if (!hoverNode) return 'rgba(71, 85, 105, 0.3)';
        return connectedLinks.has(link) ? 'rgba(139, 92, 246, 0.8)' : 'rgba(71, 85, 105, 0.05)';
    }, [connectedLinks, hoverNode]);

    const getLinkWidth = useCallback((link: GraphLinkObject) => {
        if (!hoverNode) return 1.5;
        return connectedLinks.has(link) ? 2.5 : 0.5;
    }, [connectedLinks, hoverNode]);

    useEffect(() => {
        if (fgRef.current) {
            fgRef.current.d3Force('charge')?.strength(-400);
            fgRef.current.d3Force('link')?.distance(120);
        }
    }, [graphData]);

    return (
        <div className="w-screen h-screen bg-[#0f131f] text-white flex flex-col overflow-hidden">
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
                    <ForceGraph2D<GraphNode, GraphLinkData>
                        ref={fgRef}
                        graphData={graphData}
                        width={dimensions.width}
                        height={dimensions.height}
                        backgroundColor="#0f131f"
                        nodeCanvasObject={paintNode}
                        nodePointerAreaPaint={(node: GraphNodeObject, color: string, ctx: CanvasRenderingContext2D) => {
                            const nodeX = node.x ?? 0;
                            const nodeY = node.y ?? 0;

                            ctx.fillStyle = color;
                            ctx.beginPath();
                            ctx.arc(nodeX, nodeY, 15, 0, 2 * Math.PI, false);
                            ctx.fill();
                        }}
                        linkColor={getLinkColor}
                        linkWidth={getLinkWidth}
                        linkDirectionalArrowLength={4}
                        linkDirectionalArrowRelPos={1}
                        linkCanvasObjectMode={() => 'after'}
                        linkCanvasObject={(link: GraphLinkObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
                            const start = link.source;
                            const end = link.target;
                            if (typeof start !== 'object' || typeof end !== 'object') return;

                            const startX = start.x ?? 0;
                            const startY = start.y ?? 0;
                            const endX = end.x ?? 0;
                            const endY = end.y ?? 0;
                            const isHovered = hoverNode ? connectedLinks.has(link) : false;
                            const isGraphHovered = hoverNode !== null;

                            if (isGraphHovered && !isHovered) return;

                            const label = link.label;
                            if (!label) return;

                            const fontSize = 10 / globalScale;
                            ctx.font = `500 ${fontSize}px Sans-Serif`;

                            const textPos = {
                                x: startX + (endX - startX) / 2,
                                y: startY + (endY - startY) / 2,
                            };

                            const relLink = { x: endX - startX, y: endY - startY };
                            let textAngle = Math.atan2(relLink.y, relLink.x);
                            if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
                            if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

                            ctx.save();
                            ctx.translate(textPos.x, textPos.y);
                            ctx.rotate(textAngle);

                            const textWidth = ctx.measureText(label).width;
                            const bckgDimensions = [textWidth, fontSize].map((size) => size + fontSize * 0.4);

                            ctx.fillStyle = isHovered ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.6)';
                            ctx.fillRect(-bckgDimensions[0] / 2, -bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillStyle = isHovered ? '#e2e8f0' : '#64748b';
                            ctx.fillText(label, 0, 0);
                            ctx.restore();
                        }}
                        onNodeHover={(node) => setHoverNode(node?.id != null ? String(node.id) : null)}
                        d3VelocityDecay={0.2}
                    />
                )}
            </div>
        </div>
    );
};
