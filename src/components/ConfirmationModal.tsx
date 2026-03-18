import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertTriangle className="text-red-600" size={24} />,
          button: 'bg-red-600 hover:bg-red-700 shadow-red-200',
          bg: 'bg-red-50'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="text-amber-600" size={24} />,
          button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
          bg: 'bg-amber-50'
        };
      default:
        return {
          icon: <AlertTriangle className="text-indigo-600" size={24} />,
          button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
          bg: 'bg-indigo-50'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className={`w-12 h-12 rounded-2xl ${styles.bg} flex items-center justify-center`}>
                {styles.icon}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 leading-relaxed">{message}</p>
          </div>
          
          <footer className="p-6 bg-gray-50 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-6 py-2.5 text-white font-bold rounded-xl transition-all shadow-lg ${styles.button}`}
            >
              {confirmText}
            </button>
          </footer>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmationModal;
