import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { setToken } from '../lib/auth';

function Login() {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/login', { password });
      setToken(res.data.token);
      navigate('/admin');
    } catch (err) {
      alert('Senha incorreta');
    }
  };

  return (
    <main className="max-w-sm mx-auto px-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full"
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 w-full"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}

export default Login;
