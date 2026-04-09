import { useState } from 'react';
import { Building2, Edit2, Plus, Trash2 } from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';
import { MeetingRoom } from '../../types';
import { useFeedback } from '../../context/FeedbackContext';

export function MeetingRoomsCRUD() {
  const { rooms, addRoom, updateRoom, deleteRoom } = useSchedule();
  const { showFeedback } = useFeedback();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: 6,
    isActive: true,
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
    setError('');
    setFormData({
      name: '',
      location: '',
      capacity: 6,
      isActive: true,
    });
  };

  const openModal = (room?: MeetingRoom) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        location: room.location || '',
        capacity: room.capacity || 6,
        isActive: room.isActive,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingRoom) {
      const result = updateRoom(editingRoom.id, formData);
      if (!result.success) {
        setError(result.error || 'Não foi possível atualizar a sala.');
        return;
      }
      showFeedback({
        tone: 'success',
        title: 'Sala atualizada',
        message: 'As informações da sala foram salvas com sucesso.',
      });
    } else {
      addRoom(formData);
      showFeedback({
        tone: 'success',
        title: 'Sala criada',
        message: 'A nova sala já está disponível para reservas.',
      });
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    const result = deleteRoom(id);
    if (!result.success) {
      setError(result.error || 'Não foi possível remover a sala.');
      return;
    }
    setError('');
    showFeedback({
      tone: 'success',
      title: 'Sala removida',
      message: 'A sala foi excluída com sucesso.',
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Salas de reunião</h2>
          <p className="text-sm text-gray-500">Cadastro simples para reserva e prevenção de conflito.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Nova sala
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <div key={room.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-3">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{room.name}</h3>
                  <p className="text-sm text-gray-500">{room.location || 'Sem localização'}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openModal(room)} className="rounded-lg p-2 hover:bg-gray-100">
                  <Edit2 className="h-4 w-4 text-gray-600" />
                </button>
                <button onClick={() => handleDelete(room.id)} className="rounded-lg p-2 hover:bg-red-50">
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>Capacidade: {room.capacity || '—'}</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  room.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {room.isActive ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingRoom ? 'Editar sala' : 'Nova sala'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Localização</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Capacidade</label>
                <input
                  type="number"
                  min={1}
                  value={formData.capacity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, capacity: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Sala ativa para novas reservas
              </label>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  {editingRoom ? 'Salvar' : 'Criar sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
