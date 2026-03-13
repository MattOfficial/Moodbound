import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { Graph } from './Graph';

const getGraphMock = vi.fn();

vi.mock('../api/client', () => ({
  getGraph: (...args: unknown[]) => getGraphMock(...args),
  getErrorMessage: () => 'Graph failed.',
}));

vi.mock('react-force-graph-2d', async () => {
  const react = await vi.importActual<typeof import('react')>('react');

  const ForceGraphMock = react.forwardRef<
    { zoomToFit: (duration?: number, padding?: number) => void; d3Force: (name: string) => { strength?: (value: number) => void; distance?: (value: number) => void } },
    {
      graphData: { nodes: Array<{ id: string; name?: string; x?: number; y?: number }>; links: Array<{ source: unknown; target: unknown; label?: string; color?: string }> };
      nodeCanvasObject?: (node: { id: string; name?: string; x?: number; y?: number }, ctx: CanvasRenderingContext2D, scale: number) => void;
      nodePointerAreaPaint?: (node: { id: string; name?: string; x?: number; y?: number }, color: string, ctx: CanvasRenderingContext2D) => void;
      linkColor?: (link: { source: unknown; target: unknown; label?: string; color?: string }) => string;
      linkWidth?: (link: { source: unknown; target: unknown; label?: string; color?: string }) => number;
      linkCanvasObject?: (link: { source: unknown; target: unknown; label?: string; color?: string }, ctx: CanvasRenderingContext2D, scale: number) => void;
      onNodeHover?: (node: { id: string } | null) => void;
    }
  >(({ graphData, nodeCanvasObject, nodePointerAreaPaint, linkColor, linkWidth, linkCanvasObject, onNodeHover }, ref) => {
    const phaseRef = react.useRef(0);

    react.useImperativeHandle(ref, () => ({
      zoomToFit: () => undefined,
      d3Force: (name: string) =>
        name === 'charge'
          ? { strength: () => undefined }
          : { distance: () => undefined },
    }));

    react.useEffect(() => {
      const baseContext = {
        beginPath: vi.fn(),
        rect: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 42 })),
        arc: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        fillRect: vi.fn(),
        set font(_value: string) {},
        set fillStyle(_value: string) {},
        set strokeStyle(_value: string) {},
        set lineWidth(_value: number) {},
        set textAlign(_value: CanvasTextAlign) {},
        set textBaseline(_value: CanvasTextBaseline) {},
      } as unknown as CanvasRenderingContext2D;

      const nodeA = { id: 'alice', name: 'Alice', x: 10, y: 20 };
      const nodeB = { id: 'bob', name: 'Bob', x: 30, y: 40 };
      const nodeC = { id: 'cara', name: 'Cara', x: 50, y: 60 };
      const connectedLink = (graphData.links[0] ?? { label: 'ALLY', color: '#8b5cf6' }) as {
        source: unknown;
        target: unknown;
        label?: string;
        color?: string;
      };
      connectedLink.source = nodeA;
      connectedLink.target = nodeB;
      connectedLink.label = connectedLink.label ?? 'ALLY';
      connectedLink.color = connectedLink.color ?? '#8b5cf6';
      const disconnectedLink = { source: nodeC, target: nodeB, label: 'RIVAL', color: '#ef4444' };
      const unlabeledLink = { source: nodeA, target: nodeB, label: '', color: '#8b5cf6' };
      const invalidLink = { source: 'alice', target: 'bob', label: 'ALLY', color: '#8b5cf6' };

      if (phaseRef.current === 0) {
        const ctxWithRoundRect = {
          ...baseContext,
          roundRect: vi.fn(),
        } as unknown as CanvasRenderingContext2D;

        nodeCanvasObject?.(nodeA, ctxWithRoundRect, 1);
        nodePointerAreaPaint?.(nodeA, '#fff', ctxWithRoundRect);
        linkColor?.(connectedLink);
        linkWidth?.(connectedLink);
        linkCanvasObject?.(invalidLink, ctxWithRoundRect, 1);
        onNodeHover?.({ id: 'alice' });
        phaseRef.current = 1;
        return;
      }

      if (phaseRef.current === 1) {
        nodeCanvasObject?.(nodeA, baseContext, 1);
        nodeCanvasObject?.(nodeC, baseContext, 1);
        linkColor?.(connectedLink);
        linkColor?.(disconnectedLink);
        linkWidth?.(connectedLink);
        linkWidth?.(disconnectedLink);
        linkCanvasObject?.(unlabeledLink, baseContext, 1);
        linkCanvasObject?.(disconnectedLink, baseContext, 1);
        linkCanvasObject?.(connectedLink, baseContext, 1);
        onNodeHover?.(null);
        phaseRef.current = 2;
      }
    }, [graphData, linkCanvasObject, linkColor, linkWidth, nodeCanvasObject, nodePointerAreaPaint, onNodeHover]);

    return (
      <div data-testid="force-graph">
        nodes:{graphData.nodes.length} links:{graphData.links.length}
      </div>
    );
  });

  return { default: ForceGraphMock };
});

const renderGraph = () =>
  render(
    <MemoryRouter initialEntries={['/graph/doc-1']}>
      <Routes>
        <Route path="/graph/:documentId" element={<Graph />} />
      </Routes>
    </MemoryRouter>
  );

describe('Graph', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders a graph when relationship data exists', async () => {
    getGraphMock.mockResolvedValue({
      nodes: [
        { id: 'alice', label: 'Alice' },
        { id: 'bob', label: 'Bob' },
      ],
      edges: [
        { source: 'alice', target: 'bob', label: 'ALLY', color: '#8b5cf6' },
      ],
    });

    renderGraph();

    expect(await screen.findByTestId('force-graph')).toHaveTextContent('nodes:2 links:1');
    expect(screen.getByText(/story web/i)).toBeInTheDocument();
  });

  it('shows a not-ready state when the API returns a graph message', async () => {
    getGraphMock.mockResolvedValue({
      nodes: [],
      edges: [],
      message: 'No character relationships found for this document.',
    });

    renderGraph();

    expect(await screen.findByText(/graph not ready/i)).toBeInTheDocument();
    expect(screen.getByText(/no character relationships found/i)).toBeInTheDocument();
  });

  it('shows a fallback error when graph loading fails', async () => {
    getGraphMock.mockRejectedValue(new Error('boom'));

    renderGraph();

    await waitFor(() => {
      expect(screen.getByText(/graph failed\./i)).toBeInTheDocument();
    });
  });

  it('stays in the loading shell when no document id is present', () => {
    render(
      <MemoryRouter initialEntries={['/graph']}>
        <Routes>
          <Route path="*" element={<Graph />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/synthesizing physics graph/i)).toBeInTheDocument();
  });

  it('polls again and skips duplicate graph payloads', async () => {
    getGraphMock.mockResolvedValue({
      nodes: [
        { id: 'alice', label: 'Alice' },
        { id: 'bob', label: 'Bob' },
      ],
      edges: [
        { source: 'alice', target: 'bob', label: 'ALLY', color: '#8b5cf6' },
      ],
    });

    renderGraph();

    expect(await screen.findByTestId('force-graph')).toBeInTheDocument();

    await waitFor(() => {
      expect(getGraphMock).toHaveBeenCalledTimes(2);
    }, { timeout: 6500 });
  }, 10000);
});
