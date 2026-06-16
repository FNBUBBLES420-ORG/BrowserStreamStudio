import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found.');
}

const root = ReactDOM.createRoot(rootElement);

type ErrorState = {
  message: string;
  stack?: string;
};

class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorState | null> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = null;
  }

  static getDerivedStateFromError(error: Error): ErrorState {
    return {
      message: error.message || 'Unknown startup error.',
      stack: error.stack
    };
  }

  render() {
    if (this.state) {
      return (
        <div style={{ minHeight: '100vh', padding: '32px', background: '#160f1e', color: '#fff', fontFamily: 'Segoe UI, sans-serif' }}>
          <h1 style={{ marginTop: 0 }}>BrowserStream Studio hit a startup error</h1>
          <p>The app loaded, but one of the UI modules crashed before it could render.</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#24182f', padding: '16px', borderRadius: '12px', overflow: 'auto' }}>
            {this.state.message}
            {this.state.stack ? `\n\n${this.state.stack}` : ''}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function renderStartupError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : '';

  root.render(
    <div style={{ minHeight: '100vh', padding: '32px', background: '#160f1e', color: '#fff', fontFamily: 'Segoe UI, sans-serif' }}>
      <h1 style={{ marginTop: 0 }}>BrowserStream Studio could not start</h1>
      <p>The app bundle loaded, but startup failed before the main UI mounted.</p>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#24182f', padding: '16px', borderRadius: '12px', overflow: 'auto' }}>
        {message}
        {stack ? `\n\n${stack}` : ''}
      </pre>
    </div>
  );
}

window.addEventListener('error', (event) => {
  renderStartupError(event.error || new Error(event.message));
});

window.addEventListener('unhandledrejection', (event) => {
  renderStartupError(event.reason || new Error('Unhandled promise rejection.'));
});

root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
