/**
 * Shared room selector used across field-capture tabs.
 * Shows a horizontal pill list of rooms; passes selected room up.
 */
export default function RoomPicker({ rooms, selectedId, onSelect }) {
  if (!rooms.length) return (
    <div className="text-sm text-muted-foreground py-2">No rooms added yet. Add rooms in the Rooms tab first.</div>
  );
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {rooms.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r.id)}
          className={`px-3 h-8 rounded-full text-xs font-medium border transition-all ${
            selectedId === r.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border hover:border-primary/50 hover:bg-muted'
          }`}
        >
          {r.name}
        </button>
      ))}
    </div>
  );
}