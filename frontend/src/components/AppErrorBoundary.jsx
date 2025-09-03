import { Component } from 'react';

// ErrorBoundary simples para evitar tela branca
class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <p className="mb-4">Ocorreu um erro inesperado.</p>
          <button
            onClick={this.handleReload}
            className="bg-red-600 text-white px-4 py-2"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
