import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Home } from './Home';

const searchVibesMock = vi.fn();
const getSystemStatusMock = vi.fn();

vi.mock('../components/BackgroundEffect', () => ({
  BackgroundEffect: () => <div data-testid="background-effect" />,
}));

vi.mock('../components/Navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}));

vi.mock('../components/SearchBar', () => ({
  SearchBar: ({ onSearch, isLoading }: { onSearch: (query: string) => void; isLoading: boolean }) => (
    <button onClick={() => onSearch('stormy')} disabled={isLoading} type="button">
      Trigger Search
    </button>
  ),
}));

vi.mock('../api/client', () => ({
  searchVibes: (...args: unknown[]) => searchVibesMock(...args),
  getSystemStatus: (...args: unknown[]) => getSystemStatusMock(...args),
  getErrorMessage: () => 'Search failed.',
}));

describe('Home', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getSystemStatusMock.mockResolvedValue({
      status: 'Online',
      agent_router: 'Gemini',
      vector_db: 'Qdrant',
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders search results without the removed synthesis and vibe labels', async () => {
    const user = userEvent.setup();
    searchVibesMock.mockResolvedValue({
      answer: 'The elf bride stands in silence.',
      vibe: 'Mysterious',
      engine: 'qdrant-hybrid',
      sources: [
        {
          filename: 'novel.pdf',
          score: 0.91,
          text: 'The elf bride stands in silence.',
        },
      ],
    });

    render(<Home />);

    await user.click(screen.getByRole('button', { name: /trigger search/i }));

    expect(await screen.findAllByText(/the elf bride stands in silence/i)).toHaveLength(2);
    expect(screen.getByText(/source excerpts/i)).toBeInTheDocument();
    expect(screen.getByText(/novel\.pdf/i)).toBeInTheDocument();
    expect(screen.queryByText(/semantic synthesis/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vibe:/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/semantic search/i)).toBeInTheDocument();
  });

  it('shows a friendly error when search fails', async () => {
    const user = userEvent.setup();
    searchVibesMock.mockRejectedValue(new Error('boom'));

    render(<Home />);

    await user.click(screen.getByRole('button', { name: /trigger search/i }));

    await waitFor(() => {
      expect(screen.getByText(/search failed\./i)).toBeInTheDocument();
    });
  });
});
