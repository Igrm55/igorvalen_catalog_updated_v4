import { useState, useEffect } from 'react';
import api from '../lib/api';
import ItemForm from '../components/ItemForm';
import { clearToken } from '../lib/auth';

function Admin() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchItems = () => {
    setLoading(true);
    api
      .get('/items')
      .then((res) => setItems(res.data))
      .catch(() => alert('Erro ao carregar itens'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSave = async (data) => {
    try {
      if (editing && editing._id) {
        await api.put(`/items/${editing._id}`, data);
      } else {
        await api.post('/items', data);
      }
      setShowForm(false);
      setEditing(null);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja remover?')) return;
    try {
      await api.delete(`/items/${id}`);
      fetchItems();
    } catch (err) {
      alert('Erro ao excluir item');
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">Administração</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing({});
              setShowForm(true);
            }}
            className="bg-green-600 text-white px-4 py-2"
          >
            Adicionar
          </button>
          <button
            onClick={() => {
              clearToken();
              window.location.href = '/';
            }}
            className="bg-gray-300 px-4 py-2"
          >
            Sair
          </button>
        </div>
      </div>

      {showForm && (
        <ItemForm
          initialData={editing}
          onSubmit={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {loading ? (
        <p>Carregando...</p>
      ) : items.length ? (
        <table className="w-full mt-4 border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Nome</th>
              <th className="border p-2">Preço</th>
              <th className="border p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id}>
                <td className="border p-2">{item.name}</td>
                <td className="border p-2">{item.price}</td>
                <td className="border p-2 space-x-2">
                  <button
                    onClick={() => {
                      setEditing(item);
                      setShowForm(true);
                    }}
                    className="text-blue-600"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="text-red-600"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Nenhum item encontrado</p>
      )}
    </main>
  );
}

export default Admin;
