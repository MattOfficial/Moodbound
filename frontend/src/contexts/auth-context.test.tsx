import { renderHook } from '@testing-library/react';

import { AuthContext, useAuth } from './auth-context';

describe('useAuth', () => {
  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(/within an AuthProvider/i);
  });

  it('returns the provided auth context value', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider
        value={{
          token: 'token-123',
          isAuthenticated: true,
          profile: { id: 'user-1', email: 'reader@example.com' },
          setProfile: vi.fn(),
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.token).toBe('token-123');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.profile?.email).toBe('reader@example.com');
  });
});
