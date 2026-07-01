import { render, screen } from '@testing-library/react';
import App from './App';
import { AuctionProvider } from './context/AuctionContext';

jest.mock('react-router-dom', () => {
  const React = require('react');

  return {
    Routes: ({ children }) => React.Children.toArray(children)[0]?.props.element ?? null,
    Route: ({ element }) => element,
    Link: ({ children, to, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useLocation: () => ({ pathname: '/' }),
    useNavigate: () => jest.fn(),
    useParams: () => ({ id: '1' }),
  };
}, { virtual: true });

test('renders the car auction marketplace shell', () => {
  render(
    <AuctionProvider>
      <App />
    </AuctionProvider>
  );
  expect(screen.getAllByText(/Wheels&Deals/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Bid smarter, buy safer/i)).toBeInTheDocument();
  expect(screen.getByText(/See all auctions/i)).toBeInTheDocument();
});
