import React from 'react'
import Modal from './Modal'

export default function ConfirmModal({ isOpen, title = 'Confirm', message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="small">
      <div style={{ padding: '8px 0', color: 'var(--text-primary)' }}>
        {message}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button onClick={onCancel} className="modal-close">
          {cancelText}
        </button>
        <button onClick={onConfirm} className="retry-button">
          {confirmText}
        </button>
      </div>
    </Modal>
  )
}
