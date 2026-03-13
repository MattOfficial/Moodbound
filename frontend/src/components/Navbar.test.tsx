import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { Navbar } from './Navbar';

const logoutMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../contexts/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      logout: logoutMock,
      profile: {
        id: 'user-1',
        email: 'reader@example.com',
        nickname: 'Reader',
        profile_picture_url: null,
      },
    });
  });

  it('opens the profile menu and logs out', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button'));

    expect(screen.getByText(/my library/i)).toBeInTheDocument();
    expect(screen.getByText(/profile & settings/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /logout/i }));

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('uses the uploaded profile picture when available', () => {
    useAuthMock.mockReturnValue({
      logout: logoutMock,
      profile: {
        id: 'user-1',
        email: 'reader@example.com',
        nickname: 'Reader',
        profile_picture_url: 'https://cdn.example.com/avatar.png',
      },
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByAltText(/profile/i)).toHaveAttribute('src', 'https://cdn.example.com/avatar.png');
  });
});
