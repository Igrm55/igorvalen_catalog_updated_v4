function ItemCard({ item }) {
  return (
    <div className="border rounded shadow p-4 bg-white">
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-40 w-full object-cover mb-2"
        />
      )}
      <h3 className="font-bold text-lg mb-1">{item.name}</h3>
      {item.description && <p className="text-sm mb-1">{item.description}</p>}
      {item.price !== undefined && (
        <p className="text-green-700 font-semibold">R$ {item.price}</p>
      )}
    </div>
  );
}

export default ItemCard;
