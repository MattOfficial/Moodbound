import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import Auth from './Auth';

const loginMock = vi.fn();
const postMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../contexts/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../api/client', () => ({
  apiClient: {
    post: (...args: unknown[]) => postMock(...args),
  },
  getErrorMessage: () => 'Auth failed.',
}));

describe('Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      login: loginMock,
      isAuthenticated: false,
    });
  });

  it('blocks signup when passwords do not match', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }));
    await user.type(screen.getByPlaceholderText(/reader@vibe\.com/i), 'reader@example.com');
    const passwordInputs = screen.getAllByPlaceholderText(/••••••••/i);
    await user.type(passwordInputs[0]!, 'secret123');
    await user.type(passwordInputs[1]!, 'mismatch123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('submits login credentials and stores the returned token', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({ data: { access_token: 'token-123' } });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/reader@vibe\.com/i), 'reader@example.com');
    await user.type(screen.getByPlaceholderText(/••••••••/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledTimes(1);
    });
    expect(postMock.mock.calls[0]?.[0]).toBe('/auth/token');
    expect(loginMock).toHaveBeenCalledWith('token-123');
  });
});
