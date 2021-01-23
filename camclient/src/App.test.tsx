import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders save svg link', () => {
  const { getByText } = render(<App />);
  const linkElement = getByText(/Save SVG/i);
  expect(linkElement).toBeInTheDocument();
});
