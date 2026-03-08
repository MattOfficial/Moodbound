import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactFlow, {
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
    type Node,
    type Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getGraph } from '../api/client';
import { ArrowLeft, Loader2, Network } from 'lucide-react';

export const Graph = () => {
    const { documentId } = useParams<{ documentId: string }>();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isFirstLoad = useRef(true);

    useEffect(() => {
        if (!documentId) return;

        const loadGraph = async () => {
            try {
                if (isFirstLoad.current) {
                    setLoading(true);
                }
                const data = await getGraph(documentId);

                if (data.message) {
                    // Only show the error if it's the first load and we have no data
                    if (isFirstLoad.current) {
                        setError(data.message);
                    }
                    return;
                }

                // Clear any previous error if we successfully got data
                setError(null);

                // Simple circular layout algorithm for nodes
                const numNodes = data.nodes.length;
                const radius = Math.max(250, numNodes * 35);
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;

                const flowNodes: Node[] = data.nodes.map((node, i) => {
                    const angle = (i / numNodes) * 2 * Math.PI;
                    return {
                        id: node.id,
                        position: {
                            x: centerX + radius * Math.cos(angle) - 50,
                            y: centerY + radius * Math.sin(angle) - 20,
                        },
                        data: { label: node.label },
                        style: {
                            background: 'rgba(30, 41, 59, 0.9)',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '8px',
                            padding: '12px 20px',
                            fontWeight: '600',
                            fontSize: '14px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                        }
                    };
                });

                const flowEdges: Edge[] = data.edges.map((edge, i) => ({
                    id: `e${i}-${edge.source}-${edge.target}`,
                    source: edge.source,
                    target: edge.target,
                    label: edge.label,
                    animated: true,
                    style: { stroke: edge.color || '#6b7280', strokeWidth: 2 },
                    labelStyle: { fill: edge.color || '#6b7280', fontWeight: 'bold', fontSize: 12 },
                    labelBgStyle: { fill: 'rgba(15, 23, 42, 0.85)', color: 'transparent' },
                    labelBgPadding: [8, 4],
                    labelBgBorderRadius: 4,
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 20,
                        height: 20,
                        color: edge.color || '#6b7280',
                    },
                }));

                setNodes(flowNodes);
                setEdges(flowEdges);
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

        // Initial load
        loadGraph();

        // Poll every 5 seconds to support progressive rendering
        const intervalId = setInterval(loadGraph, 5000);

        return () => clearInterval(intervalId);
    }, [documentId, setNodes, setEdges]);

    return (
        <div className="w-screen h-screen bg-[#0f131f] text-white flex flex-col absolute top-0 left-0 z-50 overflow-hidden">
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
                            Knowledge Graph
                        </h1>
                    </div>
                    <p className="text-white/50 text-sm font-medium tracking-wide uppercase">Neo4j Relationship Explorer</p>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 w-full h-full relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                            <Loader2 className="animate-spin text-purple-400 relative z-10" size={56} />
                        </div>
                        <p className="text-white/70 animate-pulse font-medium tracking-wide">Querying Neo4j database...</p>
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
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        attributionPosition="bottom-right"
                        className="bg-[#0f131f]"
                    >
                        <Background color="#334155" gap={24} size={1.5} />
                        <Controls
                            className="bg-[#1e293b] border-white/10 fill-white/80 shadow-xl overflow-hidden rounded-lg"
                            style={{ display: 'flex', flexDirection: 'column' }}
                        />
                    </ReactFlow>
                )}
            </div>
        </div>
    );
};
