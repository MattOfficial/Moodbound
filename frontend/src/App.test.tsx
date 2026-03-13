import { render, screen, waitFor } from '@testing-library/react';

import App from './App';

const useAuthMock = vi.fn();

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./contexts/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('./pages/Home', () => ({
  Home: () => <div>Home Page</div>,
}));

vi.mock('./pages/Profile', () => ({
  Profile: () => <div>Profile Page</div>,
}));

vi.mock('./pages/Graph', () => ({
  Graph: () => <div>Graph Page</div>,
}));

vi.mock('./pages/Auth', () => ({
  default: () => <div>Auth Page</div>,
}));

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to /auth', async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false });
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(await screen.findByText(/auth page/i)).toBeInTheDocument();
  });

  it('renders protected routes for authenticated users', async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true });
    window.history.pushState({}, '', '/graph/doc-1');

    render(<App />);

    expect(await screen.findByText(/graph page/i)).toBeInTheDocument();
  });

  it('redirects /library to the profile route', async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true });
    window.history.pushState({}, '', '/library');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/profile');
    });
    expect(screen.getByText(/profile page/i)).toBeInTheDocument();
  });
});
