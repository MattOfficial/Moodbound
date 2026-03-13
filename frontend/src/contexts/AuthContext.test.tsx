import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { getUserProfileMock, apiClientMock } = vi.hoisted(() => ({
  getUserProfileMock: vi.fn(),
  apiClientMock: {
    defaults: {
      headers: {
        common: {} as Record<string, string>,
      },
    },
  },
}));

vi.mock('../api/client', () => ({
  apiClient: apiClientMock,
  getUserProfile: (...args: unknown[]) => getUserProfileMock(...args),
}));

import { AuthProvider } from './AuthContext';
import { useAuth } from './auth-context';

const Probe = () => {
  const { isAuthenticated, profile, login, logout, token } = useAuth();

  return (
    <div>
      <div data-testid="auth-state">{isAuthenticated ? 'authed' : 'anon'}</div>
      <div data-testid="token">{token ?? 'none'}</div>
      <div data-testid="profile-email">{profile?.email ?? 'none'}</div>
      <button type="button" onClick={() => login('token-123')}>
        Login
      </button>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

describe('AuthProvider', () => {
  const storage = new Map<string, string>();

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
      configurable: true,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
    window.localStorage.removeItem('vibe_token');
    apiClientMock.defaults.headers.common = {};
    getUserProfileMock.mockResolvedValue({
      id: 'user-1',
      email: 'reader@example.com',
      nickname: 'Reader',
      profile_picture_url: null,
    });
  });

  it('persists login state, sets the auth header, and loads the profile', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem('vibe_token')).toBe('token-123');
    });
    expect(apiClientMock.defaults.headers.common.Authorization).toBe('Bearer token-123');
    expect(await screen.findByTestId('profile-email')).toHaveTextContent('reader@example.com');
    expect(screen.getByTestId('auth-state')).toHaveTextContent('authed');
  });

  it('clears login state and auth headers on logout', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await user.click(screen.getByRole('button', { name: /login/i }));
    await screen.findByText(/reader@example\.com/i);

    await user.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem('vibe_token')).toBeNull();
    });
    expect(apiClientMock.defaults.headers.common.Authorization).toBeUndefined();
    expect(screen.getByTestId('auth-state')).toHaveTextContent('anon');
    expect(screen.getByTestId('profile-email')).toHaveTextContent('none');
  });
});
