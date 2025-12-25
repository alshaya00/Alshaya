/**
 * Spinner Component Tests
 * Comprehensive tests for the Spinner UI component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Spinner, LoadingOverlay } from '../Spinner';

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Loader2: ({ className, size }: { className?: string; size?: number }) => (
    <span data-testid="loader-icon" className={className} data-size={size}>
      Loading Icon
    </span>
  ),
}));

describe('Spinner Component', () => {
  describe('Rendering', () => {
    it('should render spinner', () => {
      render(<Spinner />);
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('should have status role for accessibility', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Spinner className="custom-spinner" />);
      expect(screen.getByRole('status')).toHaveClass('custom-spinner');
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      render(<Spinner size="sm" />);
      const icon = screen.getByTestId('loader-icon');
      expect(icon).toHaveAttribute('data-size', '16');
    });

    it('should render medium size by default', () => {
      render(<Spinner />);
      const icon = screen.getByTestId('loader-icon');
      expect(icon).toHaveAttribute('data-size', '24');
    });

    it('should render large size', () => {
      render(<Spinner size="lg" />);
      const icon = screen.getByTestId('loader-icon');
      expect(icon).toHaveAttribute('data-size', '40');
    });
  });

  describe('Label', () => {
    it('should show default Arabic label', () => {
      render(<Spinner />);
      expect(screen.getByText('جاري التحميل...')).toBeInTheDocument();
    });

    it('should show custom label', () => {
      render(<Spinner label="Loading data..." />);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should have screen reader accessible text', () => {
      render(<Spinner label="Custom loading" />);
      const srText = screen.getByText('Custom loading', { selector: '.sr-only' });
      expect(srText).toBeInTheDocument();
    });

    it('should show label with appropriate size', () => {
      render(<Spinner size="sm" label="Small label" />);
      const label = screen.getByText('Small label');
      expect(label.parentElement).toHaveClass('text-xs');
    });

    it('should show large label text for large size', () => {
      render(<Spinner size="lg" label="Large label" />);
      const label = screen.getByText('Large label');
      expect(label.parentElement).toHaveClass('text-base');
    });
  });

  describe('Animation', () => {
    it('should have animation class on loader', () => {
      render(<Spinner />);
      const icon = screen.getByTestId('loader-icon');
      expect(icon).toHaveClass('animate-spin');
    });
  });

  describe('Full Page Mode', () => {
    it('should render in full page overlay when fullPage is true', () => {
      render(<Spinner fullPage />);
      const overlay = screen.getByRole('status').closest('div');
      expect(overlay?.parentElement).toHaveClass('fixed', 'inset-0', 'z-50');
    });

    it('should have backdrop blur effect in full page mode', () => {
      render(<Spinner fullPage />);
      const overlay = screen.getByRole('status').closest('div');
      expect(overlay?.parentElement).toHaveClass('backdrop-blur-sm');
    });

    it('should not render full page by default', () => {
      render(<Spinner />);
      const container = screen.getByRole('status');
      expect(container.closest('.fixed')).toBeNull();
    });
  });

  describe('Color', () => {
    it('should have green color by default', () => {
      render(<Spinner />);
      const icon = screen.getByTestId('loader-icon');
      expect(icon).toHaveClass('text-green-600');
    });
  });
});

describe('LoadingOverlay Component', () => {
  describe('Rendering', () => {
    it('should render children', () => {
      render(
        <LoadingOverlay isLoading={false}>
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render relative container', () => {
      const { container } = render(
        <LoadingOverlay isLoading={false}>
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(container.firstChild).toHaveClass('relative');
    });
  });

  describe('Loading State', () => {
    it('should show overlay when isLoading is true', () => {
      render(
        <LoadingOverlay isLoading={true}>
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should not show overlay when isLoading is false', () => {
      render(
        <LoadingOverlay isLoading={false}>
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should keep children visible behind overlay', () => {
      render(
        <LoadingOverlay isLoading={true}>
          <div>Visible Content</div>
        </LoadingOverlay>
      );
      expect(screen.getByText('Visible Content')).toBeInTheDocument();
    });
  });

  describe('Custom Label', () => {
    it('should pass custom label to spinner', () => {
      render(
        <LoadingOverlay isLoading={true} label="Saving...">
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('Overlay Styling', () => {
    it('should have backdrop effect', () => {
      render(
        <LoadingOverlay isLoading={true}>
          <div>Content</div>
        </LoadingOverlay>
      );
      const overlay = screen.getByRole('status').closest('.absolute');
      expect(overlay).toHaveClass('backdrop-blur-[2px]');
    });

    it('should position overlay absolutely', () => {
      render(
        <LoadingOverlay isLoading={true}>
          <div>Content</div>
        </LoadingOverlay>
      );
      const overlay = screen.getByRole('status').closest('.absolute');
      expect(overlay).toHaveClass('absolute', 'inset-0');
    });

    it('should have z-index for stacking', () => {
      render(
        <LoadingOverlay isLoading={true}>
          <div>Content</div>
        </LoadingOverlay>
      );
      const overlay = screen.getByRole('status').closest('.absolute');
      expect(overlay).toHaveClass('z-10');
    });
  });

  describe('Content Interaction', () => {
    it('should render interactive content', () => {
      render(
        <LoadingOverlay isLoading={false}>
          <button data-testid="interactive-btn">Click Me</button>
        </LoadingOverlay>
      );
      expect(screen.getByTestId('interactive-btn')).toBeInTheDocument();
    });

    it('should render complex nested content', () => {
      render(
        <LoadingOverlay isLoading={false}>
          <div>
            <header>Header</header>
            <main>Main Content</main>
            <footer>Footer</footer>
          </div>
        </LoadingOverlay>
      );
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Main Content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });
});
