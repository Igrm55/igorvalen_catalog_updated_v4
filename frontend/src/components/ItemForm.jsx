import { useState, useEffect } from 'react';

function ItemForm({ initialData = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    category: '',
  });

  useEffect(() => {
    setForm({
      name: initialData.name || '',
      description: initialData.description || '',
      price: initialData.price || '',
      imageUrl: initialData.imageUrl || '',
      category: initialData.category || '',
    });
  }, [initialData]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, price: form.price ? Number(form.price) : undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        name="name"
        value={form.name}
        onChange={handleChange}
        required
        placeholder="Nome"
        className="w-full border p-2"
      />
      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Descrição"
        className="w-full border p-2"
      />
      <input
        name="price"
        type="number"
        min="0"
        value={form.price}
        onChange={handleChange}
        placeholder="Preço"
        className="w-full border p-2"
      />
      <input
        name="imageUrl"
        value={form.imageUrl}
        onChange={handleChange}
        placeholder="URL da imagem"
        className="w-full border p-2"
      />
      <input
        name="category"
        value={form.category}
        onChange={handleChange}
        placeholder="Categoria"
        className="w-full border p-2"
      />
      <div className="flex gap-2">
        <button type="submit" className="bg-green-600 text-white px-4 py-2">
          Salvar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 px-4 py-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default ItemForm;
