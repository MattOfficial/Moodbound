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
    { graphData: { nodes: unknown[]; links: unknown[] } }
  >(({ graphData }, ref) => {
    react.useImperativeHandle(ref, () => ({
      zoomToFit: () => undefined,
      d3Force: (name: string) =>
        name === 'charge'
          ? { strength: () => undefined }
          : { distance: () => undefined },
    }));

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
});
