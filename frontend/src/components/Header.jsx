import { Link } from 'react-router-dom';

function Header() {
  return (
    <div className="mb-6">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-2 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-green-700">
            IgorValen
          </Link>
          <Link to="/admin" className="text-red-600">
            Área do Admin
          </Link>
        </div>
      </header>
      {/* Hero em arco verde/vermelho */}
      <div className="h-4 bg-gradient-to-r from-green-600 to-red-600 rounded-b-full"></div>
    </div>
  );
}

export default Header;
