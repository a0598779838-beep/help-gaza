import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AidCard } from './AidCard';
import { demoAids } from '../data/demo';

describe('AidCard', () => {
  it('labels the sample record as demo and shows the unverified status', () => {
    render(<MemoryRouter><AidCard aid={demoAids[0]} /></MemoryRouter>);
    expect(screen.getByText(/مثال توضيحي/)).toBeInTheDocument();
    expect(screen.getByText('بانتظار المراجعة')).toBeInTheDocument();
    expect(screen.getByText('لم يتم التحقق بعد')).toBeInTheDocument();
  });
});
