"use client";

import { Placeholder } from "@/lib/api";
import { useState } from "react";

interface PlaceholderManagerProps {
  isOpen: boolean;
  onClose: () => void;
  placeholders: Placeholder[];
  onPlaceholdersChange: (placeholders: Placeholder[]) => void;
}

export default function PlaceholderManager({
  isOpen,
  onClose,
  placeholders,
  onPlaceholdersChange,
}: PlaceholderManagerProps) {
  const [editingPlaceholder, setEditingPlaceholder] = useState<Placeholder | null>(null);
  const [newPlaceholder, setNewPlaceholder] = useState({ name: "", example: "" });

  const standardPlaceholders: Placeholder[] = [
    { id: "name", name: "Name", example: "Ahmed Kabary", isStandard: true },
    { id: "phoneNumber", name: "Phone Number", example: "01122267427", isStandard: true },
    { id: "stdNum", name: "Student Number", example: "11", isStandard: true },
    { id: "groupName", name: "Group Name", example: "السبت 8", isStandard: true },
    { id: "code", name: "Code", example: "3256888", isStandard: true },
    { id: "password", name: "Password", example: "12345", isStandard: true },
  ];

  const allPlaceholders = [...standardPlaceholders, ...placeholders.filter(p => !p.isStandard)];

  const handleAddPlaceholder = () => {
    if (newPlaceholder.name.trim() && newPlaceholder.example.trim()) {
      const placeholder: Placeholder = {
        id: `custom_${Date.now()}`,
        name: newPlaceholder.name.trim(),
        example: newPlaceholder.example.trim(),
        isStandard: false,
      };
      onPlaceholdersChange([...placeholders, placeholder]);
      setNewPlaceholder({ name: "", example: "" });
    }
  };

  const handleEditPlaceholder = () => {
    if (editingPlaceholder && editingPlaceholder.name.trim() && editingPlaceholder.example.trim()) {
      const updatedPlaceholders = placeholders.map(p =>
        p.id === editingPlaceholder.id ? editingPlaceholder : p
      );
      onPlaceholdersChange(updatedPlaceholders);
      setEditingPlaceholder(null);
    }
  };

  const handleDeletePlaceholder = (id: string) => {
    const updatedPlaceholders = placeholders.filter(p => p.id !== id);
    onPlaceholdersChange(updatedPlaceholders);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-github-canvas-subtle rounded-lg border border-github-border-default p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-github-fg-default">Manage Placeholders</h2>
          <button
            onClick={onClose}
            className="text-github-fg-muted hover:text-github-fg-default transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Add New Placeholder */}
        <div className="bg-github-canvas-default rounded-lg p-4 mb-6 border border-github-border-muted">
          <h3 className="text-lg font-medium text-github-fg-default mb-4">Add Custom Placeholder</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-github-fg-default mb-2">
                Placeholder Name
              </label>
              <input
                type="text"
                placeholder="e.g., Course, Department"
                value={newPlaceholder.name}
                onChange={(e) => setNewPlaceholder(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-github-canvas-subtle border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-github-fg-default mb-2">
                Example Value
              </label>
              <input
                type="text"
                placeholder="e.g., Mathematics, Computer Science"
                value={newPlaceholder.example}
                onChange={(e) => setNewPlaceholder(prev => ({ ...prev, example: e.target.value }))}
                className="w-full px-3 py-2 bg-github-canvas-subtle border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default"
              />
            </div>
          </div>
          <button
            onClick={handleAddPlaceholder}
            disabled={!newPlaceholder.name.trim() || !newPlaceholder.example.trim()}
            className="px-4 py-2 bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] text-white rounded-lg hover:from-[#1a5feb] hover:to-[#4fa6ff] disabled:opacity-50 transition-all duration-200"
          >
            Add Placeholder
          </button>
        </div>

        {/* Placeholders List */}
        <div>
          <h3 className="text-lg font-medium text-github-fg-default mb-4">Available Placeholders</h3>
          <div className="space-y-3">
            {allPlaceholders.map((placeholder) => (
              <div
                key={placeholder.id}
                className="bg-github-canvas-default rounded-lg p-4 border border-github-border-muted"
              >
                {editingPlaceholder?.id === placeholder.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-github-fg-default mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editingPlaceholder.name}
                        onChange={(e) => setEditingPlaceholder(prev => prev ? { ...prev, name: e.target.value } : null)}
                        className="w-full px-3 py-2 bg-github-canvas-subtle border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-github-fg-default mb-2">
                        Example
                      </label>
                      <input
                        type="text"
                        value={editingPlaceholder.example}
                        onChange={(e) => setEditingPlaceholder(prev => prev ? { ...prev, example: e.target.value } : null)}
                        className="w-full px-3 py-2 bg-github-canvas-subtle border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        onClick={handleEditPlaceholder}
                        className="px-3 py-1 bg-[#238636] text-white rounded text-sm hover:bg-[#1f7a2e] transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPlaceholder(null)}
                        className="px-3 py-1 bg-github-fg-muted text-github-fg-default rounded text-sm hover:bg-github-fg-subtle transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-github-fg-default">
                          {placeholder.name}
                        </span>
                        {placeholder.isStandard && (
                          <span className="text-xs bg-[#1f6feb]/10 text-[#1f6feb] px-2 py-1 rounded">
                            Standard
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-github-fg-muted mt-1">
                        Example: {placeholder.example}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!placeholder.isStandard && (
                        <>
                          <button
                            onClick={() => setEditingPlaceholder(placeholder)}
                            className="text-github-fg-muted hover:text-[#1f6feb] transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeletePlaceholder(placeholder.id)}
                            className="text-github-fg-muted hover:text-[#da3633] transition-colors"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 