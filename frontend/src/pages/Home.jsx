import { useState, useEffect } from 'react';
import api from '../lib/api';
import ItemCard from '../components/ItemCard';

function Home() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .get('/items')
      .then((res) => setItems(res.data))
      .catch(() => alert('Erro ao carregar itens'));
  }, []);

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="max-w-5xl mx-auto px-4">
      <input
        className="border p-2 w-full mb-4"
        placeholder="Buscar por nome"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="grid md:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <ItemCard key={item._id} item={item} />
        ))}
      </div>
    </main>
  );
}

export default Home;
