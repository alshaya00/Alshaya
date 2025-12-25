/**
 * Card Component Tests
 * Comprehensive tests for the Card UI component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../Card';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('should render children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Card className="custom-class">Content</Card>);
      expect(screen.getByText('Content').parentElement).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Card>Default</Card>);
      const card = screen.getByText('Default').parentElement;
      expect(card).toHaveClass('bg-white', 'rounded-xl', 'shadow-md');
    });

    it('should render elevated variant', () => {
      render(<Card variant="elevated">Elevated</Card>);
      const card = screen.getByText('Elevated').parentElement;
      expect(card).toHaveClass('shadow-lg');
    });

    it('should render bordered variant', () => {
      render(<Card variant="bordered">Bordered</Card>);
      const card = screen.getByText('Bordered').parentElement;
      expect(card).toHaveClass('border', 'border-gray-200');
    });

    it('should render gradient variant', () => {
      render(<Card variant="gradient">Gradient</Card>);
      const card = screen.getByText('Gradient').parentElement;
      expect(card).toHaveClass('bg-gradient-to-br');
    });
  });

  describe('Padding', () => {
    it('should render with no padding', () => {
      render(<Card padding="none">No Padding</Card>);
      const card = screen.getByText('No Padding').parentElement;
      expect(card).not.toHaveClass('p-4', 'p-6', 'p-8');
    });

    it('should render with small padding', () => {
      render(<Card padding="sm">Small</Card>);
      const card = screen.getByText('Small').parentElement;
      expect(card).toHaveClass('p-4');
    });

    it('should render with medium padding by default', () => {
      render(<Card>Medium</Card>);
      const card = screen.getByText('Medium').parentElement;
      expect(card).toHaveClass('p-6');
    });

    it('should render with large padding', () => {
      render(<Card padding="lg">Large</Card>);
      const card = screen.getByText('Large').parentElement;
      expect(card).toHaveClass('p-8');
    });
  });

  describe('Hover Effect', () => {
    it('should apply hover effect when hover is true', () => {
      render(<Card hover>Hoverable</Card>);
      const card = screen.getByText('Hoverable').parentElement;
      expect(card).toHaveClass('hover:shadow-lg', 'cursor-pointer');
    });

    it('should not have hover effect by default', () => {
      render(<Card>No Hover</Card>);
      const card = screen.getByText('No Hover').parentElement;
      expect(card).not.toHaveClass('cursor-pointer');
    });
  });
});

describe('CardHeader Component', () => {
  it('should render children', () => {
    render(<CardHeader>Header Content</CardHeader>);
    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('should apply margin bottom', () => {
    render(<CardHeader>Header</CardHeader>);
    const header = screen.getByText('Header').parentElement;
    expect(header).toHaveClass('mb-4');
  });

  it('should apply custom className', () => {
    render(<CardHeader className="custom-header">Header</CardHeader>);
    const header = screen.getByText('Header').parentElement;
    expect(header).toHaveClass('custom-header');
  });
});

describe('CardTitle Component', () => {
  it('should render as h3 by default', () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toHaveTextContent('Title');
  });

  it('should render as h1', () => {
    render(<CardTitle as="h1">H1 Title</CardTitle>);
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent('H1 Title');
  });

  it('should render as h2', () => {
    render(<CardTitle as="h2">H2 Title</CardTitle>);
    const title = screen.getByRole('heading', { level: 2 });
    expect(title).toHaveTextContent('H2 Title');
  });

  it('should render as h4', () => {
    render(<CardTitle as="h4">H4 Title</CardTitle>);
    const title = screen.getByRole('heading', { level: 4 });
    expect(title).toHaveTextContent('H4 Title');
  });

  it('should apply styling classes', () => {
    render(<CardTitle>Styled</CardTitle>);
    const title = screen.getByRole('heading');
    expect(title).toHaveClass('text-lg', 'font-bold', 'text-gray-800');
  });

  it('should apply custom className', () => {
    render(<CardTitle className="custom-title">Custom</CardTitle>);
    const title = screen.getByRole('heading');
    expect(title).toHaveClass('custom-title');
  });
});

describe('CardDescription Component', () => {
  it('should render description text', () => {
    render(<CardDescription>Description text</CardDescription>);
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('should render as paragraph', () => {
    render(<CardDescription>Description</CardDescription>);
    const desc = screen.getByText('Description');
    expect(desc.tagName).toBe('P');
  });

  it('should apply styling classes', () => {
    render(<CardDescription>Styled</CardDescription>);
    const desc = screen.getByText('Styled');
    expect(desc).toHaveClass('text-sm', 'text-gray-500', 'mt-1');
  });

  it('should apply custom className', () => {
    render(<CardDescription className="custom-desc">Custom</CardDescription>);
    const desc = screen.getByText('Custom');
    expect(desc).toHaveClass('custom-desc');
  });
});

describe('CardContent Component', () => {
  it('should render content', () => {
    render(<CardContent>Main content</CardContent>);
    expect(screen.getByText('Main content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<CardContent className="content-class">Content</CardContent>);
    const content = screen.getByText('Content').parentElement;
    expect(content).toHaveClass('content-class');
  });

  it('should render complex children', () => {
    render(
      <CardContent>
        <div data-testid="complex-child">
          <span>Nested content</span>
        </div>
      </CardContent>
    );
    expect(screen.getByTestId('complex-child')).toBeInTheDocument();
    expect(screen.getByText('Nested content')).toBeInTheDocument();
  });
});

describe('CardFooter Component', () => {
  it('should render footer content', () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('should apply border and spacing', () => {
    render(<CardFooter>Footer</CardFooter>);
    const footer = screen.getByText('Footer').parentElement;
    expect(footer).toHaveClass('mt-4', 'pt-4', 'border-t', 'border-gray-100');
  });

  it('should apply custom className', () => {
    render(<CardFooter className="footer-class">Footer</CardFooter>);
    const footer = screen.getByText('Footer').parentElement;
    expect(footer).toHaveClass('footer-class');
  });
});

describe('Card Composition', () => {
  it('should render complete card with all subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
        <CardContent>Main content area</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>
    );

    expect(screen.getByRole('heading', { name: 'Card Title' })).toBeInTheDocument();
    expect(screen.getByText('Card description')).toBeInTheDocument();
    expect(screen.getByText('Main content area')).toBeInTheDocument();
    expect(screen.getByText('Footer actions')).toBeInTheDocument();
  });

  it('should work with interactive content', () => {
    render(
      <Card hover>
        <CardContent>
          <button data-testid="card-button">Click Me</button>
        </CardContent>
      </Card>
    );

    expect(screen.getByTestId('card-button')).toBeInTheDocument();
  });
});
