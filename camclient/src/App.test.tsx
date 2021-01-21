import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders save dxf link', () => {
  const { getByText } = render(<App />);
  const linkElement = getByText(/DXF Circles to Layers/i);
  expect(linkElement).toBeInTheDocument();
});
