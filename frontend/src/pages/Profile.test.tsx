import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { Profile } from './Profile';

const uploadDocumentMock = vi.fn();
const getDocumentsMock = vi.fn();
const deleteDocumentMock = vi.fn();
const getUserProfileMock = vi.fn();
const updateUserProfileMock = vi.fn();
const uploadAvatarMock = vi.fn();
const useAuthMock = vi.fn();
const setProfileMock = vi.fn();

vi.mock('../components/BackgroundEffect', () => ({
  BackgroundEffect: () => <div data-testid="background-effect" />,
}));

vi.mock('../components/Navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}));

vi.mock('../contexts/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../api/client', () => ({
  uploadDocument: (...args: unknown[]) => uploadDocumentMock(...args),
  getDocuments: (...args: unknown[]) => getDocumentsMock(...args),
  deleteDocument: (...args: unknown[]) => deleteDocumentMock(...args),
  getUserProfile: (...args: unknown[]) => getUserProfileMock(...args),
  updateUserProfile: (...args: unknown[]) => updateUserProfileMock(...args),
  uploadAvatar: (...args: unknown[]) => uploadAvatarMock(...args),
  getErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

const baseProfile = {
  id: 'user-1',
  email: 'reader@example.com',
  nickname: 'Reader One',
  profile_picture_url: null,
};

const renderProfile = (initialEntry: string | { pathname: string; state?: unknown } = '/profile') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Profile />
    </MemoryRouter>
  );

describe('Profile', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    useAuthMock.mockReturnValue({
      profile: baseProfile,
      setProfile: setProfileMock,
    });
    getUserProfileMock.mockResolvedValue(baseProfile);
    getDocumentsMock.mockResolvedValue([]);
    updateUserProfileMock.mockResolvedValue(baseProfile);
    uploadAvatarMock.mockResolvedValue(baseProfile);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('loads library documents and removes a document after delete', async () => {
    const user = userEvent.setup();
    getDocumentsMock.mockResolvedValue([
      {
        id: 'doc-1',
        filename: 'storm.pdf',
        status: 'Completed',
        genre: 'Fantasy',
        created_at: '2026-03-10T12:00:00Z',
      },
    ]);
    deleteDocumentMock.mockResolvedValue(undefined);

    renderProfile();

    expect(await screen.findByText(/storm\.pdf/i)).toBeInTheDocument();

    await user.click(screen.getByTitle(/delete document/i));

    await waitFor(() => {
      expect(deleteDocumentMock).toHaveBeenCalledWith('doc-1');
    });
    await waitFor(() => {
      expect(screen.queryByText(/storm\.pdf/i)).not.toBeInTheDocument();
    });
  });

  it('shows an error for unsupported upload types', async () => {
    const { container } = renderProfile();

    await screen.findByText(/your library/i);

    const fileInput = container.querySelector<HTMLInputElement>('#file-upload');
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput!, {
      target: {
        files: [new File(['draft'], 'notes.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })],
      },
    });

    expect(await screen.findByText(/invalid file type/i)).toBeInTheDocument();
    expect(uploadDocumentMock).not.toHaveBeenCalled();
  });

  it('blocks settings save when passwords do not match', async () => {
    const user = userEvent.setup();

    renderProfile({ pathname: '/profile', state: { activeTab: 'settings' } });

    await screen.findByText(/profile settings/i);

    await user.type(screen.getByPlaceholderText(/leave blank to keep current password/i), 'secret123');
    await user.type(screen.getByPlaceholderText(/••••••••/i), 'mismatch123');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(updateUserProfileMock).not.toHaveBeenCalled();
  });

  it('saves profile settings and updates auth state', async () => {
    const user = userEvent.setup();
    const updatedProfile = {
      ...baseProfile,
      nickname: 'Nova Reader',
    };
    updateUserProfileMock.mockResolvedValue(updatedProfile);

    renderProfile({ pathname: '/profile', state: { activeTab: 'settings' } });

    await screen.findByText(/profile settings/i);

    await user.type(screen.getByPlaceholderText(/reader one/i), 'Nova Reader');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateUserProfileMock).toHaveBeenCalledWith({
        nickname: 'Nova Reader',
        profile_picture_url: undefined,
        password: undefined,
      });
    });
    expect(setProfileMock).toHaveBeenCalledWith(updatedProfile);
    expect(await screen.findByText(/profile updated successfully/i)).toBeInTheDocument();
  });
});
