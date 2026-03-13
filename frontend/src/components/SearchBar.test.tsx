import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('submits a trimmed query', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<SearchBar onSearch={onSearch} isLoading={false} />);

    await user.type(screen.getByPlaceholderText(/find quotes/i), '  rainy day  ');
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith('rainy day');
  });

  it('prevents submission while loading', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<SearchBar onSearch={onSearch} isLoading />);

    await user.type(screen.getByPlaceholderText(/find quotes/i), 'betrayal');

    expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled();
    expect(onSearch).not.toHaveBeenCalled();
  });
});
