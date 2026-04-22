'use client';

interface Props {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ['Ctrl', 'Enter'], action: 'Analyze query' },
  { keys: ['Ctrl', 'Shift', 'F'], action: 'Format SQL' },
  { keys: ['Ctrl', 'Shift', 'S'], action: 'Share query URL' },
  { keys: ['Ctrl', 'Shift', 'H'], action: 'Toggle history' },
  { keys: ['Ctrl', 'Shift', 'D'], action: 'Toggle dark mode' },
  { keys: ['Esc'], action: 'Close modals' },
  { keys: ['1-5'], action: 'Switch result tabs (when results visible)' },
];

export default function KeyboardShortcutsModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal">
        <div className="modal-header">
          <h3>⌨️ Keyboard Shortcuts</h3>
          <button className="drawer-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="shortcuts-list">
            {shortcuts.map((s, i) => (
              <div key={i} className="shortcut-row">
                <div className="shortcut-keys">
                  {s.keys.map((k, j) => (
                    <span key={j}>
                      <kbd className="kbd">{k}</kbd>
                      {j < s.keys.length - 1 && <span className="shortcut-plus">+</span>}
                    </span>
                  ))}
                </div>
                <span className="shortcut-action">{s.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
